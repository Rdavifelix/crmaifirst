import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  ChevronRight,
  Play,
  Pause,
  TrendingUp,
  MousePointerClick,
  Eye,
  DollarSign,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AD_STATUSES } from '@/lib/marketing-constants';
import type {
  MarketingCampaign,
  MarketingAdSet,
  MarketingAd,
  CampaignStatus,
  CampaignMetrics,
} from '@/types/marketing';

// ── Helpers ─────────────────────────────────────────────

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatNumber = (value: number) =>
  new Intl.NumberFormat('pt-BR').format(value);

const formatPercent = (value: number) =>
  `${value.toFixed(2)}%`;

function StatusBadge({ status }: { status: CampaignStatus }) {
  const config = AD_STATUSES[status] ?? AD_STATUSES.PAUSED;
  return (
    <Badge
      variant="outline"
      className={`text-white border-0 text-[10px] px-2 py-0.5 ${config.color}`}
    >
      {config.label}
    </Badge>
  );
}

function MetricsRow({ metrics }: { metrics?: CampaignMetrics }) {
  if (!metrics) return null;

  const items = [
    { icon: Eye, label: 'Impr.', value: formatNumber(metrics.impressions ?? 0) },
    { icon: MousePointerClick, label: 'Cliques', value: formatNumber(metrics.clicks ?? 0) },
    { icon: TrendingUp, label: 'CTR', value: formatPercent(metrics.ctr ?? 0) },
    { icon: DollarSign, label: 'CPC', value: formatBRL(metrics.cpc ?? 0) },
    { icon: DollarSign, label: 'CPL', value: formatBRL(metrics.cpl ?? 0) },
  ];

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
      {items.map((item) => (
        <span
          key={item.label}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground"
        >
          <item.icon className="h-3 w-3" />
          <span className="font-medium">{item.label}:</span>
          <span>{item.value}</span>
        </span>
      ))}
    </div>
  );
}

// ── Props ───────────────────────────────────────────────

interface CampaignTreeProps {
  campaigns: MarketingCampaign[];
  adsetsByCampaign: Record<string, MarketingAdSet[]>;
  adsByAdset: Record<string, MarketingAd[]>;
  onToggleStatus: (type: 'campaign' | 'adset' | 'ad', id: string, newStatus: CampaignStatus) => void;
  isUpdating?: boolean;
}

// ── Ad Card ─────────────────────────────────────────────

function AdCard({
  ad,
  onToggleStatus,
  isUpdating,
}: {
  ad: MarketingAd;
  onToggleStatus: CampaignTreeProps['onToggleStatus'];
  isUpdating?: boolean;
}) {
  const nextStatus: CampaignStatus = ad.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{ad.name}</span>
          <StatusBadge status={ad.status} />
        </div>
        <MetricsRow metrics={ad.metrics} />
      </div>

      {(ad.status === 'ACTIVE' || ad.status === 'PAUSED') && (
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0"
          disabled={isUpdating}
          onClick={() => onToggleStatus('ad', ad.id, nextStatus)}
          title={nextStatus === 'ACTIVE' ? 'Ativar' : 'Pausar'}
        >
          {ad.status === 'ACTIVE' ? (
            <Pause className="h-4 w-4 text-yellow-500" />
          ) : (
            <Play className="h-4 w-4 text-green-500" />
          )}
        </Button>
      )}
    </div>
  );
}

// ── AdSet Card ──────────────────────────────────────────

function AdSetCard({
  adset,
  ads,
  onToggleStatus,
  isUpdating,
}: {
  adset: MarketingAdSet;
  ads: MarketingAd[];
  onToggleStatus: CampaignTreeProps['onToggleStatus'];
  isUpdating?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const nextStatus: CampaignStatus = adset.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';

  return (
    <Card className="border-border/60 bg-card/60">
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold">{adset.name}</span>
              <StatusBadge status={adset.status} />
              {adset.daily_budget && (
                <span className="text-xs text-muted-foreground">
                  {formatBRL(adset.daily_budget / 100)}/dia
                </span>
              )}
            </div>
            <MetricsRow metrics={adset.metrics} />
          </div>

          {(adset.status === 'ACTIVE' || adset.status === 'PAUSED') && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0"
              disabled={isUpdating}
              onClick={() => onToggleStatus('adset', adset.id, nextStatus)}
              title={nextStatus === 'ACTIVE' ? 'Ativar' : 'Pausar'}
            >
              {adset.status === 'ACTIVE' ? (
                <Pause className="h-4 w-4 text-yellow-500" />
              ) : (
                <Play className="h-4 w-4 text-green-500" />
              )}
            </Button>
          )}
        </div>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="adset-ads"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-2 pl-9">
                {ads.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    Nenhum anuncio neste conjunto
                  </p>
                ) : (
                  ads.map((ad) => (
                    <AdCard
                      key={ad.id}
                      ad={ad}
                      onToggleStatus={onToggleStatus}
                      isUpdating={isUpdating}
                    />
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

// ── Campaign Card ───────────────────────────────────────

function CampaignCard({
  campaign,
  adsets,
  adsByAdset,
  onToggleStatus,
  isUpdating,
}: {
  campaign: MarketingCampaign;
  adsets: MarketingAdSet[];
  adsByAdset: Record<string, MarketingAd[]>;
  onToggleStatus: CampaignTreeProps['onToggleStatus'];
  isUpdating?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const nextStatus: CampaignStatus = campaign.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';

  return (
    <Card className="border-border/80 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="truncate text-base font-bold">{campaign.name}</span>
              <StatusBadge status={campaign.status} />
              {campaign.daily_budget && (
                <span className="text-xs text-muted-foreground">
                  {formatBRL(campaign.daily_budget / 100)}/dia
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {adsets.length} conjunto{adsets.length !== 1 ? 's' : ''}
              </span>
            </div>
            <MetricsRow metrics={campaign.metrics} />
          </div>

          {(campaign.status === 'ACTIVE' || campaign.status === 'PAUSED') && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0"
              disabled={isUpdating}
              onClick={() => onToggleStatus('campaign', campaign.id, nextStatus)}
              title={nextStatus === 'ACTIVE' ? 'Ativar' : 'Pausar'}
            >
              {campaign.status === 'ACTIVE' ? (
                <Pause className="h-4 w-4 text-yellow-500" />
              ) : (
                <Play className="h-4 w-4 text-green-500" />
              )}
            </Button>
          )}
        </div>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="campaign-adsets"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="mt-4 space-y-3 pl-10">
                {adsets.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    Nenhum conjunto de anuncios nesta campanha
                  </p>
                ) : (
                  adsets.map((adset) => (
                    <AdSetCard
                      key={adset.id}
                      adset={adset}
                      ads={adsByAdset[adset.id] ?? []}
                      onToggleStatus={onToggleStatus}
                      isUpdating={isUpdating}
                    />
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

// ── Main Tree ───────────────────────────────────────────

export function CampaignTree({
  campaigns,
  adsetsByCampaign,
  adsByAdset,
  onToggleStatus,
  isUpdating,
}: CampaignTreeProps) {
  return (
    <div className="space-y-4">
      {campaigns.map((campaign) => (
        <CampaignCard
          key={campaign.id}
          campaign={campaign}
          adsets={adsetsByCampaign[campaign.id] ?? []}
          adsByAdset={adsByAdset}
          onToggleStatus={onToggleStatus}
          isUpdating={isUpdating}
        />
      ))}
    </div>
  );
}
