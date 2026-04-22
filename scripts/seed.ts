import "dotenv/config";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/mongodb";
import Applicant from "@/models/Applicant";
import Organization from "@/models/Organization";
import User from "@/models/User";
import { calculateApplicantScore } from "@/lib/scoring";

async function seed() {
  await dbConnect();

  await Promise.all([Applicant.deleteMany({}), User.deleteMany({}), Organization.deleteMany({})]);

  const organization = await Organization.create({
    name: "Demo Property Group",
    slug: "demo-property-group",
    plan: "starter",
    billingStatus: "inactive"
  });

  const passwordHash = await bcrypt.hash("demo12345", 12);

  const user = await User.create({
    name: "Demo Operator",
    email: "demo@rentninja.ai",
    passwordHash,
    organizationId: organization._id,
    role: "owner"
  });

  const demoApplicants = [
    {
      name: "Nina Patel",
      email: "nina.patel@email.com",
      phone: "212-555-0141",
      monthlyRent: 2400,
      monthlyIncome: 8700,
      creditScore: 742,
      rentalHistoryScore: 92,
      rulesComplianceScore: 95,
      timelineScore: 90,
      communicationScore: 94,
      documentationScore: 96,
      notes: ["Income verified with recent pay stubs."],
      status: "Screening" as const
    },
    {
      name: "Marcus Allen",
      email: "marcus.allen@email.com",
      phone: "917-555-0199",
      monthlyRent: 2100,
      monthlyIncome: 5600,
      creditScore: 638,
      rentalHistoryScore: 66,
      rulesComplianceScore: 72,
      timelineScore: 64,
      communicationScore: 70,
      documentationScore: 68,
      notes: ["Needs manual review because of mixed background indicators."],
      status: "Review" as const
    },
    {
      name: "Olivia Brooks",
      email: "olivia.brooks@email.com",
      phone: "646-555-0167",
      monthlyRent: 2800,
      monthlyIncome: 4800,
      creditScore: 581,
      rentalHistoryScore: 42,
      rulesComplianceScore: 48,
      timelineScore: 50,
      communicationScore: 55,
      documentationScore: 44,
      notes: ["Escalated to risk review."],
      status: "Rejected" as const
    }
  ];

  for (const applicant of demoApplicants) {
    const scoring = calculateApplicantScore(applicant);

    await Applicant.create({
      organizationId: organization._id,
      ownerId: user._id,
      ...applicant,
      scores: scoring.scores,
      totalScore: scoring.totalScore,
      affordabilityRatio: scoring.affordabilityRatio,
      decision: scoring.decision,
      redFlags: scoring.redFlags
    });
  }

  console.log("Seed complete");
  console.log("Demo login: demo@rentninja.ai / demo12345");
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
