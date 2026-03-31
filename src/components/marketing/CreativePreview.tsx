import { useUploadImage } from '@/hooks/useMarketing';
import type { MarketingCreative } from '@/types/marketing';
import { CREATIVE_ANGLES, CTA_OPTIONS } from '@/lib/marketing-constants';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, ImageIcon, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface CreativePreviewProps {
  creative: MarketingCreative | null;
  open: boolean;
  onClose: () => void;
  accountId?: string;
}

export function CreativePreview({ creative, open, onClose, accountId }: CreativePreviewProps) {
  const uploadImage = useUploadImage();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!creative) return null;

  const angleConfig = CREATIVE_ANGLES.find((a) => a.value === creative.angle);
  const ctaConfig = CTA_OPTIONS.find((c) => c.value === creative.cta);

  const handleUploadToMeta = async () => {
    if (!accountId || !creative.image_url) return;

    try {
      await uploadImage.mutateAsync({
        accountId,
        imageUrl: creative.image_url,
      });
    } catch {
      // Error is handled by the mutation's onError
    }
  };

  const handleCopy = (field: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-violet-500" />
            Detalhes do Criativo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Image */}
          {creative.image_url ? (
            <div className="relative rounded-xl overflow-hidden border border-muted bg-muted/30">
              <img
                src={creative.image_url}
                alt={creative.headline || 'Criativo'}
                className="w-full h-auto object-contain"
              />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <ImageIcon className="h-10 w-10" />
                <p className="text-sm">Imagem nao disponivel</p>
              </div>
            </div>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {angleConfig && (
              <Badge className="bg-violet-500/90 text-white border-0">
                {angleConfig.emoji} {angleConfig.label}
              </Badge>
            )}
            <Badge variant="secondary">
              {creative.format}
            </Badge>
            {ctaConfig && (
              <Badge variant="outline" className="border-blue-500/30 text-blue-600 bg-blue-500/5">
                {ctaConfig.label}
              </Badge>
            )}
            {creative.meta_image_id && (
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/5">
                Enviado para Meta
              </Badge>
            )}
          </div>

          {/* Copy Fields */}
          <div className="space-y-4">
            {creative.headline && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Headline
                  </Label>
                  <button
                    onClick={() => handleCopy('headline', creative.headline!)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {copiedField === 'headline' ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                <p className="text-sm font-semibold bg-muted/30 rounded-lg p-3 border">
                  {creative.headline}
                </p>
              </div>
            )}

            {creative.primary_text && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Texto Principal
                  </Label>
                  <button
                    onClick={() => handleCopy('primary_text', creative.primary_text!)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {copiedField === 'primary_text' ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                <p className="text-sm bg-muted/30 rounded-lg p-3 border leading-relaxed">
                  {creative.primary_text}
                </p>
              </div>
            )}

            {creative.description && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Descricao
                  </Label>
                  <button
                    onClick={() => handleCopy('description', creative.description!)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {copiedField === 'description' ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 border">
                  {creative.description}
                </p>
              </div>
            )}
          </div>

          {/* Upload to Meta Button */}
          <Button
            onClick={handleUploadToMeta}
            disabled={!accountId || !creative.image_url || uploadImage.isPending || !!creative.meta_image_id}
            className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold"
          >
            {uploadImage.isPending ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Enviando para Meta...
              </>
            ) : creative.meta_image_id ? (
              <>
                <Check className="h-5 w-5 mr-2" />
                Ja enviado para Meta
              </>
            ) : (
              <>
                <Upload className="h-5 w-5 mr-2" />
                Enviar para Meta
              </>
            )}
          </Button>

          {!accountId && (
            <p className="text-xs text-center text-amber-600">
              Conecte uma conta Meta nas configuracoes para enviar imagens
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
