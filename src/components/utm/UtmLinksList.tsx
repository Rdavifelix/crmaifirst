import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUtmLinks } from '@/hooks/useUtmLinks';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Copy, ExternalLink, MousePointer, Check } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export function UtmLinksList() {
  const { data: links, isLoading } = useUtmLinks();
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (link: string, id: string) => {
    await navigator.clipboard.writeText(link);
    setCopiedId(id);
    toast({ title: 'Link copiado!' });
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  }

  if (!links?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <MousePointer className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Nenhum link criado ainda</p>
        <p className="text-sm">Crie seu primeiro link UTM acima</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Links Criados</h3>
      <div className="grid gap-3">
        {links.map((link) => (
          <Card key={link.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{link.utm_source}</Badge>
                    <Badge variant="secondary">{link.utm_medium}</Badge>
                    <Badge>{link.utm_campaign}</Badge>
                    {link.utm_term && (
                      <Badge variant="outline" className="text-xs">{link.utm_term}</Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground truncate font-mono">
                    {link.full_url}
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MousePointer className="h-3 w-3" />
                      {link.clicks_count} cliques
                    </span>
                    <span>
                      {format(new Date(link.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(link.full_url, link.id)}
                  >
                    {copiedId === link.id ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={link.full_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}