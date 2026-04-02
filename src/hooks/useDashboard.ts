import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, startOfDay, startOfMonth, endOfMonth, format } from 'date-fns';

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export interface DashboardStats {
  totalLeads: number;
  leadsThisMonth: number;
  conversionRate: number;
  avgDealValue: number;
  avgTimeInFunnel: number;
  totalRevenue: number;
}

export interface LeadsByStatus {
  status: string;
  count: number;
}

export interface LeadsBySource {
  source: string;
  count: number;
  won: number;
  revenue: number;
}

export interface LeadsByDay {
  date: string;
  count: number;
  won: number;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30);
      
      // Total leads
      const { count: totalLeads } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true });

      // Leads this month
      const { count: leadsThisMonth } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Won leads and revenue
      const { data: wonLeads } = await supabase
        .from('leads')
        .select('deal_value, entered_at, closed_at')
        .eq('status', 'won');

      const totalWon = wonLeads?.length || 0;
      const totalRevenue = wonLeads?.reduce((sum, l) => sum + (l.deal_value || 0), 0) || 0;
      const avgDealValue = totalWon > 0 ? totalRevenue / totalWon : 0;

      // Conversion rate
      const conversionRate = totalLeads ? (totalWon / totalLeads) * 100 : 0;

      // Average time in funnel (days)
      const avgTimeInFunnel = wonLeads?.length
        ? wonLeads.reduce((sum, l) => {
            if (l.entered_at && l.closed_at) {
              const days = (new Date(l.closed_at).getTime() - new Date(l.entered_at).getTime()) / (1000 * 60 * 60 * 24);
              return sum + days;
            }
            return sum;
          }, 0) / wonLeads.length
        : 0;

      return {
        totalLeads: totalLeads || 0,
        leadsThisMonth: leadsThisMonth || 0,
        conversionRate: Math.round(conversionRate * 10) / 10,
        avgDealValue: Math.round(avgDealValue),
        avgTimeInFunnel: Math.round(avgTimeInFunnel * 10) / 10,
        totalRevenue,
      } as DashboardStats;
    },
  });
}

export function useLeadsByStatus() {
  return useQuery({
    queryKey: ['leads-by-status'],
    queryFn: async () => {
      const { data } = await supabase
        .from('leads')
        .select('status');

      const statusCounts: Record<string, number> = {};
      data?.forEach((lead) => {
        statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
      });

      return Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
      })) as LeadsByStatus[];
    },
  });
}

export function useLeadsBySource() {
  return useQuery({
    queryKey: ['leads-by-source'],
    queryFn: async () => {
      const { data } = await supabase
        .from('leads')
        .select('utm_source, status, deal_value');

      const sourceData: Record<string, { count: number; won: number; revenue: number }> = {};
      data?.forEach((lead) => {
        const source = lead.utm_source || 'Direto';
        if (!sourceData[source]) {
          sourceData[source] = { count: 0, won: 0, revenue: 0 };
        }
        sourceData[source].count++;
        if (lead.status === 'won') {
          sourceData[source].won++;
          sourceData[source].revenue += lead.deal_value || 0;
        }
      });

      return Object.entries(sourceData)
        .map(([source, data]) => ({ source, ...data }))
        .sort((a, b) => b.count - a.count) as LeadsBySource[];
    },
  });
}

export function useLeadsByDay(days: number = 30) {
  return useQuery({
    queryKey: ['leads-by-day', days],
    queryFn: async () => {
      const startDate = startOfDay(subDays(new Date(), days));
      
      const { data } = await supabase
        .from('leads')
        .select('created_at, status')
        .gte('created_at', startDate.toISOString());

      const dayData: Record<string, { count: number; won: number }> = {};
      
      // Initialize all days
      for (let i = 0; i <= days; i++) {
        const date = format(subDays(new Date(), days - i), 'yyyy-MM-dd');
        dayData[date] = { count: 0, won: 0 };
      }

      data?.forEach((lead) => {
        const date = format(new Date(lead.created_at), 'yyyy-MM-dd');
        if (dayData[date]) {
          dayData[date].count++;
          if (lead.status === 'won') {
            dayData[date].won++;
          }
        }
      });

      return Object.entries(dayData)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date)) as LeadsByDay[];
    },
  });
}

export function useLossReasons() {
  return useQuery({
    queryKey: ['loss-reasons'],
    queryFn: async () => {
      const { data } = await supabase
        .from('leads')
        .select('loss_reason')
        .eq('status', 'lost')
        .not('loss_reason', 'is', null);

      const reasonCounts: Record<string, number> = {};
      data?.forEach((lead) => {
        if (lead.loss_reason) {
          reasonCounts[lead.loss_reason] = (reasonCounts[lead.loss_reason] || 0) + 1;
        }
      });

      return Object.entries(reasonCounts)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count);
    },
  });
}

