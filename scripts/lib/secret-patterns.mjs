// Deterministic secret-scanning patterns shared across validation scripts.
// Each entry has a human-readable name and a regex (re) to test against text.
// scanForSecrets returns an array of matched names for the given text string.

export const SECRET_PATTERNS = [
  { name: "private key", re: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: "AWS access key", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "bearer or api token", re: /\b(secret|token|api[_-]?key|password)\b\s*[:=]\s*\S+/i },
  { name: "email address", re: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/ },
  { name: "private IPv4", re: /\b(10|192\.168|172\.(1[6-9]|2\d|3[01]))(\.\d{1,3}){1,3}\b/ },
  { name: "internal hostname", re: /\b[\w-]+\.(internal|corp|local|intra)\b/ },
  { name: "code fence", re: /```[\s\S]*```/ },
];

// Returns an array of { name } objects for every pattern that matches text.
export function scanForSecrets(text) {
  return SECRET_PATTERNS.filter((p) => p.re.test(text));
}
