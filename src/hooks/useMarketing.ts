import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type {
  MarketingAccount,
  MarketingCampaign,
  MarketingAdSet,
  MarketingAd,
  MarketingCreative,
  CreateCampaignRequest,
  GenerateCreativeRequest,
  CampaignStatus,
} from '@/types/marketing';

// ── Account ──────────────────────────────────────────────
export function useMarketingAccount() {
  return useQuery({
    queryKey: ['marketing-account'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_accounts')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as MarketingAccount | null;
    },
  });
}

export function useMarketingAccounts() {
  return useQuery({
    queryKey: ['marketing-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as MarketingAccount[];
    },
  });
}

export function useSaveMarketingAccount() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (account: { account_id: string; access_token: string; page_id?: string | null; page_name?: string | null; pixel_id?: string | null }) => {
      // Get current profile
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) throw new Error('Faça login novamente.');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile?.id) {
        throw new Error('Perfil não encontrado.');
      }
      const profileId = profile.id;

      // Check if account already exists
      const { data: existing, error: selectError } = await supabase
        .from('marketing_accounts')
        .select('id')
        .eq('profile_id', profileId)
        .limit(1)
        .maybeSingle();

      const payload = {
        account_id: account.account_id,
        access_token: account.access_token,
        page_id: account.page_id || null,
        page_name: account.page_name || null,
        pixel_id: account.pixel_id || null,
      };

      if (existing?.id) {
        const { data, error } = await supabase
          .from('marketing_accounts')
          .update({ ...payload, status: 'active', updated_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw new Error(error.message);
        return data;
      } else {
        const insertPayload = {
          ...payload,
          profile_id: profileId,
          platform: 'meta' as const,
          account_name: account.page_name || account.account_id,
          status: 'active',
          currency: 'BRL',
          timezone: 'America/Sao_Paulo',
        };
        const { data, error } = await supabase
          .from('marketing_accounts')
          .insert(insertPayload)
          .select()
          .single();

        if (error) throw new Error(error.message);
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-account'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-accounts'] });
      toast({ title: 'Conta Meta conectada com sucesso!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao salvar conta', description: error.message, variant: 'destructive' });
    },
  });
}

// ── Campaigns ────────────────────────────────────────────
export function useCampaigns(accountId?: string) {
  return useQuery({
    queryKey: ['marketing-campaigns', accountId],
    queryFn: async () => {
      let query = supabase
        .from('marketing_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (accountId) {
        query = query.eq('account_id', accountId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MarketingCampaign[];
    },
    enabled: !!accountId,
  });
}

// ── AdSets ───────────────────────────────────────────────
export function useAdSets(campaignId?: string) {
  return useQuery({
    queryKey: ['marketing-adsets', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_adsets')
        .select('*')
        .eq('campaign_id', campaignId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as MarketingAdSet[];
    },
    enabled: !!campaignId,
  });
}

export function useAllAdSets(accountId?: string) {
  return useQuery({
    queryKey: ['marketing-adsets-all', accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_adsets')
        .select('*, marketing_campaigns!inner(account_id)')
        .eq('marketing_campaigns.account_id', accountId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as MarketingAdSet[];
    },
    enabled: !!accountId,
  });
}

// ── Ads ──────────────────────────────────────────────────
export function useAds(adsetId?: string) {
  return useQuery({
    queryKey: ['marketing-ads', adsetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_ads')
        .select('*')
        .eq('adset_id', adsetId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as MarketingAd[];
    },
    enabled: !!adsetId,
  });
}

// ── Creatives ────────────────────────────────────────────
export function useCreatives(accountId?: string) {
  return useQuery({
    queryKey: ['marketing-creatives', accountId],
    queryFn: async () => {
      let query = supabase
        .from('marketing_creatives')
        .select('*')
        .order('created_at', { ascending: false });

      if (accountId) {
        query = query.eq('account_id', accountId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MarketingCreative[];
    },
  });
}

// ── Sync from Meta ───────────────────────────────────────
export function useSyncCampaigns() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (accountId: string) => {
      const { data, error } = await supabase.functions.invoke('meta-ads-sync', {
        body: { account_id: accountId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-adsets'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-ads'] });
      toast({ title: 'Dados sincronizados com a Meta!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao sincronizar', description: error.message, variant: 'destructive' });
    },
  });
}

// ── Create Campaign ──────────────────────────────────────
export function useCreateCampaign() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (request: CreateCampaignRequest) => {
      const { data, error } = await supabase.functions.invoke('meta-ads-create', {
        body: request,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      toast({ title: 'Campanha criada com sucesso!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao criar campanha', description: error.message, variant: 'destructive' });
    },
  });
}

// ── Update Status ────────────────────────────────────────
export function useUpdateCampaignStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ type, id, status }: { type: 'campaign' | 'adset' | 'ad'; id: string; status: CampaignStatus }) => {
      const { data, error } = await supabase.functions.invoke('meta-ads-update', {
        body: { type, id, updates: { status } },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-adsets'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-ads'] });
      const label = variables.status === 'ACTIVE' ? 'ativado' : 'pausado';
      toast({ title: `Item ${label} com sucesso!` });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar status', description: error.message, variant: 'destructive' });
    },
  });
}

// ── Generate Creative ────────────────────────────────────
export function useGenerateCreative() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (request: GenerateCreativeRequest) => {
      const { data, error } = await supabase.functions.invoke('generate-creative', {
        body: request,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-creatives'] });
      toast({ title: 'Criativo gerado com sucesso!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao gerar criativo', description: error.message, variant: 'destructive' });
    },
  });
}

// ── Upload Image to Meta ─────────────────────────────────
export function useUploadImage() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ accountId, imageUrl }: { accountId: string; imageUrl: string }) => {
      const { data, error } = await supabase.functions.invoke('meta-upload-image', {
        body: { account_id: accountId, image_url: imageUrl },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Imagem enviada para Meta!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao enviar imagem', description: error.message, variant: 'destructive' });
    },
  });
}

// ── Dashboard Stats ──────────────────────────────────────
export function useMarketingStats(accountId?: string) {
  return useQuery({
    queryKey: ['marketing-stats', accountId],
    queryFn: async () => {
      const { data: campaigns, error } = await supabase
        .from('marketing_campaigns')
        .select('metrics, status')
        .eq('account_id', accountId!);

      if (error) throw error;

      const activeCampaigns = campaigns?.filter(c => c.status === 'ACTIVE') || [];
      const allMetrics = campaigns?.map(c => c.metrics as any) || [];

      const totalSpend = allMetrics.reduce((sum, m) => sum + (m?.spend || 0), 0);
      const totalLeads = allMetrics.reduce((sum, m) => sum + (m?.leads || 0), 0);
      const totalClicks = allMetrics.reduce((sum, m) => sum + (m?.clicks || 0), 0);
      const totalImpressions = allMetrics.reduce((sum, m) => sum + (m?.impressions || 0), 0);

      return {
        totalSpend,
        totalLeads,
        totalClicks,
        totalImpressions,
        avgCPL: totalLeads > 0 ? totalSpend / totalLeads : 0,
        avgCTR: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
        activeCampaigns: activeCampaigns.length,
        totalCampaigns: campaigns?.length || 0,
      };
    },
    enabled: !!accountId,
  });
}
