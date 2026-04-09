import { CSSProperties, forwardRef, ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface SurfaceCardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  textColor?: string;
  mutedColor?: string;
  right?: ReactNode;
}

interface ActionButtonProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
}

interface MetricCardProps {
  label: string;
  value: string;
  detail?: string;
  icon: LucideIcon;
  accentColor: string;
  accentBg: string;
  textColor: string;
  mutedColor: string;
  style?: CSSProperties;
}

export const SurfaceCard = forwardRef<HTMLDivElement, SurfaceCardProps>(function SurfaceCard(
  { children, className = "", style },
  ref
) {
  return (
    <div ref={ref} className={`rounded-[28px] border p-5 ${className}`.trim()} style={style}>
      {children}
    </div>
  );
});

export function SectionHeader({
  title,
  subtitle,
  icon: Icon,
  iconColor,
  textColor,
  mutedColor,
  right
}: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <div className="flex items-center gap-3">
          {Icon ? <Icon className="h-5 w-5" style={{ color: iconColor }} /> : null}
          <p className="text-xl font-semibold" style={{ color: textColor }}>{title}</p>
        </div>
        {subtitle ? <p className="mt-1 text-sm" style={{ color: mutedColor }}>{subtitle}</p> : null}
      </div>
      {right}
    </div>
  );
}

export function ActionButton({ children, className = "", style, type = "button", onClick }: ActionButtonProps) {
  return (
    <button type={type} onClick={onClick} className={`rounded-2xl px-4 py-2.5 text-sm font-semibold ${className}`.trim()} style={style}>
      {children}
    </button>
  );
}

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  accentColor,
  accentBg,
  textColor,
  mutedColor,
  style
}: MetricCardProps) {
  return (
    <div className="rounded-[24px] border p-5" style={style}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: textColor }}>{label}</p>
          {detail ? <p className="mt-1 text-sm" style={{ color: mutedColor }}>{detail}</p> : null}
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: accentBg }}>
          <Icon className="h-5 w-5" style={{ color: accentColor }} />
        </div>
      </div>
      <p className="mt-5 text-3xl font-bold tracking-tight" style={{ color: textColor }}>{value}</p>
    </div>
  );
}
