"use client"

import { cn } from "@/lib/utils"

type SiteLogoProps = {
  label?: string
  subtitle?: string
  compact?: boolean
  showLabel?: boolean
  inverse?: boolean
  className?: string
}

export function SiteLogo({
  label = "OpenLearn Next",
  subtitle = "未来课堂操作系统",
  compact = false,
  showLabel = true,
  inverse = false,
  className,
}: SiteLogoProps) {
  return (
    <span className={cn("inline-flex items-center", compact ? "gap-2" : "gap-3", className)}>
      <span
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-[1.1rem] shadow-[0_14px_34px_rgba(37,99,235,0.28)] ring-1",
          compact ? "size-10" : "size-11",
          inverse
            ? "bg-white/10 ring-white/12"
            : "bg-linear-to-br from-[#8b5cf6] via-[#3b82f6] to-[#2dd4bf] ring-white/10",
        )}
        aria-hidden
      >
        <span
          className={cn(
            "absolute inset-0 opacity-90",
            inverse
              ? "bg-[radial-gradient(circle_at_30%_22%,rgba(255,255,255,0.28),transparent_32%),radial-gradient(circle_at_72%_74%,rgba(45,212,191,0.18),transparent_26%)]"
              : "bg-[radial-gradient(circle_at_30%_22%,rgba(255,255,255,0.32),transparent_32%),radial-gradient(circle_at_72%_74%,rgba(255,255,255,0.14),transparent_26%)]",
          )}
        />
        <span className="relative text-[0.76rem] font-semibold tracking-[0.24em] text-white">ON</span>
      </span>

      {showLabel ? (
        <span className="flex min-w-0 flex-col leading-tight">
          <span
            className={cn(
              "truncate font-semibold tracking-[-0.03em]",
              compact ? "text-sm" : "text-[0.98rem]",
              inverse ? "text-white" : "text-primary",
            )}
          >
            {label}
          </span>
          {compact ? null : (
            <span
              className={cn(
                "truncate text-[0.72rem] font-medium uppercase tracking-[0.18em]",
                inverse ? "text-white/56" : "text-on-surface-variant/70",
              )}
            >
              {subtitle}
            </span>
          )}
        </span>
      ) : null}
    </span>
  )
}