export function useMonthlyStats() {
  return useQuery({
    queryKey: ['monthly-stats'],
    queryFn: async () => {
      const now = new Date();
      const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

      const [
        { count: leadsThisMonth },
        { count: leadsLastMonth },
        { data: wonThis },
        { data: wonLast },
        { count: totalLeads },
      ] = await Promise.all([
        supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', startThisMonth.toISOString()),
        supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', startLastMonth.toISOString()).lte('created_at', endLastMonth.toISOString()),
        supabase.from('leads').select('deal_value').eq('status', 'won').gte('closed_at', startThisMonth.toISOString()),
        supabase.from('leads').select('deal_value').eq('status', 'won').gte('closed_at', startLastMonth.toISOString()).lte('closed_at', endLastMonth.toISOString()),
        supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', startThisMonth.toISOString()).eq('status', 'won'),
      ]);

      const revThis = wonThis?.reduce((s, l) => s + (l.deal_value || 0), 0) || 0;
      const revLast = wonLast?.reduce((s, l) => s + (l.deal_value || 0), 0) || 0;
      const dealsThis = wonThis?.length || 0;
      const dealsLast = wonLast?.length || 0;
      const lThis = leadsThisMonth || 0;
      const lLast = leadsLastMonth || 0;

      return {
        leadsThisMonth: lThis,
        leadsLastMonth: lLast,
        leadsChange: lLast > 0 ? ((lThis - lLast) / lLast) * 100 : 0,
        revenueThisMonth: revThis,
        revenueLastMonth: revLast,
        revenueChange: revLast > 0 ? ((revThis - revLast) / revLast) * 100 : 0,
        dealsThisMonth: dealsThis,
        dealsLastMonth: dealsLast,
        dealsChange: dealsLast > 0 ? ((dealsThis - dealsLast) / dealsLast) * 100 : 0,
        wonThisMonth: totalLeads || 0,
      };
    },
  });
}

export function useSellerRanking(period?: string) {
  const effectivePeriod = period ?? format(new Date(), 'yyyy-MM');
  return useQuery({
    queryKey: ['seller-ranking', effectivePeriod],
    queryFn: async () => {
      const monthStart = startOfMonth(new Date(effectivePeriod + '-02'));
      const monthEnd = endOfMonth(monthStart);
      const { data: wonLeads } = await supabase
        .from('leads')
        .select('assigned_to, deal_value')
        .eq('status', 'won')
        .not('assigned_to', 'is', null)
        .gte('closed_at', monthStart.toISOString())
        .lte('closed_at', monthEnd.toISOString());

      if (!wonLeads?.length) return [];

      const userIds = [...new Set(wonLeads.map((l) => l.assigned_to!))] as string[];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const profileMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p.full_name]));

      const agg: Record<string, { name: string; deals: number; revenue: number }> = {};
      wonLeads.forEach((lead) => {
        const uid = lead.assigned_to!;
        if (!agg[uid]) agg[uid] = { name: profileMap[uid] || 'Sem nome', deals: 0, revenue: 0 };
        agg[uid].deals++;
        agg[uid].revenue += lead.deal_value || 0;
      });

      return Object.entries(agg)
        .map(([id, d]) => ({ id, ...d }))
        .sort((a, b) => b.revenue - a.revenue);
    },
  });
}

export function useRevenueByMonth(months: number = 6) {
  return useQuery({
    queryKey: ['revenue-by-month', months],
    queryFn: async () => {
      const start = new Date();
      start.setMonth(start.getMonth() - months + 1);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from('leads')
        .select('deal_value, closed_at')
        .eq('status', 'won')
        .gte('closed_at', start.toISOString())
        .not('closed_at', 'is', null);

      const monthData: Record<string, number> = {};
      for (let i = 0; i < months; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - (months - 1) + i);
        monthData[format(d, 'yyyy-MM')] = 0;
      }

      data?.forEach((lead) => {
        if (lead.closed_at) {
          const key = format(new Date(lead.closed_at), 'yyyy-MM');
          if (key in monthData) monthData[key] += lead.deal_value || 0;
        }
      });

      return Object.entries(monthData).map(([key, revenue]) => {
        const [year, month] = key.split('-');
        return { month: `${MONTHS_PT[parseInt(month) - 1]}/${year.slice(2)}`, revenue };
      });
    },
  });
}

export function useMarketingDashboard() {
  return useQuery({
    queryKey: ['marketing-dashboard'],
    queryFn: async () => {
      const { data: campaigns } = await supabase
        .from('marketing_campaigns')
        .select('name, status, metrics');

      let totalSpend = 0;
      let totalImpressions = 0;
      let totalClicks = 0;
      const activeCampaigns = campaigns?.filter((c) => c.status === 'ACTIVE').length || 0;

      campaigns?.forEach((c) => {
        const m = c.metrics as Record<string, string> | null;
        if (m) {
          totalSpend += parseFloat(String(m.spend || 0));
          totalImpressions += parseInt(String(m.impressions || 0));
          totalClicks += parseInt(String(m.clicks || 0));
        }
      });

      const { count: leadsFromAds } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .not('utm_source', 'is', null);

      const { data: leadsBySource } = await supabase
        .from('leads')
        .select('utm_source')
        .not('utm_source', 'is', null);

      const sourceCount: Record<string, number> = {};
      leadsBySource?.forEach((l) => {
        const s = l.utm_source || 'Outros';
        sourceCount[s] = (sourceCount[s] || 0) + 1;
      });
      const sourceChartData = Object.entries(sourceCount)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);

      const lfa = leadsFromAds || 0;
      return {
        activeCampaigns,
        totalCampaigns: campaigns?.length || 0,
        totalSpend,
        totalImpressions,
        totalClicks,
        leadsFromAds: lfa,
        cpl: lfa > 0 && totalSpend > 0 ? totalSpend / lfa : 0,
        ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
        sourceChartData,
        campaigns: campaigns || [],
      };
    },
  });
}