import { FloralMark } from "./floral-mark";

export function SectionTitle({ title, subtitle, compact = false }: { title: string; subtitle: string; compact?: boolean }) {
  return (
    <div className={compact ? "section-title section-title--compact" : "section-title"}>
      <div className="ornament"><span /><FloralMark compact /><span /></div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  );
}
