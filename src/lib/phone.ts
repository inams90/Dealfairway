import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/min'

/**
 * Normalizes a phone number to E.164 (e.g. "+19055551234"). Numbers without a
 * country code are treated as Canadian. Returns null if it isn't a valid number.
 */
export function normalizePhone(raw: string | null | undefined, defaultCountry: CountryCode = 'CA'): string | null {
  const value = (raw ?? '').trim()
  if (!value) return null
  const parsed = parsePhoneNumberFromString(value, defaultCountry)
  if (!parsed || !parsed.isPossible()) return null
  return parsed.number
}

/** Friendly display: "(905) 555-1234" for North American numbers, international format otherwise. */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return ''
  const parsed = parsePhoneNumberFromString(value, 'CA')
  if (!parsed) return value
  return parsed.countryCallingCode === '1' ? parsed.formatNational() : parsed.formatInternational()
}
