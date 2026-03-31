import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from '../KpiCard';
import { useMarketingDashboard, useLeadsBySource } from '@/hooks/useDashboard';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { Megaphone, DollarSign, Users, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const FMT = new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', notation: 'compact', maximumFractionDigits: 1 });
const fmt = (v: number) => FMT.format(v);

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
};

const PIE_COLORS = [
  'hsl(var(--primary))',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
];

export function MarketingTab() {
  const { data: mkt } = useMarketingDashboard();
  const { data: bySource } = useLeadsBySource();

  const conversionBySource = bySource
    ?.filter((s) => s.count > 0)
    .map((s) => ({
      ...s,
      convRate: s.count > 0 ? Math.round((s.won / s.count) * 100) : 0,
    }))
    .slice(0, 8) || [];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          featured
          title="Campanhas Ativas"
          value={mkt?.activeCampaigns || 0}
          subtitle={`${mkt?.totalCampaigns || 0} campanhas no total`}
          icon={<Megaphone className="h-4 w-4" />}
        />
        <KpiCard
          title="Gasto em Anúncios"
          value={fmt(mkt?.totalSpend || 0)}
          subtitle="Meta Ads (total sincronizado)"
          icon={<DollarSign className="h-4 w-4" />}
        />
        <KpiCard
          title="Leads Rastreados"
          value={mkt?.leadsFromAds || 0}
          subtitle="Com UTM source definido"
          icon={<Users className="h-4 w-4" />}
        />
        <KpiCard
          title="CPL"
          value={mkt?.cpl ? fmt(mkt.cpl) : '—'}
          subtitle="Custo por lead (ads / leads)"
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Leads por Origem</CardTitle>
            <CardDescription>Distribuição por canal de aquisição</CardDescription>
          </CardHeader>
          <CardContent>
            {!mkt?.sourceChartData?.length ? (
              <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
                Nenhum dado de UTM registrado ainda
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={mkt.sourceChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {mkt.sourceChartData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [v, 'Leads']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Taxa de Conversão por Canal</CardTitle>
            <CardDescription>% de leads fechados por origem</CardDescription>
          </CardHeader>
          <CardContent>
            {!conversionBySource.length ? (
              <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
                Nenhum dado disponível ainda
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={conversionBySource} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" domain={[0, 100]} className="text-xs" tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="source" className="text-xs" width={90} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v}%`, 'Conversão']} />
                  <Bar dataKey="convRate" name="Taxa" fill="hsl(var(--primary))" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Campaign table */}
      {(mkt?.campaigns?.length || 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Campanhas Meta Ads</CardTitle>
            <CardDescription>Performance das campanhas sincronizadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 pr-4 font-medium">Campanha</th>
                    <th className="text-right py-2 pr-4 font-medium">Status</th>
                    <th className="text-right py-2 pr-4 font-medium">Gasto</th>
                    <th className="text-right py-2 pr-4 font-medium">Impressões</th>
                    <th className="text-right py-2 font-medium">Cliques</th>
                  </tr>
                </thead>
                <tbody>
                  {mkt!.campaigns.slice(0, 10).map((c, idx) => {
                    const m = c.metrics as Record<string, string> | null;
                    return (
                      <tr key={idx} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2 pr-4 font-medium truncate max-w-[200px]">{c.name}</td>
                        <td className="py-2 pr-4 text-right">
                          <Badge variant={c.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">
                            {c.status === 'ACTIVE' ? 'Ativa' : c.status === 'PAUSED' ? 'Pausada' : c.status}
                          </Badge>
                        </td>
                        <td className="py-2 pr-4 text-right">{fmt(parseFloat(String(m?.spend || 0)))}</td>
                        <td className="py-2 pr-4 text-right">{parseInt(String(m?.impressions || 0)).toLocaleString('pt-AO')}</td>
                        <td className="py-2 text-right">{parseInt(String(m?.clicks || 0)).toLocaleString('pt-AO')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {!(mkt?.campaigns?.length) && (
        <Card>
          <CardContent className="py-10 text-center">
            <Megaphone className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium">Nenhuma campanha sincronizada</p>
            <p className="text-xs text-muted-foreground mt-1">
              Conecte sua conta Meta Ads em Configurações &gt; Integrações
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
