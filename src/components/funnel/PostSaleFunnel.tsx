import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useLeads, useUpdateLead, Lead } from '@/hooks/useLeads';
import { POST_SALE_STATUSES, PostSaleStatus } from '@/lib/constants';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { GripVertical, DollarSign, User, Calendar, CheckCircle } from 'lucide-react';

export function PostSaleFunnel() {
  const { data: leads } = useLeads();
  const updateLead = useUpdateLead();
  const [notes, setNotes] = useState('');

  // Filtrar apenas leads que fecharam (status 'won')
  const wonLeads = leads?.filter(l => l.status === 'won') || [];

  const leadsByPostStatus = Object.entries(POST_SALE_STATUSES).reduce((acc, [status]) => {
    acc[status] = wonLeads.filter(l => l.post_sale_status === status);
    return acc;
  }, {} as Record<string, Lead[]>);

  const handlePostStatusChange = async (lead: Lead, newStatus: PostSaleStatus) => {
    await updateLead.mutateAsync({
      id: lead.id,
      post_sale_status: newStatus,
      notes: notes || lead.notes,
    });
    setNotes('');
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
    }).format(value);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Pós-Venda</h1>
        <p className="text-muted-foreground mt-1">
          Acompanhe o onboarding e o sucesso dos clientes
        </p>
      </div>

      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4 min-w-max">
          {Object.entries(POST_SALE_STATUSES).map(([status, info]) => (
            <Card key={status} className="w-[300px] shrink-0">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: `hsl(var(--${info.color}))` }}
                    />
                    {info.label}
                  </CardTitle>
                  <Badge variant="secondary">
                    {leadsByPostStatus[status]?.length || 0}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100vh-320px)]">
                  <div className="space-y-3">
                    {leadsByPostStatus[status]?.map((lead) => (
                      <Dialog key={lead.id}>
                        <DialogTrigger asChild>
                          <div
                            className="p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors group"
                          >
                            <div className="flex items-start gap-3">
                              <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                              <Avatar className="h-8 w-8 shrink-0">
                                <AvatarFallback className="bg-status-won text-white text-xs">
                                  {getInitials(lead.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {lead.name || lead.phone}
                                </p>
                                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                  <DollarSign className="h-3 w-3" />
                                  {formatCurrency(lead.deal_value)}
                                  <Calendar className="h-3 w-3 ml-2" />
                                  {format(new Date(lead.closed_at || lead.created_at), 'dd/MM')}
                                </div>
                              </div>
                            </div>
                          </div>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <CheckCircle className="h-5 w-5 text-status-won" />
                              {lead.name || lead.phone}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            {/* Client Info */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Valor da Venda:</span>
                                <p className="font-medium text-lg text-primary">{formatCurrency(lead.deal_value)}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Fechou em:</span>
                                <p className="font-medium">
                                  {format(new Date(lead.closed_at || lead.created_at), "dd/MM/yyyy", { locale: ptBR })}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Origem:</span>
                                <p className="font-medium">{lead.utm_source || 'Direto'}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Campanha:</span>
                                <p className="font-medium">{lead.utm_campaign || '-'}</p>
                              </div>
                            </div>

                            {lead.notes && (
                              <div className="p-3 bg-muted rounded-lg">
                                <span className="text-xs text-muted-foreground">Notas:</span>
                                <p className="text-sm mt-1">{lead.notes}</p>
                              </div>
                            )}

                            {/* Status Change */}
                            <div className="space-y-3 pt-4 border-t">
                              <Label>Mover para:</Label>
                              <div className="grid grid-cols-1 gap-2">
                                {Object.entries(POST_SALE_STATUSES)
                                  .filter(([s]) => s !== status)
                                  .map(([s, info]) => (
                                    <Button
                                      key={s}
                                      variant="outline"
                                      size="sm"
                                      className="justify-start"
                                      onClick={() => handlePostStatusChange(lead, s as PostSaleStatus)}
                                    >
                                      <div 
                                        className="w-2 h-2 rounded-full mr-2"
                                        style={{ backgroundColor: `hsl(var(--${info.color}))` }}
                                      />
                                      {info.label}
                                    </Button>
                                  ))}
                              </div>

                              <div className="space-y-2 pt-2">
                                <Label>Adicionar nota (opcional)</Label>
                                <Textarea
                                  placeholder="Observações sobre o cliente..."
                                  value={notes}
                                  onChange={(e) => setNotes(e.target.value)}
                                  rows={3}
                                />
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    ))}

                    {leadsByPostStatus[status]?.length === 0 && (
                      <div className="p-4 text-center text-muted-foreground text-sm">
                        Nenhum cliente nesta etapa
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}