import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useLeads, Lead } from '@/hooks/useLeads';
import { LeadCard } from '@/components/leads/LeadCard';
import { LEAD_STATUSES } from '@/lib/constants';
import { LeadDetailModal } from '@/components/leads/LeadDetailModal';
import { NewLeadModal } from '@/components/leads/NewLeadModal';
import { UserPlus } from 'lucide-react';

export function SalesFunnel() {
  const { data: leads } = useLeads();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [showNewLead, setShowNewLead] = useState(false);

  const leadsByStatus = Object.entries(LEAD_STATUSES).reduce((acc, [status]) => {
    acc[status] = leads?.filter(l => l.status === status) || [];
    return acc;
  }, {} as Record<string, Lead[]>);

  const handleLeadClick = (leadId: string) => {
    setSelectedLeadId(leadId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Funil de Vendas</h1>
          <p className="text-muted-foreground mt-1">
            Clique em um lead para abrir o CRM completo
          </p>
        </div>
        <Button onClick={() => setShowNewLead(true)} size="sm" className="gap-1.5">
          <UserPlus className="h-4 w-4" />
          Novo Lead
        </Button>
      </div>

      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4 min-w-max">
          {Object.entries(LEAD_STATUSES).map(([status, info]) => (
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
                    {leadsByStatus[status]?.length || 0}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100vh-320px)]">
                  <div className="space-y-3">
                    {leadsByStatus[status]?.map((lead) => (
                      <div 
                        key={lead.id} 
                        onClick={() => handleLeadClick(lead.id)}
                        className="cursor-pointer"
                      >
                        <LeadCard 
                          lead={lead}
                          variant="funnel"
                          showTemperature={true}
                        />
                      </div>
                    ))}

                    {leadsByStatus[status]?.length === 0 && (
                      <div className="p-4 text-center text-muted-foreground text-sm">
                        Nenhum lead nesta etapa
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Lead Detail Modal */}
      <LeadDetailModal
        leadId={selectedLeadId}
        open={!!selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
      />

      {/* New Lead Modal */}
      <NewLeadModal open={showNewLead} onClose={() => setShowNewLead(false)} />
    </div>
  );
}
