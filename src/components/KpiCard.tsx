import { ReactNode } from "react";
import { LucideIcon, TrendingUp, TrendingDown, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string;
  change?: string;
  changePositive?: boolean;
  icon?: LucideIcon;
  iconColor?: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
  featured?: boolean;
  active?: boolean;
  onClick?: () => void;
}

export function KpiCard({
  title,
  value,
  change,
  changePositive,
  icon: Icon,
  iconColor,
  subtitle,
  children,
  className,
  featured,
  active,
  onClick,
}: KpiCardProps) {
  const baseBg = featured ? "hsl(var(--primary))" : "hsl(var(--card))";
  const titleColor = featured ? "hsl(220 30% 75%)" : "hsl(var(--muted-foreground))";
  const valueColor = featured ? "hsl(0 0% 100%)" : "hsl(var(--foreground))";
  const subtitleColor = featured ? "hsl(220 30% 68%)" : "hsl(var(--muted-foreground))";

  return (
    <div
      className={cn(
        "rounded-2xl p-5 flex flex-col gap-3 animate-fade-in relative overflow-hidden transition-all duration-200",
        onClick && "cursor-pointer hover:scale-[1.02]",
        className
      )}
      onClick={onClick}
      style={{
        background: baseBg,
        border: active
          ? "2px solid hsl(var(--primary))"
          : featured
          ? "none"
          : "1px solid hsl(var(--border))",
        boxShadow: active
          ? "0 0 0 4px hsl(var(--primary) / 0.12), var(--shadow-md)"
          : featured
          ? "0 6px 24px hsl(220 55% 20% / 0.32), inset 0 1px 0 hsl(0 0% 100% / 0.08)"
          : "var(--shadow-sm)",
      }}
    >
      {/* subtle top-right glow for featured */}
      {featured && (
        <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(218 80% 70%), transparent 70%)", transform: "translate(30%, -30%)" }} />
      )}

      <div className="flex items-start justify-between relative z-10">
        <p className="text-xs font-semibold uppercase tracking-widest leading-tight" style={{ color: titleColor }}>
          {title}
        </p>
        {Icon && (
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: featured ? "hsl(0 0% 100% / 0.12)" : iconColor ? `${iconColor}18` : "hsl(var(--muted))",
            }}>
            <Icon className="w-4 h-4" style={{ color: featured ? "hsl(0 0% 100% / 0.85)" : iconColor || "hsl(var(--primary))" }} />
          </div>
        )}
      </div>

      <div className="relative z-10">
        <p className="text-xl font-bold font-display leading-tight tabular-nums break-all" style={{ color: valueColor }}>
          {value}
        </p>
        {subtitle && (
          <p className="text-xs mt-0.5" style={{ color: subtitleColor }}>{subtitle}</p>
        )}
      </div>

      {change !== undefined && (
        <div className="flex items-center gap-1 relative z-10">
          {changePositive
            ? <TrendingUp className="w-3 h-3" style={{ color: featured ? "hsl(162 60% 62%)" : "hsl(var(--success))" }} />
            : <TrendingDown className="w-3 h-3" style={{ color: featured ? "hsl(350 70% 68%)" : "hsl(var(--danger))" }} />}
          <span className="text-xs font-semibold"
            style={{ color: featured ? (changePositive ? "hsl(162 60% 62%)" : "hsl(350 70% 68%)") : (changePositive ? "hsl(var(--success))" : "hsl(var(--danger))") }}>
            {changePositive ? "+" : "-"}{change}
          </span>
          <span className="text-xs" style={{ color: subtitleColor }}>vs mês anterior</span>
        </div>
      )}

      {children}

      {/* Clickable hint */}
      {onClick && (
        <div
          className="flex items-center gap-1 mt-auto pt-1"
          style={{ borderTop: `1px solid ${active ? "hsl(var(--primary) / 0.2)" : "hsl(var(--border))"}` }}
        >
          <ChevronDown
            className="w-3 h-3 transition-transform duration-200"
            style={{
              color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
              transform: active ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
          <span
            className="text-xs font-medium"
            style={{ color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}
          >
            {active ? "Fechar detalhes" : "Ver por funil"}
          </span>
        </div>
      )}
    </div>
  );
}

interface SectionCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
  noPadding?: boolean;
}

export function SectionCard({ title, subtitle, children, className, action, noPadding }: SectionCardProps) {
  return (
    <div
      className={cn("rounded-2xl overflow-hidden animate-fade-in", className)}
      style={{
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid hsl(var(--border))" }}>
        <div>
          <h3 className="text-sm font-semibold font-display" style={{ color: "hsl(var(--foreground))" }}>
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>{subtitle}</p>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
      <div className={noPadding ? "" : "p-5"}>{children}</div>
    </div>
  );
}
