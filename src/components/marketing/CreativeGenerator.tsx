import { useState, useEffect } from 'react';
import { CREATIVE_ANGLES, CREATIVE_FORMATS, COPY_TEMPLATES, CTA_OPTIONS } from '@/lib/marketing-constants';
import { useGenerateCreative } from '@/hooks/useMarketing';
import type { CreativeAngle, CreativeFormat } from '@/types/marketing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Wand2, Image as ImageIcon } from 'lucide-react';

interface CreativeGeneratorProps {
  accountId?: string;
}

export function CreativeGenerator({ accountId }: CreativeGeneratorProps) {
  const [angle, setAngle] = useState<CreativeAngle | ''>('');
  const [format, setFormat] = useState<CreativeFormat>('1:1');
  const [headline, setHeadline] = useState('');
  const [primaryText, setPrimaryText] = useState('');
  const [description, setDescription] = useState('');
  const [cta, setCta] = useState('LEARN_MORE');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  const generateCreative = useGenerateCreative();

  // Auto-fill copy when angle changes
  useEffect(() => {
    if (angle && angle in COPY_TEMPLATES) {
      const template = COPY_TEMPLATES[angle as keyof typeof COPY_TEMPLATES];
      setHeadline(template.headline);
      setPrimaryText(template.primary_text);
      setDescription(template.description);
    }
  }, [angle]);

  const handleGenerate = async () => {
    if (!angle || !format) return;

    const selectedAngle = CREATIVE_ANGLES.find((a) => a.value === angle);
    const prompt = `Criativo para anuncio Meta Ads. Angulo: ${selectedAngle?.label} - ${selectedAngle?.description}. Headline: ${headline}. Dica visual: ${selectedAngle?.promptHint}`;

    try {
      const result = await generateCreative.mutateAsync({
        prompt,
        format: format as CreativeFormat,
        angle: angle as CreativeAngle,
        headline,
        primary_text: primaryText,
        account_id: accountId,
      });

      if (result?.image_url) {
        setGeneratedImageUrl(result.image_url);
      }
    } catch {
      // Error is handled by the mutation's onError
    }
  };

  const canGenerate = angle && format && headline && primaryText;

  return (
    <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wand2 className="h-5 w-5 text-violet-500" />
          Gerar Criativo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Angle Selector */}
        <div className="space-y-2">
          <Label htmlFor="angle">Angulo do criativo</Label>
          <Select value={angle} onValueChange={(v) => setAngle(v as CreativeAngle)}>
            <SelectTrigger id="angle" className="h-11 bg-background/50 border-muted-foreground/20">
              <SelectValue placeholder="Escolha o angulo..." />
            </SelectTrigger>
            <SelectContent>
              {CREATIVE_ANGLES.map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  <span className="flex items-center gap-2">
                    <span>{a.emoji}</span>
                    <span>{a.label}</span>
                    <span className="text-muted-foreground text-xs">- {a.description}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Format Selector */}
        <div className="space-y-2">
          <Label htmlFor="format">Formato</Label>
          <Select value={format} onValueChange={(v) => setFormat(v as CreativeFormat)}>
            <SelectTrigger id="format" className="h-11 bg-background/50 border-muted-foreground/20">
              <SelectValue placeholder="Escolha o formato..." />
            </SelectTrigger>
            <SelectContent>
              {CREATIVE_FORMATS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label} ({f.width}x{f.height})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* CTA Selector */}
        <div className="space-y-2">
          <Label htmlFor="cta">Call to Action</Label>
          <Select value={cta} onValueChange={setCta}>
            <SelectTrigger id="cta" className="h-11 bg-background/50 border-muted-foreground/20">
              <SelectValue placeholder="Escolha o CTA..." />
            </SelectTrigger>
            <SelectContent>
              {CTA_OPTIONS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Headline */}
        <div className="space-y-2">
          <Label htmlFor="headline">Headline</Label>
          <Input
            id="headline"
            placeholder="Titulo principal do anuncio..."
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            className="h-11 bg-background/50 border-muted-foreground/20"
          />
        </div>

        {/* Primary Text */}
        <div className="space-y-2">
          <Label htmlFor="primary-text">Texto principal</Label>
          <Textarea
            id="primary-text"
            placeholder="Texto que aparece acima da imagem..."
            value={primaryText}
            onChange={(e) => setPrimaryText(e.target.value)}
            rows={3}
            className="bg-background/50 border-muted-foreground/20 resize-none"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Descricao</Label>
          <Input
            id="description"
            placeholder="Descricao complementar..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-11 bg-background/50 border-muted-foreground/20"
          />
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={!canGenerate || generateCreative.isPending}
          className="w-full h-12 bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-600 hover:to-fuchsia-700 text-white font-semibold text-base"
        >
          {generateCreative.isPending ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Gerando criativo...
            </>
          ) : (
            <>
              <Wand2 className="h-5 w-5 mr-2" />
              Gerar Criativo
            </>
          )}
        </Button>

        {/* Generated Image Preview */}
        {generatedImageUrl && (
          <div className="space-y-2 pt-2">
            <Label className="text-sm text-muted-foreground">Criativo gerado</Label>
            <div className="relative rounded-xl overflow-hidden border border-violet-500/20 bg-muted/30">
              <img
                src={generatedImageUrl}
                alt="Criativo gerado"
                className="w-full h-auto object-contain"
              />
              <div className="absolute bottom-2 right-2">
                <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-black/60 text-white text-xs">
                  <ImageIcon className="h-3 w-3" />
                  {format}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
