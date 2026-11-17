// Small inline icon set (stroke icons, 24x24). Keeps the bundle free of icon libraries.
import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export const HomeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
  </Icon>
)
export const ClientsIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5" />
    <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.8.7 3 2.5 3.5 5.2" />
  </Icon>
)
export const TasksIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
    <path d="m8 12 3 3 5-6" />
  </Icon>
)
export const InquiriesIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v8a2.5 2.5 0 0 1-2.5 2.5H9l-5 4v-4.5" />
  </Icon>
)
export const MoreIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="5" cy="12" r="1.5" />
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="19" cy="12" r="1.5" />
  </Icon>
)
export const ChevronRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m9 6 6 6-6 6" />
  </Icon>
)
export const ChevronLeftIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m15 6-6 6 6 6" />
  </Icon>
)
