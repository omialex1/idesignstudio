// Password rule for customer accounts: at least 8 characters, with a lower-case
// letter, an upper-case letter, a digit and a special character (anything that
// is not a letter or a digit). The same function runs in the browser (to show
// the checklist) and on the server (the real check).

export const PASSWORD_MIN_LENGTH = 8;

export type PasswordRequirement =
  "length" | "lower" | "upper" | "digit" | "special";

export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  "length",
  "lower",
  "upper",
  "digit",
  "special",
];

const CHECKS: Record<PasswordRequirement, (password: string) => boolean> = {
  length: (p) => p.length >= PASSWORD_MIN_LENGTH,
  lower: (p) => /\p{Ll}/u.test(p),
  upper: (p) => /\p{Lu}/u.test(p),
  digit: (p) => /\p{Nd}/u.test(p),
  special: (p) => /[^\p{L}\p{N}]/u.test(p),
};

export function passwordMet(
  password: string,
  requirement: PasswordRequirement,
) {
  return CHECKS[requirement](password);
}

export function passwordIssues(password: string): PasswordRequirement[] {
  return PASSWORD_REQUIREMENTS.filter((r) => !CHECKS[r](password));
}

export function isValidPassword(password: string) {
  return passwordIssues(password).length === 0;
}
