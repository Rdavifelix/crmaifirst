import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, DollarSign, ShoppingCart } from 'lucide-react';
import type { Goal } from '@/hooks/useGoals';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';

interface GoalsOverviewProps {
  goals: Goal[];
  periods: string[];
  currentPeriod: string;
  onSelectPeriod: (period: string) => void;
}

function formatCurrency(value: number): string {
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}k`;
  }
  return `R$ ${value.toFixed(0)}`;
}

export function GoalsOverview({
  goals,
  periods,
  currentPeriod,
  onSelectPeriod,
}: GoalsOverviewProps) {
  const today = format(new Date(), 'yyyy-MM');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {periods.map((period, index) => {
        const periodGoals = goals.filter((g) => g.period === period);
        const teamReceitaGoal = periodGoals.find(
          (g) => g.member_name === null && g.metric === 'receita'
        );
        const teamVendasGoal = periodGoals.find(
          (g) => g.member_name === null && g.metric === 'vendas'
        );
        const individualCount = periodGoals.filter(
          (g) => g.member_name !== null
        ).length;

        let monthLabel: string;
        try {
          const d = parse(period, 'yyyy-MM', new Date());
          monthLabel = format(d, 'MMMM yyyy', { locale: ptBR });
        } catch {
          monthLabel = period;
        }

        const isCurrent = period === today;
        const isSelected = period === currentPeriod;

        return (
          <motion.div
            key={period}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected
                  ? 'ring-2 ring-primary border-primary'
                  : 'border-0 shadow-lg'
              } ${isCurrent ? 'bg-primary/5' : 'bg-card/80 backdrop-blur-sm'}`}
              onClick={() => onSelectPeriod(period)}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold capitalize">{monthLabel}</h3>
                  <div className="flex gap-1.5">
                    {isCurrent && (
                      <Badge variant="default" className="text-[10px]">
                        Atual
                      </Badge>
                    )}
                    {periodGoals.length > 0 && (
                      <Badge variant="secondary" className="text-[10px]">
                        {periodGoals.length} meta(s)
                      </Badge>
                    )}
                  </div>
                </div>

                {periodGoals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Sem metas definidas
                  </p>
                ) : (
                  <div className="space-y-2">
                    {teamReceitaGoal && (
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-muted-foreground">Receita:</span>
                        <span className="font-medium">
                          {formatCurrency(teamReceitaGoal.target)}
                        </span>
                      </div>
                    )}
                    {teamVendasGoal && (
                      <div className="flex items-center gap-2 text-sm">
                        <ShoppingCart className="h-3.5 w-3.5 text-blue-500" />
                        <span className="text-muted-foreground">Vendas:</span>
                        <span className="font-medium">
                          {teamVendasGoal.target}
                        </span>
                      </div>
                    )}
                    {individualCount > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <Target className="h-3.5 w-3.5 text-amber-500" />
                        <span className="text-muted-foreground">
                          {individualCount} meta(s) individuais
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
