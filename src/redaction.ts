const REDACTION = "[REDACTED]";

const SENSITIVE_ASSIGNMENT_PATTERN =
  /\b(STOCKTRENDS_API_KEY|API_KEY|AUTHORIZATION|X-API-KEY|X_API_KEY|BEARER_TOKEN|PAYMENT_SIGNATURE|PAYMENT-SIGNATURE|PAYMENT_PROOF|PAYMENT-PROOF|PAYMENT_ENVELOPE|PAYMENT-ENVELOPE|X402_PROOF|X402-PROOF|PROOF_ENVELOPE|CHALLENGE_ID|NONCE|RECIPIENT|WALLET_ADDRESS|SEED_PHRASE|X-PAYMENT|PAYMENT_HEADER|PAYMENT-REQUIRED|X-STOCKTRENDS-PAYMENT-REQUIRED|X-STOCKTRENDS-ACCEPTED-PAYMENT-METHODS|X-STOCKTRENDS-PRICING-RULE|WALLET_PRIVATE_KEY|PRIVATE_KEY|DATABASE_URL)\b(\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s,;]+)/gi;
const AUTHORIZATION_HEADER_PATTERN = /\b(Authorization)(\s*:\s*)(Bearer|Basic)\s+[^\s,;]+/gi;
const API_KEY_HEADER_PATTERN = /\b(X-API-Key|X_API_KEY)(\s*:\s*)[^\s,;]+/gi;
const PAYMENT_HEADER_PATTERN =
  /\b(PAYMENT-SIGNATURE|PAYMENT_SIGNATURE|PAYMENT-PROOF|PAYMENT_PROOF|PAYMENT-ENVELOPE|PAYMENT_ENVELOPE|X402-PROOF|X402_PROOF|X-PAYMENT|PAYMENT_HEADER|PAYMENT-REQUIRED|X-STOCKTRENDS-PAYMENT-REQUIRED|X-STOCKTRENDS-ACCEPTED-PAYMENT-METHODS|X-STOCKTRENDS-PRICING-RULE)(\s*:\s*)[^\s,;]+/gi;

export function redactSensitiveText(input: string, knownSecrets: readonly (string | undefined)[] = []): string {
  let redacted = input;

  for (const secret of uniqueKnownSecrets(knownSecrets)) {
    redacted = redacted.replace(new RegExp(escapeRegExp(secret), "g"), REDACTION);
  }

  return redacted
    .replace(AUTHORIZATION_HEADER_PATTERN, (_match, name: string, separator: string) => `${name}${separator}${REDACTION}`)
    .replace(API_KEY_HEADER_PATTERN, (_match, name: string, separator: string) => `${name}${separator}${REDACTION}`)
    .replace(PAYMENT_HEADER_PATTERN, (_match, name: string, separator: string) => `${name}${separator}${REDACTION}`)
    .replace(SENSITIVE_ASSIGNMENT_PATTERN, (_match, name: string, separator: string) => `${name}${separator}${REDACTION}`);
}

function uniqueKnownSecrets(secrets: readonly (string | undefined)[]): string[] {
  return [...new Set(secrets.map((secret) => secret?.trim()).filter((secret): secret is string => Boolean(secret)))].sort(
    (left, right) => right.length - left.length
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
