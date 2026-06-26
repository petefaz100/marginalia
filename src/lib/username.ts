// Shared username rules, used by both the client (live feedback) and the server
// actions (authoritative check). Keeping them in one place means the inline
// validation a reader sees always matches what the server will accept.

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;

// Letters, numbers, underscores, hyphens. No spaces, no other punctuation.
const USERNAME_RE = /^[A-Za-z0-9_-]+$/;

export const USERNAME_RULES_HINT =
  "Usernames can only include letters, numbers, underscores, and hyphens.";

// Returns null when the name is structurally valid, or a human-readable error
// describing the first rule it breaks. Uniqueness is checked separately against
// the database — this is only the shape check.
export function validateUsername(raw: string): string | null {
  const name = raw.trim();
  if (name.length === 0) return "Pick a username.";
  if (name.length < USERNAME_MIN)
    return `Usernames must be at least ${USERNAME_MIN} characters.`;
  if (name.length > USERNAME_MAX)
    return `Usernames can be at most ${USERNAME_MAX} characters.`;
  if (!USERNAME_RE.test(name)) return USERNAME_RULES_HINT;
  return null;
}
