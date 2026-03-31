import { Lead, useUpdateLead } from '@/hooks/useLeads';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { DollarSign, Users, Target, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

type BantValue = 'confirmed' | 'negative' | 'unknown';

interface BantItem {
  key: 'bant_budget' | 'bant_authority' | 'bant_need' | 'bant_timeline';
  label: string;
  icon: React.ReactNode;
}

const BANT_ITEMS: BantItem[] = [
  { key: 'bant_budget', label: 'Budget', icon: <DollarSign className="h-3.5 w-3.5" /> },
  { key: 'bant_authority', label: 'Authority', icon: <Users className="h-3.5 w-3.5" /> },
  { key: 'bant_need', label: 'Need', icon: <Target className="h-3.5 w-3.5" /> },
  { key: 'bant_timeline', label: 'Timeline', icon: <Clock className="h-3.5 w-3.5" /> },
];

const VALUE_CYCLE: BantValue[] = ['unknown', 'confirmed', 'negative'];

const VALUE_CONFIG: Record<BantValue, { label: string; className: string }> = {
  confirmed: { label: 'Confirmado', className: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400' },
  negative: { label: 'Negativo', className: 'bg-destructive/10 text-destructive border-destructive/30' },
  unknown: { label: 'Indefinido', className: 'bg-muted text-muted-foreground border-border' },
};

interface SalesScoreBANTProps {
  lead: Lead;
}

export function SalesScoreBANT({ lead }: SalesScoreBANTProps) {
  const updateLead = useUpdateLead();
  const score = lead.sales_score;
  const bantCount = BANT_ITEMS.filter(b => lead[b.key] === 'confirmed').length;

  const handleBantToggle = async (key: BantItem['key']) => {
    const currentValue = (lead[key] || 'unknown') as BantValue;
    const currentIndex = VALUE_CYCLE.indexOf(currentValue);
    const nextValue = VALUE_CYCLE[(currentIndex + 1) % VALUE_CYCLE.length];

    try {
      await updateLead.mutateAsync({
        id: lead.id,
        [key]: nextValue,
      });
    } catch {
      toast.error('Erro ao atualizar BANT');
    }
  };

  const getScoreColor = (s: number) => {
    if (s >= 70) return 'text-emerald-500 border-emerald-500/40';
    if (s >= 40) return 'text-amber-500 border-amber-500/40';
    return 'text-destructive border-destructive/40';
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-start gap-4">
        {/* Sales Score */}
        <div className="flex flex-col items-center gap-1">
          <div className={cn(
            "w-16 h-16 rounded-xl border-2 flex items-center justify-center text-2xl font-bold",
            score !== null ? getScoreColor(score) : "text-muted-foreground border-border"
          )}>
            {score ?? '—'}
          </div>
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
            Sales Score
          </span>
        </div>

        {/* BANT Grid */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Qualificação BANT
            </h4>
            <span className="text-xs font-semibold text-foreground">{bantCount}/4</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {BANT_ITEMS.map((item) => {
              const value = (lead[item.key] || 'unknown') as BantValue;
              const config = VALUE_CONFIG[value];
              return (
                <button
                  key={item.key}
                  onClick={() => handleBantToggle(item.key)}
                  disabled={updateLead.isPending}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium transition-all",
                    "hover:shadow-sm cursor-pointer disabled:opacity-50",
                    config.className
                  )}
                  title={`${item.label}: ${config.label} — Clique para alterar`}
                >
                  {item.icon}
                  <div className="flex flex-col items-start leading-tight">
                    <span className="font-semibold">{item.label}</span>
                    <span className="text-[10px] opacity-75">{config.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <motion.div
              className="h-full bg-amber-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(bantCount / 4) * 100}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              style={{
                backgroundColor: bantCount >= 3 ? 'hsl(var(--primary))' : undefined,
              }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
