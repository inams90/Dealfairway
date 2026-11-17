/** Full "DealFairway" wordmark — for light backgrounds (login, sign-up). */
export function Wordmark({ className = '' }: { className?: string }) {
  return <img src="/brand/wordmark.svg" alt="DealFairway" className={className} />
}

/** White mark + name — for the dark green top bar. */
export function HeaderLogo() {
  return (
    <span className="inline-flex items-center gap-2 text-lg font-bold tracking-tight">
      <img src="/brand/mark-white.svg" alt="" className="h-8 w-8" />
      <span>
        Deal<span className="text-[#a9cf8e]">Fairway</span>
      </span>
    </span>
  )
}
