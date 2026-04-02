import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Flag,
  Plus,
  Copy,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Target,
  Users,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { format, addMonths, subMonths, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { useGoals, useGoalsMultiPeriod } from '@/hooks/useGoals';
import type { Goal, GoalMetric, GoalUpsert } from '@/hooks/useGoals';
import { useSellers } from '@/hooks/useSellers';
import { GoalsTable } from '@/components/metas/GoalsTable';
import { GoalFormDialog } from '@/components/metas/GoalFormDialog';
import { CopyGoalsDialog } from '@/components/metas/CopyGoalsDialog';
import { GoalsOverview } from '@/components/metas/GoalsOverview';
import { toast } from 'sonner';

export default function MetasPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const selectedPeriod = format(selectedDate, 'yyyy-MM');
  const [filterScope, setFilterScope] = useState('all');
  const [filterMetric, setFilterMetric] = useState('all');
  const [goalFormOpen, setGoalFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);

  const { goals, isLoading, upsert, deleteGoal, refetch } =
    useGoals(selectedPeriod);
  const { data: sellers = [] } = useSellers();

  // Overview: 6 months (3 before, current, 2 after)
  const overviewPeriods = useMemo(() => {
    const periods: string[] = [];
    for (let i = -3; i <= 2; i++) {
      periods.push(format(addMonths(new Date(), i), 'yyyy-MM'));
    }
    return periods;
  }, []);

  const { goals: overviewGoals, isLoading: overviewLoading } =
    useGoalsMultiPeriod(overviewPeriods);

  const periodLabel = useMemo(() => {
    try {
      return format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return selectedPeriod;
    }
  }, [selectedDate, selectedPeriod]);

  const filteredGoals = useMemo(() => {
    let filtered = goals;
    if (filterScope === 'team') {
      filtered = filtered.filter((g) => g.member_name === null);
    } else if (filterScope === 'individual') {
      filtered = filtered.filter((g) => g.member_name !== null);
    }
    if (filterMetric !== 'all') {
      filtered = filtered.filter((g) => g.metric === filterMetric);
    }
    return filtered;
  }, [goals, filterScope, filterMetric]);

  // Stats
  const totalGoals = goals.length;
  const teamGoals = goals.filter((g) => g.member_name === null).length;
  const individualGoals = goals.filter((g) => g.member_name !== null).length;
  const uniqueMembers = new Set(
    goals.filter((g) => g.member_name).map((g) => g.member_name)
  ).size;

  const handlePrevMonth = () => setSelectedDate((d) => subMonths(d, 1));
  const handleNextMonth = () => setSelectedDate((d) => addMonths(d, 1));
  const handleToday = () => setSelectedDate(new Date());

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setGoalFormOpen(true);
  };

  const handleNew = () => {
    setEditingGoal(null);
    setGoalFormOpen(true);
  };

  const handleSave = async (payload: GoalUpsert) => {
    await upsert(payload);
  };

  const handleCopy = async (payloads: GoalUpsert[]) => {
    let success = 0;
    for (const p of payloads) {
      try {
        await upsert(p);
        success++;
      } catch {
        // individual errors handled by upsert
      }
    }
    if (success > 0) {
      toast.success(`${success} meta(s) copiada(s) com sucesso!`);
    }
  };

  const handleOverviewSelect = (period: string) => {
    try {
      const d = parse(period, 'yyyy-MM', new Date());
      setSelectedDate(d);
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-amber-500/5 to-orange-500/5 rounded-3xl blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border bg-card/50 backdrop-blur-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                <Flag className="h-5 w-5" />
              </div>
              <h1 className="text-3xl font-bold">Planejador de Metas</h1>
            </div>
            <p className="text-muted-foreground">
              Defina, acompanhe e gerencie as metas da equipe por mês
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setCopyDialogOpen(true)}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar Metas
            </Button>
            <Button onClick={handleNew}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Meta
            </Button>
          </div>
        </div>
      </div>

      {/* Month Navigator */}
      <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm">
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-center gap-4">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-lg font-semibold capitalize min-w-[200px] text-center">
                {periodLabel}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleToday}>
              Hoje
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-500 to-amber-600 text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm font-medium">
                    Total de Metas
                  </p>
                  <p className="text-3xl font-bold mt-1">{totalGoals}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/20">
                  <Target className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">
                    Metas da Equipe
                  </p>
                  <p className="text-3xl font-bold mt-1">{teamGoals}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/20">
                  <Users className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm font-medium">
                    Metas Individuais
                  </p>
                  <p className="text-3xl font-bold mt-1">{individualGoals}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/20">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">
                    Membros com Meta
                  </p>
                  <p className="text-3xl font-bold mt-1">{uniqueMembers}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/20">
                  <BarChart3 className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Tabs: Month View / Overview */}
      <Tabs defaultValue="month" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="month">Metas do Mês</TabsTrigger>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          </TabsList>

          {/* Filters (only for month tab, but always visible) */}
          <div className="flex items-center gap-2">
            <Select value={filterScope} onValueChange={setFilterScope}>
              <SelectTrigger className="w-40 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="team">Equipe</SelectItem>
                <SelectItem value="individual">Individual</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterMetric} onValueChange={setFilterMetric}>
              <SelectTrigger className="w-44 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas métricas</SelectItem>
                <SelectItem value="receita">Receita</SelectItem>
                <SelectItem value="vendas">Vendas</SelectItem>
                <SelectItem value="leads">Leads</SelectItem>
                <SelectItem value="agendamentos">Agendamentos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="month">
          {isLoading ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="py-16">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-muted-foreground">Carregando metas...</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <GoalsTable
              goals={filteredGoals}
              onEdit={handleEdit}
              onDelete={deleteGoal}
            />
          )}
        </TabsContent>

        <TabsContent value="overview">
          {overviewLoading ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="py-16">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-muted-foreground">
                    Carregando visão geral...
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <GoalsOverview
              goals={overviewGoals}
              periods={overviewPeriods}
              currentPeriod={selectedPeriod}
              onSelectPeriod={handleOverviewSelect}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <GoalFormDialog
        open={goalFormOpen}
        onClose={() => {
          setGoalFormOpen(false);
          setEditingGoal(null);
        }}
        onSave={handleSave}
        editingGoal={editingGoal}
        period={selectedPeriod}
        sellers={sellers}
      />

      <CopyGoalsDialog
        open={copyDialogOpen}
        onClose={() => setCopyDialogOpen(false)}
        onCopy={handleCopy}
        currentPeriod={selectedPeriod}
      />
    </div>
  );
}
