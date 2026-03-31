import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Megaphone,
  Plus,
  RefreshCw,
  LayoutList,
  Sparkles,
} from 'lucide-react';
import { motion } from 'framer-motion';

import {
  useMarketingAccount,
  useCampaigns,
  useAllAdSets,
  useAds,
  useSyncCampaigns,
  useUpdateCampaignStatus,
} from '@/hooks/useMarketing';
import type { CampaignStatus, MarketingAd } from '@/types/marketing';

import { CampaignTree } from '@/components/marketing/CampaignTree';
import { CampaignCreateModal } from '@/components/marketing/CampaignCreateModal';

// ── Ads aggregator hook ─────────────────────────────────
// Fetches ads for every adset and groups them by adset id.
function useAdsForAdsets(adsetIds: string[]) {
  const queries = adsetIds.map((id) => ({
    id,
    // eslint-disable-next-line react-hooks/rules-of-hooks
    query: useAds(id),
  }));

  const adsByAdset: Record<string, MarketingAd[]> = {};
  let isLoading = false;

  for (const { id, query } of queries) {
    if (query.isLoading) isLoading = true;
    adsByAdset[id] = query.data ?? [];
  }

  return { adsByAdset, isLoading };
}

// ── Page ────────────────────────────────────────────────

export default function MarketingCampaignsPage() {
  const [createOpen, setCreateOpen] = useState(false);

  // Data fetching
  const { data: account, isLoading: accountLoading } = useMarketingAccount();
  const accountId = account?.account_id;

  const { data: campaigns, isLoading: campaignsLoading } = useCampaigns(accountId);
  const { data: allAdSets, isLoading: adsetsLoading } = useAllAdSets(accountId);

  const adsetIds = useMemo(() => (allAdSets ?? []).map((a) => a.id), [allAdSets]);
  const { adsByAdset, isLoading: adsLoading } = useAdsForAdsets(adsetIds);

  // Group adsets by campaign
  const adsetsByCampaign = useMemo(() => {
    const map: Record<string, typeof allAdSets> = {};
    for (const adset of allAdSets ?? []) {
      if (!map[adset.campaign_id]) map[adset.campaign_id] = [];
      map[adset.campaign_id]!.push(adset);
    }
    return map;
  }, [allAdSets]);

  // Mutations
  const syncCampaigns = useSyncCampaigns();
  const updateStatus = useUpdateCampaignStatus();

  const handleToggleStatus = (
    type: 'campaign' | 'adset' | 'ad',
    id: string,
    newStatus: CampaignStatus,
  ) => {
    updateStatus.mutate({ type, id, status: newStatus });
  };

  const handleSync = () => {
    if (accountId) syncCampaigns.mutate(accountId);
  };

  const isLoading = accountLoading || campaignsLoading || adsetsLoading || adsLoading;
  const hasCampaigns = campaigns && campaigns.length > 0;

  // ── Render ──────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-purple-500/5 to-blue-500/5 rounded-3xl blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border bg-card/50 backdrop-blur-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-blue-600 text-white">
                <Megaphone className="h-5 w-5" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Campanhas
              </h1>
            </div>
            <p className="text-muted-foreground">
              Gerencie suas campanhas, conjuntos e anuncios da Meta Ads
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncCampaigns.isPending || !accountId}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${syncCampaigns.isPending ? 'animate-spin' : ''}`}
              />
              {syncCampaigns.isPending ? 'Sincronizando...' : 'Sincronizar'}
            </Button>

            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              disabled={!accountId}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Campanha
            </Button>

            <Badge
              variant="outline"
              className="px-3 py-1.5 text-sm font-medium border-primary/30 bg-primary/5"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary" />
              Meta Ads
            </Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingState />
      ) : !accountId ? (
        <EmptyState
          icon={<Megaphone className="h-8 w-8 text-muted-foreground" />}
          title="Nenhuma conta conectada"
          description="Conecte sua conta Meta Ads nas configuracoes para gerenciar campanhas."
        />
      ) : !hasCampaigns ? (
        <EmptyState
          icon={<LayoutList className="h-8 w-8 text-muted-foreground" />}
          title="Nenhuma campanha encontrada"
          description="Crie sua primeira campanha ou sincronize dados da Meta Ads."
        />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <CampaignTree
            campaigns={campaigns}
            adsetsByCampaign={adsetsByCampaign as any}
            adsByAdset={adsByAdset}
            onToggleStatus={handleToggleStatus}
            isUpdating={updateStatus.isPending}
          />
        </motion.div>
      )}

      {/* Create Modal */}
      {accountId && (
        <CampaignCreateModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          accountId={accountId}
        />
      )}

      {/* Marketing Copilot placeholder — import when component is created */}
      {/* <MarketingCopilot /> */}
    </div>
  );
}

// ── Loading State ─────────────────────────────────────────

function LoadingState() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="border-0 shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Empty State ──────────────────────────────────────────

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="py-16">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="p-4 rounded-full bg-muted">{icon}</div>
          <div>
            <p className="font-medium">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
