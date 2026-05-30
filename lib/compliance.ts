const riskyPatterns = [
  /\brace\b/i,
  /\breligion\b/i,
  /\bnational origin\b/i,
  /\bdisab/i,
  /\bfamil/i,
  /\bchildren\b/i,
  /\bsource of income\b/i,
  /\bage\b/i,
  /\bsex\b/i,
  /\bpregnan/i,
];

export function findComplianceWarnings(text: string) {
  if (!text.trim()) return [];

  return riskyPatterns.some((pattern) => pattern.test(text))
    ? [
        "This note may mention protected-class information. Keep screening notes tied to objective rental criteria only.",
      ]
    : [];
}
