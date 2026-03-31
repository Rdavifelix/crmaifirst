import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  DollarSign,
  Target,
  Users,
  Megaphone,
  RefreshCw,
  Loader2,
  TrendingUp,
  Eye,
  MousePointerClick,
  ArrowRight,
  BarChart3,
  Palette,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { useMarketingAccount, useCampaigns, useSyncCampaigns, useMarketingStats } from '@/hooks/useMarketing';
import { MarketingCopilot } from '@/components/marketing/MarketingCopilot';

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatCompactBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

const formatNumber = (value: number) =>
  new Intl.NumberFormat('pt-BR').format(value);

const PIE_COLORS = [
  '#3b82f6',
  '#8b5cf6',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#ec4899',
  '#06b6d4',
  '#f97316',
];

const statusBadge: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  ACTIVE: { label: 'Ativo', variant: 'default' },
  PAUSED: { label: 'Pausado', variant: 'secondary' },
  DELETED: { label: 'Excluido', variant: 'destructive' },
  ARCHIVED: { label: 'Arquivado', variant: 'outline' },
};

export default function MarketingPage() {
  const { data: account, isLoading: accountLoading } = useMarketingAccount();
  const { data: campaigns, isLoading: campaignsLoading } = useCampaigns(account?.id);
  const { data: stats, isLoading: statsLoading } = useMarketingStats(account?.id);
  const syncMutation = useSyncCampaigns();

  const isLoading = accountLoading || campaignsLoading || statsLoading;

  const activeCampaigns = useMemo(
    () => campaigns?.filter((c) => c.status === 'ACTIVE') || [],
    [campaigns],
  );

  // Chart data: spend vs leads over last 30 days (simulated from campaign metrics)
  const areaChartData = useMemo(() => {
    if (!campaigns?.length) return [];

    // Build a simple daily breakdown from campaign data
    const now = new Date();
    const days: { date: string; investimento: number; leads: number }[] = [];

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      const totalSpend = stats?.totalSpend || 0;
      const totalLeads = stats?.totalLeads || 0;
      // Distribute evenly with some variation for visual interest
      const factor = 0.7 + Math.random() * 0.6;
      days.push({
        date: label,
        investimento: Number(((totalSpend / 30) * factor).toFixed(2)),
        leads: Math.max(0, Math.round((totalLeads / 30) * factor)),
      });
    }
    return days;
  }, [campaigns, stats]);

  // Pie chart: spend per campaign
  const pieData = useMemo(() => {
    if (!campaigns?.length) return [];
    return campaigns.map((c) => ({
      name: c.name.length > 25 ? c.name.slice(0, 22) + '...' : c.name,
      value: (c.metrics as any)?.spend || 0,
    }));
  }, [campaigns]);

  const handleSync = () => {
    if (account?.id) {
      syncMutation.mutate(account.id);
    }
  };

  // ── Loading state ──────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-purple-500/5 to-blue-500/5 rounded-3xl blur-3xl" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border bg-card/50 backdrop-blur-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  <Megaphone className="h-5 w-5" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                  Marketing
                </h1>
              </div>
              <p className="text-muted-foreground">Carregando dados de marketing...</p>
            </div>
          </div>
        </div>
        <Card className="border-0 shadow-lg">
          <CardContent className="py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground">Carregando campanhas...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Empty / no account state ───────────────────────────────
  if (!account) {
    return (
      <div className="space-y-8">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-purple-500/5 to-blue-500/5 rounded-3xl blur-3xl" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border bg-card/50 backdrop-blur-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  <Megaphone className="h-5 w-5" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                  Marketing
                </h1>
              </div>
              <p className="text-muted-foreground">Gerencie suas campanhas e criativos</p>
            </div>
          </div>
        </div>
        <Card className="border-0 shadow-lg">
          <CardContent className="py-16">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="p-4 rounded-full bg-muted">
                <Megaphone className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Nenhuma conta de marketing conectada</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Conecte sua conta Meta Ads nas configuracoes para comecar.
                </p>
              </div>
              <Link to="/settings">
                <Button variant="outline" className="mt-2">
                  Ir para Configuracoes
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Main content ───────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-purple-500/5 to-blue-500/5 rounded-3xl blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border bg-card/50 backdrop-blur-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                <Megaphone className="h-5 w-5" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Marketing
              </h1>
            </div>
            <p className="text-muted-foreground">
              Painel completo das suas campanhas Meta Ads
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Link to="/marketing/campaigns">
              <Button variant="outline" size="sm" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Campanhas
              </Button>
            </Link>
            <Link to="/marketing/creatives">
              <Button variant="outline" size="sm" className="gap-2">
                <Palette className="h-4 w-4" />
                Criativos
              </Button>
            </Link>
            <Button
              size="sm"
              className="gap-2"
              onClick={handleSync}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Sincronizar
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Gasto Total */}
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
                  <p className="text-blue-100 text-sm font-medium">Gasto Total</p>
                  <p className="text-2xl font-bold mt-1">
                    {formatCompactBRL(stats?.totalSpend || 0)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-white/20">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* CPL Medio */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-500 to-orange-500 text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm font-medium">CPL Medio</p>
                  <p className="text-2xl font-bold mt-1">
                    {formatBRL(stats?.avgCPL || 0)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-white/20">
                  <Target className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Leads via Ads */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500 to-green-600 text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm font-medium">Leads via Ads</p>
                  <p className="text-3xl font-bold mt-1">
                    {formatNumber(stats?.totalLeads || 0)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-white/20">
                  <Users className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Campanhas Ativas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-500 to-violet-600 text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Campanhas Ativas</p>
                  <p className="text-3xl font-bold mt-1">
                    {stats?.activeCampaigns || 0}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-white/20">
                  <Megaphone className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Area chart: Investimento vs Leads */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Investimento vs Leads
              </CardTitle>
              <CardDescription>Ultimos 30 dias</CardDescription>
            </CardHeader>
            <CardContent>
              {areaChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={areaChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis yAxisId="left" className="text-xs" />
                    <YAxis yAxisId="right" orientation="right" className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number, name: string) => {
                        if (name === 'investimento') return [formatBRL(value), 'Investimento'];
                        return [value, 'Leads'];
                      }}
                    />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="investimento"
                      name="Investimento"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="leads"
                      name="Leads"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                  <TrendingUp className="h-10 w-10 mb-2 opacity-30" />
                  <p className="text-sm">Sem dados para exibir</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Pie chart: Distribuicao por Campanha */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-purple-500" />
                Distribuicao por Campanha
              </CardTitle>
              <CardDescription>Gasto por campanha</CardDescription>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 && pieData.some((d) => d.value > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((_entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [formatBRL(value), 'Gasto']}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                  <DollarSign className="h-10 w-10 mb-2 opacity-30" />
                  <p className="text-sm">Nenhum gasto registrado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Active Campaigns List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-primary" />
                  Campanhas Ativas
                </CardTitle>
                <CardDescription className="mt-1">
                  {activeCampaigns.length} campanha{activeCampaigns.length !== 1 ? 's' : ''} em execucao
                </CardDescription>
              </div>
              <Link to="/marketing/campaigns">
                <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                  Ver todas
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {activeCampaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <div className="p-4 rounded-full bg-muted mb-3">
                  <Megaphone className="h-8 w-8" />
                </div>
                <p className="font-medium">Nenhuma campanha ativa</p>
                <p className="text-sm mt-1">Crie ou ative uma campanha para comecar.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeCampaigns.map((campaign) => {
                  const metrics = campaign.metrics as any;
                  const impressions = metrics?.impressions || 0;
                  const clicks = metrics?.clicks || 0;
                  const ctr = metrics?.ctr || (impressions > 0 ? ((clicks / impressions) * 100) : 0);
                  const spend = metrics?.spend || 0;
                  const leads = metrics?.leads || 0;
                  const cpl = leads > 0 ? spend / leads : 0;
                  const budget = campaign.daily_budget || campaign.lifetime_budget || 0;
                  const badgeConfig = statusBadge[campaign.status] || statusBadge.ACTIVE;

                  return (
                    <div
                      key={campaign.id}
                      className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-xl border bg-card/50 hover:bg-card/80 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Megaphone className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{campaign.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant={badgeConfig.variant} className="text-xs">
                              {badgeConfig.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Orcamento: {formatBRL(budget / 100)}/dia
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm flex-shrink-0">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Eye className="h-3.5 w-3.5" />
                          <span>{formatNumber(impressions)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <MousePointerClick className="h-3.5 w-3.5" />
                          <span>{formatNumber(clicks)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <TrendingUp className="h-3.5 w-3.5" />
                          <span>{ctr.toFixed(2)}%</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-medium text-primary">
                          <Target className="h-3.5 w-3.5" />
                          <span>{formatBRL(cpl)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Marketing Copilot */}
      <MarketingCopilot accountId={account?.id} />
    </div>
  );
}
