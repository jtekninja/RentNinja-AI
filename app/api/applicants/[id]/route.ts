import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { auth } from "@/auth";
import { recordAuditLog } from "@/lib/audit-log";
import { dbConnect } from "@/lib/mongodb";
import { applicantSchema } from "@/lib/validators";
import { calculateApplicantScore } from "@/lib/scoring";
import { serializeApplicantRecord } from "@/lib/applicant-serialization";
import { buildApplicantDayKey, buildApplicantFingerprint } from "@/lib/applicant-dedup";
import { calculateIncomeToRentRatio } from "@/lib/income";
import Applicant from "@/models/Applicant";
import Organization from "@/models/Organization";

function unauthorized() {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}

function validationErrorResponse(issues: Array<{ message: string; path: PropertyKey[] }>) {
  const firstIssue = issues[0];
  const field = firstIssue?.path?.map(String).join(".");
  const message = field
    ? `${field}: ${firstIssue.message}`
    : firstIssue?.message || "Invalid applicant.";

  return NextResponse.json({ message, issues }, { status: 400 });
}

function finiteNumber(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeNotes(notes: unknown) {
  if (Array.isArray(notes)) {
    return notes
      .map((note) => String(note).trim())
      .filter(Boolean);
  }

  if (typeof notes !== "string") {
    return [];
  }

  return notes
    .split(/\n{2,}|\r\n{2,}/)
    .map((section) => section.trim())
    .filter(Boolean);
}

function normalizeCoApplicants(coApplicants: unknown) {
  if (!Array.isArray(coApplicants)) {
    return [];
  }

  return coApplicants
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const name = typeof record.name === "string" ? record.name.trim() : "";

      if (!name) {
        return null;
      }

      return {
        name,
        email: typeof record.email === "string" ? record.email.trim().toLowerCase() : "",
        phone: typeof record.phone === "string" ? record.phone.trim() : "",
        monthlyIncome: Number(record.monthlyIncome ?? 0),
        residentScore: Number(record.residentScore ?? 0),
        notes: typeof record.notes === "string" ? record.notes.trim() : ""
      };
    })
    .filter(Boolean);
}

function cleanMissingItems(notes: string[], values: {
  propertyAddress: string;
  propertyPostalCode: string;
  monthlyRent: number;
  moveInDate: string;
}) {
  return notes
    .map((section) => {
      if (!section.toLowerCase().startsWith("missing items")) {
        return section;
      }

      const [heading, ...lines] = section.split("\n");
      const filteredLines = lines.filter((line) => {
        const normalized = line.trim().toLowerCase();

        if ((normalized.includes("property address") || normalized.includes("postal code")) && (values.propertyAddress || values.propertyPostalCode)) {
          return false;
        }

        if (normalized.includes("monthly rent") && values.monthlyRent > 0) {
          return false;
        }

        if ((normalized.includes("move-in") || normalized.includes("move in") || normalized.includes("desired timeline")) && values.moveInDate) {
          return false;
        }

        return Boolean(line.trim());
      });

      return filteredLines.length > 0 ? [heading, ...filteredLines].join("\n") : "";
    })
    .filter(Boolean);
}

async function findDuplicateApplicant(params: {
  organizationId: string;
  applicantId: string;
  duplicateFingerprint: string;
  email: string;
  phone: string;
  name: string;
  monthlyRent: number;
  monthlyIncome: number;
}) {
  return Applicant.findOne({
    _id: { $ne: new Types.ObjectId(params.applicantId) },
    organizationId: new Types.ObjectId(params.organizationId),
    $or: [
      { duplicateFingerprint: params.duplicateFingerprint },
      { email: params.email },
      { phone: params.phone },
      { name: params.name, monthlyRent: params.monthlyRent, monthlyIncome: params.monthlyIncome }
    ]
  })
    .sort({ createdAt: -1 })
    .lean();
}

