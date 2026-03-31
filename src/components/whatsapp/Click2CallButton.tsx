import { Button } from '@/components/ui/button';
import { useClick2Call } from '@/hooks/useClick2Call';
import { Phone, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Click2CallButtonProps {
  phoneNumber: string;
  contactName?: string;
  variant?: 'icon' | 'full';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function Click2CallButton({ 
  phoneNumber, 
  contactName,
  variant = 'icon',
  size = 'default',
  className 
}: Click2CallButtonProps) {
  const { initiateCall, isLoading } = useClick2Call();

  const handleClick = () => {
    initiateCall(phoneNumber, contactName);
  };

  // Versão apenas ícone
  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClick}
        disabled={isLoading}
        className={cn(
          "rounded-full transition-all duration-200",
          size === 'sm' && "h-8 w-8",
          size === 'default' && "h-9 w-9",
          size === 'lg' && "h-10 w-10",
          "hover:bg-primary/10 hover:text-primary",
          className
        )}
        title="Ligar via Click2Call"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Phone className="h-4 w-4" />
        )}
      </Button>
    );
  }

  // Versão completa com texto
  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      size={size}
      className={cn(
        "transition-all duration-200 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground",
        className
      )}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Conectando...</span>
        </>
      ) : (
        <>
          <Phone className="h-4 w-4" />
          <span>Ligar</span>
        </>
      )}
    </Button>
  );
}
