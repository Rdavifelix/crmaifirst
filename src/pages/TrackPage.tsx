import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, MessageCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { isValidAngolanPhone, formatPhoneInput, toE164AO } from '@/lib/phone-utils';

export default function TrackPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'form' | 'submitting' | 'success' | 'error'>('loading');
  const [utmLinkId, setUtmLinkId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  // UTM params para salvar no lead
  const utmSource = searchParams.get('utm_source');
  const utmMedium = searchParams.get('utm_medium');
  const utmCampaign = searchParams.get('utm_campaign');
  const utmTerm = searchParams.get('utm_term');
  const utmContent = searchParams.get('utm_content');

  useEffect(() => {
    const trackClick = async () => {
      try {
        // Pesquisar o link UTM correspondente
        const { data: utmLink, error: linkError } = await supabase
          .from('utm_links')
          .select('id')
          .eq('utm_source', utmSource || '')
          .eq('utm_medium', utmMedium || '')
          .eq('utm_campaign', utmCampaign || '')
          .maybeSingle();

        if (utmLink) {
          setUtmLinkId(utmLink.id);
          
          // Registrar o clique
          const { error: clickError } = await supabase.from('link_clicks').insert({
            utm_link_id: utmLink.id,
            user_agent: navigator.userAgent,
            referrer: document.referrer || null,
          });
        }

        setStatus('form');
      } catch {
        setStatus('form');
      }
    };

    trackClick();
  }, [utmSource, utmMedium, utmCampaign]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !phone.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (!isValidAngolanPhone(phone)) {
      toast.error('Número de telefone inválido. Use o formato: 9XX XXX XXX');
      return;
    }

    setStatus('submitting');

    try {
      // Criar o lead no banco
      const { error } = await supabase.from('leads').insert({
        name: name.trim(),
        phone: toE164AO(phone) || phone.trim(),
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        utm_term: utmTerm,
        utm_content: utmContent,
        utm_link_id: utmLinkId,
        status: 'new',
      });

      if (error) {
        toast.error('Erro ao enviar. Tente novamente.');
        setStatus('form');
        return;
      }

      setStatus('success');
      toast.success('Contacto registado com sucesso!');
    } catch {
      toast.error('Erro ao enviar. Tente novamente.');
      setStatus('form');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-whatsapp-light to-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        {status === 'loading' && (
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-whatsapp/10 flex items-center justify-center mx-auto">
                <MessageCircle className="h-8 w-8 text-whatsapp animate-pulse" />
              </div>
              <p className="text-muted-foreground">Carregando...</p>
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
            </div>
          </CardContent>
        )}

        {(status === 'form' || status === 'submitting') && (
          <>
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-full bg-whatsapp/10 flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="h-8 w-8 text-whatsapp" />
              </div>
              <CardTitle className="text-xl">Fale connosco no WhatsApp</CardTitle>
              <CardDescription>
                Preencha os seus dados para iniciar uma conversa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    placeholder="O seu nome completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={status === 'submitting'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">WhatsApp</Label>
                    <Input
                      id="phone"
                      placeholder="923 999 999"
                      value={phone}
                      onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                      disabled={status === 'submitting'}
                      maxLength={16}
                    />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-whatsapp hover:bg-whatsapp-dark"
                  disabled={status === 'submitting'}
                >
                  {status === 'submitting' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Iniciar Conversa
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </>
        )}

        {status === 'success' && (
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-xl">Contacto Registado!</CardTitle>
              <CardDescription>
                Em breve a nossa equipa entrará em contacto pelo WhatsApp.
              </CardDescription>
            </div>
          </CardContent>
        )}

        {status === 'error' && (
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <p className="text-lg font-medium text-destructive">Ops! Algo deu errado</p>
              <p className="text-sm text-muted-foreground">
                Não foi possível processar sua solicitação
              </p>
              <Button 
                onClick={() => setStatus('form')}
                variant="outline"
              >
                Tentar novamente
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}