async function findApplicant(id: string, organizationId: string) {
  await dbConnect();

  return Applicant.findOne({
    _id: new Types.ObjectId(id),
    organizationId: new Types.ObjectId(organizationId)
  });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return unauthorized();
  }

  const { id } = await context.params;
  const json = await request.json();
  const parsed = applicantSchema.safeParse(json);

  if (!parsed.success) {
    return validationErrorResponse(parsed.error.issues);
  }

  const applicant = await findApplicant(id, session.user.organizationId);
  if (!applicant) {
    return NextResponse.json({ message: "Applicant not found." }, { status: 404 });
  }

  const organization = await Organization.findById(session.user.organizationId).lean();
  if (!organization) {
    return NextResponse.json({ message: "Workspace not found." }, { status: 404 });
  }

  const enabledSources = organization.intakeSettings?.enabledSources?.length
    ? organization.intakeSettings.enabledSources
    : undefined;
  if (enabledSources && !enabledSources.includes(parsed.data.applicationSource)) {
    return NextResponse.json(
      { message: `${parsed.data.applicationSource} intake is disabled in admin settings for this workspace.` },
      { status: 400 }
    );
  }

  const monthlyRent = finiteNumber(parsed.data.monthlyRent);
  const normalizedMonthlyIncome =
    parsed.data.normalizedMonthlyIncome !== null
      ? finiteNumber(parsed.data.normalizedMonthlyIncome)
      : finiteNumber(parsed.data.monthlyIncome);
  const monthlyIncome = normalizedMonthlyIncome || finiteNumber(parsed.data.monthlyIncome);
  const incomeToRentRatio =
    parsed.data.incomeToRentRatio ??
    calculateIncomeToRentRatio(monthlyIncome || null, monthlyRent || null);

  const duplicateFingerprint = buildApplicantFingerprint({
    email: parsed.data.email,
    phone: parsed.data.phone,
    name: parsed.data.name,
    monthlyRent,
    monthlyIncome
  });

  const duplicateApplicant = await findDuplicateApplicant({
    applicantId: id,
    organizationId: session.user.organizationId,
    duplicateFingerprint,
    email: parsed.data.email,
    phone: parsed.data.phone,
    name: parsed.data.name,
    monthlyRent,
    monthlyIncome
  });

  if (duplicateApplicant) {
    await recordAuditLog({
      organizationId: session.user.organizationId,
      actorUserId: session.user.id,
      actorName: session.user.name,
      actorEmail: session.user.email,
      action: "applicant.update_blocked_duplicate",
      entityType: "applicant",
      entityId: id,
      level: "warning",
      message: "Blocked applicant update because it matched another existing applicant.",
      metadata: {
        existingApplicantId: String(duplicateApplicant._id)
      }
    });
    return NextResponse.json(
      {
        message: "Another matching applicant already exists in your workspace. Update the existing record instead of duplicating it."
      },
      { status: 409 }
    );
  }

  const scoring = calculateApplicantScore(parsed.data, organization.screeningPolicy);
  const normalizedNotes = cleanMissingItems(normalizeNotes(parsed.data.notes), {
    propertyAddress: parsed.data.propertyAddress,
    propertyPostalCode: parsed.data.propertyPostalCode,
    monthlyRent,
    moveInDate: parsed.data.moveInDate
  });
  const normalizedCoApplicants = normalizeCoApplicants(parsed.data.coApplicants);

  try {
    applicant.set({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      propertyAddress: parsed.data.propertyAddress,
      propertyCity: parsed.data.propertyCity,
      propertyState: parsed.data.propertyState,
      propertyPostalCode: parsed.data.propertyPostalCode,
      moveInDate: parsed.data.moveInDate,
      coApplicants: normalizedCoApplicants,
      duplicateFingerprint,
      duplicateDayKey: applicant.duplicateDayKey || buildApplicantDayKey(new Date(applicant.createdAt ?? new Date())),
      applicationSource: parsed.data.applicationSource,
      monthlyRent,
      monthlyIncome,
      incomeAmount: parsed.data.incomeAmount,
      incomeFrequency: parsed.data.incomeFrequency,
      normalizedMonthlyIncome,
      incomeToRentRatio,
      housingSupport: parsed.data.housingSupport,
      supportProgram: parsed.data.supportProgram,
      monthlySubsidyAmount: parsed.data.monthlySubsidyAmount,
      tenantPortionRent: parsed.data.tenantPortionRent,
      subsidyStatus: parsed.data.subsidyStatus,
      inspectionStatus: parsed.data.inspectionStatus,
      creditScore: parsed.data.creditScore,
      residentScore: parsed.data.residentScore,
      scores: scoring.scores,
      totalScore: scoring.totalScore,
      decision: scoring.decision,
      affordabilityRatio: scoring.affordabilityRatio,
      responsibleRent: scoring.responsibleRent,
      redFlags: scoring.redFlags,
      aiSummary: parsed.data.summary,
      aiRedFlags: parsed.data.concerns,
      aiStrengths: parsed.data.strengths,
      aiRecommendation: parsed.data.nextStep,
      rawText: parsed.data.rawText,
      suggestedMessage: parsed.data.suggestedMessage,
      extractedFieldSummary: parsed.data.extractedFieldSummary,
      missingDocuments: parsed.data.missingDocuments,
      nextStep: parsed.data.nextStep,
      confidenceLevel: parsed.data.confidenceLevel,
      confidenceReason: parsed.data.confidenceReason,
      readiness: parsed.data.readiness,
      riskLevel: parsed.data.riskLevel,
      notes: normalizedNotes,
      status: parsed.data.status
    });

    await applicant.save();
    await recordAuditLog({
      organizationId: session.user.organizationId,
      actorUserId: session.user.id,
      actorName: session.user.name,
      actorEmail: session.user.email,
      action: "applicant.updated",
      entityType: "applicant",
      entityId: String(applicant._id),
      message: `Updated applicant ${applicant.name}.`,
      metadata: {
        status: applicant.status
      }
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      await recordAuditLog({
        organizationId: session.user.organizationId,
        actorUserId: session.user.id,
        actorName: session.user.name,
        actorEmail: session.user.email,
        action: "applicant.update_duplicate_conflict",
        entityType: "applicant",
        entityId: id,
        level: "warning",
        message: "Applicant update hit duplicate conflict."
      });
      return NextResponse.json(
        { message: "Another matching applicant already exists in your workspace. Update the existing record instead of duplicating it." },
        { status: 409 }
      );
    }

    throw error;
  }

  return NextResponse.json(serializeApplicantRecord(applicant.toObject()));
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return unauthorized();
  }

  const { id } = await context.params;
  const applicant = await findApplicant(id, session.user.organizationId);

  if (!applicant) {
    return NextResponse.json({ message: "Applicant not found." }, { status: 404 });
  }

  const deletedApplicantId = String(applicant._id);
  const deletedApplicantName = applicant.name;
  await applicant.deleteOne();
  await recordAuditLog({
    organizationId: session.user.organizationId,
    actorUserId: session.user.id,
    actorName: session.user.name,
    actorEmail: session.user.email,
    action: "applicant.deleted",
    entityType: "applicant",
    entityId: deletedApplicantId,
    level: "warning",
    message: `Deleted applicant ${deletedApplicantName}.`
  });
  return NextResponse.json({ ok: true });
}
