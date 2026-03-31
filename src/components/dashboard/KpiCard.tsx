import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  change?: number;
  featured?: boolean;
}

export function KpiCard({ title, value, subtitle, icon, change, featured }: KpiCardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;
  const ChangeIcon = isPositive ? ArrowUpRight : isNegative ? ArrowDownRight : Minus;
  const changeColor = isPositive
    ? 'text-emerald-600 dark:text-emerald-400'
    : isNegative
    ? 'text-red-500'
    : 'text-muted-foreground';

  return (
    <Card className={cn(featured && 'border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5')}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
              {title}
            </p>
            <div className={cn('mt-1 text-2xl font-bold truncate', featured && 'text-primary')}>
              {value}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
            )}
            {change !== undefined && (
              <p className={cn('text-xs flex items-center gap-0.5 mt-1 font-medium', changeColor)}>
                <ChangeIcon className="h-3 w-3 shrink-0" />
                {Math.abs(change).toFixed(1)}% vs mês anterior
              </p>
            )}
          </div>
          {icon && (
            <div className={cn('shrink-0 rounded-lg p-2', featured ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
