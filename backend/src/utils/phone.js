export function deriveDddFromPhone(phone = "") {
  const digits = String(phone).replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("55") && digits.length >= 4) return digits.slice(2, 4);
  if (digits.length >= 10) return digits.slice(0, 2);
  return null;
}
