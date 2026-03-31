import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTrafficChannels, useCreateUtmLink, generateWhatsAppLink } from '@/hooks/useUtmLinks';
import { UTM_MEDIUMS, CHANNEL_CATEGORIES } from '@/lib/constants';
import { Copy, Check, QrCode, ExternalLink, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UtmLinksList } from './UtmLinksList';

export function UtmGenerator() {
  const { data: channels } = useTrafficChannels();
  const createLink = useCreateUtmLink();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    channel_id: '',
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    utm_term: '',
    utm_content: '',
    whatsapp_number: '',
    whatsapp_message: 'Olá! Vi o seu conteúdo e gostaria de saber mais.',
  });

  const [generatedLink, setGeneratedLink] = useState<{
    whatsappUrl: string;
    trackingUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const groupedChannels = channels?.reduce((acc, channel) => {
    if (!acc[channel.category]) {
      acc[channel.category] = [];
    }
    acc[channel.category].push(channel);
    return acc;
  }, {} as Record<string, typeof channels>);

  const handleChannelSelect = (channelId: string) => {
    const channel = channels?.find(c => c.id === channelId);
    if (channel) {
      setFormData(prev => ({
        ...prev,
        channel_id: channelId,
        utm_source: channel.name.toLowerCase().replace(/\s+/g, '_'),
      }));
    }
  };

  const handleGenerate = async () => {
    if (!formData.utm_source || !formData.utm_medium || !formData.utm_campaign || !formData.whatsapp_number) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha source, medium, campaign e número do WhatsApp.',
        variant: 'destructive',
      });
      return;
    }

    const links = generateWhatsAppLink(
      formData.whatsapp_number,
      formData.whatsapp_message,
      {
        utm_source: formData.utm_source,
        utm_medium: formData.utm_medium,
        utm_campaign: formData.utm_campaign,
        utm_term: formData.utm_term || undefined,
        utm_content: formData.utm_content || undefined,
      }
    );

    setGeneratedLink(links);

    // Salvar no banco
    await createLink.mutateAsync({
      channel_id: formData.channel_id || null,
      utm_source: formData.utm_source,
      utm_medium: formData.utm_medium,
      utm_campaign: formData.utm_campaign,
      utm_term: formData.utm_term || null,
      utm_content: formData.utm_content || null,
      whatsapp_number: formData.whatsapp_number,
      whatsapp_message: formData.whatsapp_message || null,
      short_code: null,
      full_url: links.trackingUrl,
      is_active: true,
    });
  };

  const handleCopy = async () => {
    if (generatedLink) {
      await navigator.clipboard.writeText(generatedLink.trackingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Link copiado!' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gerador de Links UTM</h1>
        <p className="text-muted-foreground mt-1">
          Crie links rastreáveis que direcionam para o WhatsApp
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Configurar Link</CardTitle>
            <CardDescription>
              Preencha os parâmetros UTM e dados do WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Canal */}
            <div className="space-y-2">
              <Label>Canal de Origem</Label>
              <Select value={formData.channel_id} onValueChange={handleChannelSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um canal" />
                </SelectTrigger>
                <SelectContent>
                  {groupedChannels && Object.entries(groupedChannels).map(([category, channels]) => (
                    <div key={category}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        {CHANNEL_CATEGORIES[category as keyof typeof CHANNEL_CATEGORIES] || category}
                      </div>
                      {channels?.map((channel) => (
                        <SelectItem key={channel.id} value={channel.id}>
                          {channel.name}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* UTM Source */}
            <div className="space-y-2">
              <Label htmlFor="utm_source">UTM Source *</Label>
              <Input
                id="utm_source"
                placeholder="ex: instagram, youtube, google"
                value={formData.utm_source}
                onChange={(e) => setFormData(prev => ({ ...prev, utm_source: e.target.value }))}
              />
            </div>

            {/* UTM Medium */}
            <div className="space-y-2">
              <Label htmlFor="utm_medium">UTM Medium *</Label>
              <Select 
                value={formData.utm_medium} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, utm_medium: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o medium" />
                </SelectTrigger>
                <SelectContent>
                  {UTM_MEDIUMS.map((medium) => (
                    <SelectItem key={medium} value={medium}>
                      {medium}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* UTM Campaign */}
            <div className="space-y-2">
              <Label htmlFor="utm_campaign">UTM Campaign *</Label>
              <Input
                id="utm_campaign"
                placeholder="ex: lancamento_produto, black_friday"
                value={formData.utm_campaign}
                onChange={(e) => setFormData(prev => ({ ...prev, utm_campaign: e.target.value }))}
              />
            </div>

            {/* UTM Term */}
            <div className="space-y-2">
              <Label htmlFor="utm_term">UTM Term (opcional)</Label>
              <Input
                id="utm_term"
                placeholder="ex: palavra-chave específica"
                value={formData.utm_term}
                onChange={(e) => setFormData(prev => ({ ...prev, utm_term: e.target.value }))}
              />
            </div>

            {/* UTM Content */}
            <div className="space-y-2">
              <Label htmlFor="utm_content">UTM Content (opcional)</Label>
              <Input
                id="utm_content"
                placeholder="ex: reels_01, video_tutorial"
                value={formData.utm_content}
                onChange={(e) => setFormData(prev => ({ ...prev, utm_content: e.target.value }))}
              />
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Configuração do WhatsApp</h4>
              
              {/* WhatsApp Number */}
              <div className="space-y-2">
                 <Label htmlFor="whatsapp_number">Número do WhatsApp *</Label>
                <Input
                  id="whatsapp_number"
                  placeholder="244923999999"
                  value={formData.whatsapp_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, whatsapp_number: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Formato: código do país + número (sem espaços ou símbolos)
                </p>
              </div>

              {/* WhatsApp Message */}
              <div className="space-y-2 mt-4">
                <Label htmlFor="whatsapp_message">Mensagem Inicial</Label>
                <Textarea
                  id="whatsapp_message"
                  placeholder="Mensagem que aparecerá pré-preenchida"
                  value={formData.whatsapp_message}
                  onChange={(e) => setFormData(prev => ({ ...prev, whatsapp_message: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>

            <Button onClick={handleGenerate} className="w-full" size="lg" disabled={createLink.isPending}>
              <Plus className="mr-2 h-4 w-4" />
              Gerar Link UTM
            </Button>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Link Gerado</CardTitle>
            <CardDescription>
              Copie o link e use nas suas campanhas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {generatedLink ? (
              <>
                <div className="p-4 bg-muted rounded-lg">
                  <Label className="text-xs text-muted-foreground mb-2 block">
                    Link com Tracking
                  </Label>
                  <code className="text-sm break-all">
                    {generatedLink.trackingUrl}
                  </code>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleCopy} className="flex-1">
                    {copied ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copiar Link
                      </>
                    )}
                  </Button>
                  <Button variant="outline" asChild>
                    <a href={generatedLink.whatsappUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Testar
                    </a>
                  </Button>
                </div>

                <div className="border-t pt-4">
                  <Label className="text-xs text-muted-foreground mb-2 block">
                    Preview dos Parâmetros
                  </Label>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Source:</span>
                      <span className="font-mono">{formData.utm_source}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Medium:</span>
                      <span className="font-mono">{formData.utm_medium}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Campaign:</span>
                      <span className="font-mono">{formData.utm_campaign}</span>
                    </div>
                    {formData.utm_term && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Term:</span>
                        <span className="font-mono">{formData.utm_term}</span>
                      </div>
                    )}
                    {formData.utm_content && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Content:</span>
                        <span className="font-mono">{formData.utm_content}</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <QrCode className="h-12 w-12 mb-4 opacity-50" />
                <p>Preencha os campos e clique em "Gerar Link UTM"</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lista de links criados */}
      <UtmLinksList />
    </div>
  );
}