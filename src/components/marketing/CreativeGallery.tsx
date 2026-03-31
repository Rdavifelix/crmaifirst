import { useState } from 'react';
import type { MarketingCreative } from '@/types/marketing';
import { CREATIVE_ANGLES } from '@/lib/marketing-constants';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ImageIcon, Loader2 } from 'lucide-react';
import { CreativePreview } from '@/components/marketing/CreativePreview';

interface CreativeGalleryProps {
  creatives: MarketingCreative[];
  isLoading?: boolean;
  accountId?: string;
}

export function CreativeGallery({ creatives, isLoading, accountId }: CreativeGalleryProps) {
  const [selectedCreative, setSelectedCreative] = useState<MarketingCreative | null>(null);

  const getAngleConfig = (angle: string | null) => {
    return CREATIVE_ANGLES.find((a) => a.value === angle) || null;
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm">
        <CardContent className="py-16">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 text-violet-500 animate-spin" />
            <p className="text-muted-foreground">Carregando criativos...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!creatives || creatives.length === 0) {
    return (
      <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm">
        <CardContent className="py-16">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="p-5 rounded-full bg-violet-500/10">
              <ImageIcon className="h-10 w-10 text-violet-500/60" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-lg">Nenhum criativo ainda</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Use o gerador ao lado para criar seus primeiros criativos com IA
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-muted-foreground">
            {creatives.length} criativo{creatives.length !== 1 ? 's' : ''} gerado{creatives.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {creatives.map((creative) => {
            const angleConfig = getAngleConfig(creative.angle);

            return (
              <Card
                key={creative.id}
                className="border-0 shadow-md bg-card/80 backdrop-blur-sm cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] hover:border-violet-500/30 overflow-hidden group"
                onClick={() => setSelectedCreative(creative)}
              >
                {/* Image Thumbnail or Placeholder */}
                <div className="relative aspect-square bg-muted/30 overflow-hidden">
                  {creative.image_url ? (
                    <img
                      src={creative.image_url}
                      alt={creative.headline || 'Criativo'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                  )}

                  {/* Badges overlay */}
                  <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
                    {angleConfig && (
                      <Badge className="bg-violet-500/90 text-white border-0 text-xs">
                        {angleConfig.emoji} {angleConfig.label}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="bg-black/50 text-white border-0 text-xs backdrop-blur-sm">
                      {creative.format}
                    </Badge>
                  </div>
                </div>

                {/* Content */}
                <CardContent className="p-3 space-y-1.5">
                  {creative.headline && (
                    <p className="font-semibold text-sm line-clamp-1">
                      {creative.headline}
                    </p>
                  )}
                  {creative.primary_text && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {creative.primary_text}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Creative Preview Modal */}
      <CreativePreview
        creative={selectedCreative}
        open={!!selectedCreative}
        onClose={() => setSelectedCreative(null)}
        accountId={accountId}
      />
    </>
  );
}
