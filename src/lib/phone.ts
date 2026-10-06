// Phone numbers are the customer lookup key, so store one canonical form:
// digits only, with a leading "+" kept if present ("00" prefix treated as "+").
export function normalizePhone(input: string): string {
  const trimmed = input.trim()
  const digits = trimmed.replace(/\D/g, '')
  if (trimmed.startsWith('+')) return `+${digits}`
  if (digits.startsWith('00')) return `+${digits.slice(2)}`
  return digits
}

export function isValidPhone(normalized: string): boolean {
  return normalized.replace('+', '').length >= 6
}

export function whatsappUrl(normalized: string): string {
  return `https://wa.me/${normalized.replace('+', '')}`
}
