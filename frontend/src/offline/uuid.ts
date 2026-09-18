/** crypto.randomUUID() only exists in secure contexts (HTTPS or localhost).
 * The deployed API is plain HTTP for now, so on that origin the method is
 * undefined and calling it throws — silently breaking every event write
 * (recordEvent awaits it, the exception rejects the promise, and the
 * two-step selection just sits there forever with nothing recorded).
 * crypto.getRandomValues has no such restriction, so build a UUIDv4 from it
 * when randomUUID isn't available. */
export function generateEventId(): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
