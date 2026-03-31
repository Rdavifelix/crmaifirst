import { useMarketingAccount, useCreatives } from '@/hooks/useMarketing';
import { CreativeGenerator } from '@/components/marketing/CreativeGenerator';
import { CreativeGallery } from '@/components/marketing/CreativeGallery';
import { MarketingCopilot } from '@/components/marketing/MarketingCopilot';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Palette } from 'lucide-react';

export default function MarketingCreativesPage() {
  const { data: account } = useMarketingAccount();
  const { data: creatives, isLoading: loadingCreatives } = useCreatives(account?.id);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-fuchsia-500/5 to-pink-500/5 rounded-3xl blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border bg-card/50 backdrop-blur-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white">
                <Palette className="h-5 w-5" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Criativos IA
              </h1>
            </div>
            <p className="text-muted-foreground">
              Gere criativos com inteligencia artificial e envie direto para a Meta
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-3 py-1.5 text-sm font-medium border-violet-500/30 bg-violet-500/5">
              <Sparkles className="h-3.5 w-3.5 mr-1.5 text-violet-500" />
              Gerador IA
            </Badge>
            {account && (
              <Badge variant="outline" className="px-3 py-1.5 text-sm font-medium border-emerald-500/30 bg-emerald-500/5 text-emerald-600">
                {account.account_name || account.account_id}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Two-column layout: Generator + Gallery */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Creative Generator Form */}
        <div>
          <CreativeGenerator accountId={account?.id} />
        </div>

        {/* Right: Creative Gallery */}
        <div>
          <CreativeGallery
            creatives={creatives || []}
            isLoading={loadingCreatives}
            accountId={account?.id}
          />
        </div>
      </div>

      {/* Copilot at the bottom */}
      <MarketingCopilot accountId={account?.id} />
    </div>
  );
}
