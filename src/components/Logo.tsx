export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-tight ${className}`}>
      <img src="/icons/icon.svg" alt="" className="h-7 w-7" />
      <span>
        Deal<span className="text-brand-fairway">Fairway</span>
      </span>
    </span>
  )
}
