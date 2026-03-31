import { useEffect, useState } from 'react';
import { Lead } from '@/hooks/useLeads';
import { Clock, User, Globe, Tag, DollarSign } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

interface LeadQuickMetricsProps {
  lead: Lead;
}

export function LeadQuickMetrics({ lead }: LeadQuickMetricsProps) {
  const [sellerName, setSellerName] = useState<string | null>(null);

  useEffect(() => {
    if (!lead.assigned_to) {
      setSellerName(null);
      return;
    }
    supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', lead.assigned_to)
      .single()
      .then(({ data }) => {
        setSellerName(data?.full_name || null);
      });
  }, [lead.assigned_to]);

  const timeInFunnel = formatDistanceToNow(parseISO(lead.entered_at), {
    locale: ptBR,
    addSuffix: false,
  });

  const utmParts = [
    lead.utm_source,
    lead.utm_medium,
    lead.utm_campaign,
  ].filter(Boolean);

  const formatCurrency = (value: number | null) => {
    if (!value) return null;
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
    }).format(value);
  };

  return (
    <div className="px-4 py-2 border-b bg-muted/30 flex items-center gap-4 text-xs text-muted-foreground overflow-x-auto flex-shrink-0">
      <div className="flex items-center gap-1 whitespace-nowrap">
        <Clock className="h-3 w-3" />
        <span>No funil há <span className="font-medium text-foreground">{timeInFunnel}</span></span>
      </div>

      {(sellerName || lead.assigned_to) && (
        <div className="flex items-center gap-1 whitespace-nowrap">
          <User className="h-3 w-3" />
          <span className="font-medium text-foreground">{sellerName || 'Vendedor'}</span>
        </div>
      )}

      {utmParts.length > 0 && (
        <div className="flex items-center gap-1 whitespace-nowrap min-w-0">
          <Globe className="h-3 w-3 shrink-0" />
          <span className="font-medium text-foreground truncate max-w-[200px]" title={utmParts.join(' / ')}>
            {utmParts.join(' / ')}
          </span>
        </div>
      )}




      {lead.deal_value && (
        <div className="flex items-center gap-1 whitespace-nowrap ml-auto">
          <DollarSign className="h-3 w-3" />
          <span className="font-medium text-foreground">{formatCurrency(lead.deal_value)}</span>
        </div>
      )}
    </div>
  );
}
