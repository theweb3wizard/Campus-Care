/** Map raw failures to one-line, user-safe messages. Never leak SQL internals. */
export function friendlyError(err: unknown, fallback = "Something went wrong. Try again."): string {
  if (err instanceof TypeError) return "No connection. Check your network and try again.";
  if (!(err instanceof Error)) return fallback;
  const m = err.message;
  if (/invalid claim|JWT|expired|session/i.test(m) && /auth|token|session/i.test(m)) {
    return "Session expired. Log in again.";
  }
  if (/row-level security|permission|not allowed|Staff only|Pharmacy only/i.test(m)) {
    return "You are not allowed to do that.";
  }
  if (m.length > 160 || /exception|constraint|violates|pg_|SQLSTATE|relation "|function /i.test(m)) {
    return fallback;
  }
  return m;
}
