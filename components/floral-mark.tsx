export function FloralMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={compact ? "floral-mark floral-mark--compact" : "floral-mark"} aria-hidden="true">
      <svg viewBox="0 0 48 42" role="img">
        <path d="M24 34C23 25 17 17 9 14c-1 10 4 18 15 20Z" />
        <path d="M24 34c1-9 7-17 15-20 1 10-4 18-15 20Z" />
        <path d="M24 27c7-7 7-17 0-24-7 7-7 17 0 24Z" />
        <path d="M24 27v12M15 39h18" />
      </svg>
    </span>
  );
}
