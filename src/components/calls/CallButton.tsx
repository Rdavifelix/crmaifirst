import { Button } from '@/components/ui/button';
import { Phone, Loader2 } from 'lucide-react';
import { useCallContext } from '@/contexts/CallContext';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface CallButtonProps {
  phoneNumber: string;
  leadId?: string;
  showLabel?: boolean;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'ghost';
}

export function CallButton({ phoneNumber, leadId, showLabel = false, size = 'icon', variant = 'outline' }: CallButtonProps) {
  const { initiateCall, callStatus, isDeviceConnected, deviceLoading } = useCallContext();

  const isBusy = callStatus !== 'idle';
  const isDisabled = !isDeviceConnected || isBusy || deviceLoading;

  const handleClick = () => {
    if (!isDisabled) {
      initiateCall(phoneNumber, leadId);
    }
  };

  const getTooltip = () => {
    if (deviceLoading) return 'Carregando dispositivo...';
    if (!isDeviceConnected) return 'Dispositivo WaVoIP não conectado';
    if (isBusy) return 'Chamada em andamento';
    return 'Fazer chamada WhatsApp';
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={variant}
          size={size}
          onClick={handleClick}
          disabled={isDisabled}
          className={isDeviceConnected && !isBusy ? 'text-green-600 hover:text-green-700 hover:bg-green-50' : ''}
        >
          {deviceLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Phone className="h-4 w-4" />
          )}
          {showLabel && <span className="ml-2">Ligar</span>}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{getTooltip()}</TooltipContent>
    </Tooltip>
  );
}

// Icon-only variant for lists
export function CallButtonIcon({ phoneNumber, leadId }: { phoneNumber: string; leadId?: string }) {
  return <CallButton phoneNumber={phoneNumber} leadId={leadId} size="icon" variant="ghost" />;
}
