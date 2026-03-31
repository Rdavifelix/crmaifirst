import { useWhatsAppInstance } from '@/hooks/useWhatsAppInstance';
import { useRealtimeWhatsAppStatus } from '@/hooks/useRealtimeWhatsAppStatus';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Wifi, WifiOff, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { WhatsAppReconnectModal } from './WhatsAppReconnectModal';

interface WhatsAppStatusBadgeProps {
  compact?: boolean;
  showLabel?: boolean;
}

export function WhatsAppStatusBadge({ compact = false, showLabel = true }: WhatsAppStatusBadgeProps) {
  const { data: instance, isLoading } = useWhatsAppInstance();
  const [showReconnectModal, setShowReconnectModal] = useState(false);

  // Hook de realtime que abre modal quando desconecta
  useRealtimeWhatsAppStatus(() => {
    setShowReconnectModal(true);
  });

  if (isLoading) {
    return (
      <Badge variant="secondary" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        {showLabel && <span>Verificando...</span>}
      </Badge>
    );
  }

  const status = instance?.status || 'disconnected';
  const hasInstance = !!instance?.instance_id;

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: Wifi,
          label: 'Conectado',
          className: 'bg-green-500/20 text-green-600 border-green-500/30 hover:bg-green-500/30',
          pulse: false,
        };
      case 'connecting':
        return {
          icon: Loader2,
          label: 'Conectando...',
          className: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30',
          pulse: false,
          animate: true,
        };
      case 'banned':
        return {
          icon: AlertTriangle,
          label: 'Banido',
          className: 'bg-red-500/20 text-red-600 border-red-500/30 animate-pulse',
          pulse: true,
        };
      default:
        return {
          icon: WifiOff,
          label: hasInstance ? 'Desconectado' : 'Não configurado',
          className: 'bg-red-500/20 text-red-600 border-red-500/30 animate-pulse',
          pulse: true,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const badgeContent = (
    <Badge
      variant="outline"
      className={cn(
        'gap-1.5 cursor-pointer transition-all',
        config.className,
        compact && 'p-1.5'
      )}
      onClick={() => {
        if (status !== 'connected') {
          setShowReconnectModal(true);
        }
      }}
    >
      <Icon className={cn('h-3 w-3', config.animate && 'animate-spin')} />
      {showLabel && !compact && <span className="text-xs font-medium">{config.label}</span>}
    </Badge>
  );

  return (
    <>
      {compact ? (
        <Tooltip>
          <TooltipTrigger asChild>{badgeContent}</TooltipTrigger>
          <TooltipContent>
            <p>WhatsApp: {config.label}</p>
            {status !== 'connected' && <p className="text-xs text-muted-foreground">Clique para reconectar</p>}
          </TooltipContent>
        </Tooltip>
      ) : (
        badgeContent
      )}

      <WhatsAppReconnectModal 
        open={showReconnectModal} 
        onOpenChange={setShowReconnectModal} 
      />
    </>
  );
}
