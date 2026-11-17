/** "Good morning" / "Good afternoon" / "Good evening" for a given time. */
export function greetingFor(date: Date) {
  const h = date.getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

/** e.g. "Tuesday, November 17" in Canadian English. */
export function formatLongDate(date: Date) {
  return date.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })
}

/** First word of a full name, or empty string. */
export function firstName(fullName: string | null | undefined) {
  return (fullName ?? '').trim().split(/\s+/)[0] ?? ''
}
