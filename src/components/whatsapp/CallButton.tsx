import { Button } from '@/components/ui/button';
import { useWavoip, CallStatus } from '@/hooks/useWavoip';
import { Phone, PhoneOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface CallButtonProps {
  phoneNumber: string;
  variant?: 'icon' | 'full';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const statusLabels: Record<CallStatus, string> = {
  idle: 'Ligar',
  connecting: 'Conectando...',
  ringing: 'Chamando...',
  connected: 'Em ligação',
  ended: 'Encerrada',
  rejected: 'Rejeitada',
  unanswered: 'Não atendeu',
  error: 'Erro',
};

export function CallButton({ 
  phoneNumber, 
  variant = 'icon',
  size = 'default',
  className 
}: CallButtonProps) {
  const { status, isCalling, startCall, endCall, callDuration } = useWavoip();

  const handleClick = () => {
    if (isCalling) {
      endCall();
    } else {
      startCall(phoneNumber);
    }
  };

  const isLoading = status === 'connecting' || status === 'ringing';
  const isConnected = status === 'connected';
  const isError = status === 'error';

  // Versão apenas ícone
  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClick}
        className={cn(
          "rounded-full transition-all duration-200",
          size === 'sm' && "h-8 w-8",
          size === 'default' && "h-9 w-9",
          size === 'lg' && "h-10 w-10",
          isConnected && "bg-green-500 hover:bg-green-600 text-white",
          isLoading && "bg-amber-500 hover:bg-amber-600 text-white animate-pulse",
          isError && "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
          !isCalling && !isError && "hover:bg-green-500/20 hover:text-green-500",
          className
        )}
      >
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <Loader2 className="h-4 w-4 animate-spin" />
            </motion.div>
          ) : isCalling ? (
            <motion.div
              key="end"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <PhoneOff className="h-4 w-4" />
            </motion.div>
          ) : (
            <motion.div
              key="call"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <Phone className="h-4 w-4" />
            </motion.div>
          )}
        </AnimatePresence>
      </Button>
    );
  }

  // Versão completa com texto
  return (
    <Button
      onClick={handleClick}
      size={size}
      className={cn(
        "transition-all duration-200 gap-2",
        isConnected && "bg-green-500 hover:bg-green-600 text-white",
        isLoading && "bg-amber-500 hover:bg-amber-600 text-white",
        isError && "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
        !isCalling && !isError && "bg-green-500 hover:bg-green-600 text-white",
        className
      )}
    >
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="flex items-center gap-2"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{statusLabels[status]}</span>
          </motion.div>
        ) : isCalling ? (
          <motion.div
            key="connected"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="flex items-center gap-2"
          >
            <PhoneOff className="h-4 w-4" />
            <span>
              {isConnected ? formatDuration(callDuration) : statusLabels[status]}
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="flex items-center gap-2"
          >
            <Phone className="h-4 w-4" />
            <span>{statusLabels[status]}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </Button>
  );
}
