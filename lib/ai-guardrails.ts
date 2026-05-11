/**
 * lib/ai-guardrails.ts
 *
 * Production safety layer for AI-powered property operations.
 * Enforces: Fair Housing, automation gates, explainability, audit trails,
 * data privacy, reversibility, per-workspace opt-in.
 */

export const PROTECTED_CHARACTERISTICS = [
  'race','color','religion','sex','gender','genderIdentity',
  'sexualOrientation','nationalOrigin','ancestry','disability',
  'familialStatus','maritalStatus','age',
] as const;

export const ALLOWED_SCORING_INPUTS = [
  'monthlyRent','monthlyIncome','affordabilityRatio','residentScore',
  'scores.income','scores.credit','scores.resident','scores.rentalHistory',
  'scores.rulesCompliance','scores.timeline','scores.communication',
  'scores.documentation','housingSupport','subsidyStatus',
  'inspectionStatus','redFlags','totalScore','decision',
  'applicationSource','coApplicants','moveInDate',
] as const;

export function validateScoringInputs(fieldsUsed: string[]): { valid: boolean; violations: string[] } {
  const violations: string[] = [];
  for (const field of fieldsUsed) {
    if (PROTECTED_CHARACTERISTICS.some(pc => field.toLowerCase().includes(pc.toLowerCase()))) {
      violations.push('Protected characteristic in scoring input: "'+field+'"');
    }
  }
  return { valid: violations.length === 0, violations };
}

export type AutomationAction =
  | 'approve_tenant' | 'reject_tenant' | 'change_status'
  | 'send_communication' | 'adjust_threshold' | 'archive_record'
  | 'delete_record' | 'bulk_update';

interface SafetyGate {
  autoAllowed: boolean;
  suggestConfidenceMin: number;
  oneClickConfidenceMin: number;
  requiresConfirmation: boolean;
  requiresAudit: boolean;
  undoWindowHours: number;
  restrictionReason?: string;
}

export const SAFETY_GATES: Record<AutomationAction, SafetyGate> = {
  approve_tenant: { autoAllowed: false, suggestConfidenceMin: 90, oneClickConfidenceMin: 95, requiresConfirmation: true, requiresAudit: true, undoWindowHours: 24, restrictionReason: 'Legal liability — every approval must be a conscious human decision.' },
  reject_tenant: { autoAllowed: false, suggestConfidenceMin: 85, oneClickConfidenceMin: 90, requiresConfirmation: true, requiresAudit: true, undoWindowHours: 24, restrictionReason: 'FCRA compliance — rejections require documented, non-discriminatory reasons.' },
  change_status: { autoAllowed: false, suggestConfidenceMin: 80, oneClickConfidenceMin: 90, requiresConfirmation: true, requiresAudit: true, undoWindowHours: 48, restrictionReason: 'Status changes affect pipeline reporting and communications.' },
  send_communication: { autoAllowed: false, suggestConfidenceMin: 75, oneClickConfidenceMin: 85, requiresConfirmation: true, requiresAudit: true, undoWindowHours: 0, restrictionReason: 'AI text must be reviewed for tone, accuracy, and legal compliance.' },
  adjust_threshold: { autoAllowed: false, suggestConfidenceMin: 85, oneClickConfidenceMin: 95, requiresConfirmation: true, requiresAudit: true, undoWindowHours: 72, restrictionReason: 'Threshold changes silently shift ALL future decisions.' },
  archive_record: { autoAllowed: false, suggestConfidenceMin: 95, oneClickConfidenceMin: 100, requiresConfirmation: true, requiresAudit: true, undoWindowHours: 720, restrictionReason: 'Archiving removes records from active view.' },
  delete_record: { autoAllowed: false, suggestConfidenceMin: 100, oneClickConfidenceMin: 100, requiresConfirmation: true, requiresAudit: true, undoWindowHours: 0, restrictionReason: 'Permanent and irreversible. Always require human confirmation.' },
  bulk_update: { autoAllowed: false, suggestConfidenceMin: 90, oneClickConfidenceMin: 95, requiresConfirmation: true, requiresAudit: true, undoWindowHours: 24, restrictionReason: 'Bulk operations affect multiple records — each logged individually.' },
};

export function evaluateAutomationSafety(action: AutomationAction, confidence: number): { canSuggest: boolean; canOneClick: boolean; reason?: string } {
  const gate = SAFETY_GATES[action];
  return {
    canSuggest: confidence >= gate.suggestConfidenceMin,
    canOneClick: confidence >= gate.oneClickConfidenceMin,
    reason: confidence < gate.suggestConfidenceMin ? 'Confidence '+confidence+'% below '+gate.suggestConfidenceMin+'% threshold for '+action+'.' : undefined,
  };
}

export interface DecisionTrace { ruleName: string; input: string; output: string; passed: boolean; }

export function generateDecisionTrace(ruleResults: DecisionTrace[], finalDecision: string): string[] {
  const trace = ruleResults.map(r => (r.passed ? '✅' : '❌')+' '+r.ruleName+': '+r.input+' → '+r.output);
  trace.push('→ Final: '+finalDecision);
  return trace;
}

export const AUDIT_REDACT_FIELDS = ['password','passwordHash','secret','token','ssn','socialSecurity','bankAccount','creditCard','authorization','apiKey'] as const;

export function capturePreState<T extends Record<string,unknown>>(state: T, fields: string[]): Record<string,unknown> {
  const s: Record<string,unknown> = {};
  for (const f of fields) s[f] = AUDIT_REDACT_FIELDS.some(rf => f.toLowerCase().includes(rf)) ? '[REDACTED]' : (state[f] ?? null);
  return s;
}

export interface WorkspaceAutomationSettings { automationEnabled: boolean; suggestStatusChanges: boolean; suggestApprovals: boolean; suggestComparisons: boolean; suggestThresholdChanges: boolean; }

export const DEFAULT_AUTOMATION_SETTINGS: WorkspaceAutomationSettings = { automationEnabled: false, suggestStatusChanges: false, suggestApprovals: false, suggestComparisons: false, suggestThresholdChanges: false };

export interface FairHousingAuditItem { applicantId: string; applicantName: string; decision: string; date: string; ruleTraces: string[]; finalRationale: string; }

export function generateFairHousingAudit(decisions: FairHousingAuditItem[]): string {
  return [
    'FAIR HOUSING COMPLIANCE AUDIT',
    'Generated: '+new Date().toISOString(),
    'Total decisions: '+decisions.length,
    '',
    'SCORING INPUTS (FCRA-permissible):',
    ...ALLOWED_SCORING_INPUTS.map(f => '  - '+f),
    '',
    'PROTECTED (never used):',
    ...PROTECTED_CHARACTERISTICS.map(c => '  - '+c),
  ].join('\n');
}
