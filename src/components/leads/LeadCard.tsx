import { Lead } from '@/hooks/useLeads';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LEAD_STATUSES, LeadStatus } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Clock, DollarSign, Instagram, Phone, Mail, MessageSquare } from 'lucide-react';
import { formatDistanceToNow, differenceInDays, differenceInHours, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type LeadCardVariant = 'default' | 'compact' | 'funnel' | 'chat';

interface LeadCardProps {
  lead: Lead;
  variant?: LeadCardVariant;
  isSelected?: boolean;
  showTemperature?: boolean;
  lastMessage?: {
    message: string;
    created_at: string;
    sender_type: string;
  };
  unreadCount?: number;
  onClick?: () => void;
  className?: string;
}

// Calculate temperature based on activity
function getTemperature(lead: Lead, lastMessage?: { created_at: string; sender_type: string }): {
  temperature: 'hot' | 'warm' | 'cold';
  emoji: string;
  label: string;
} {
  const now = new Date();
  
  if (lastMessage && lastMessage.sender_type === 'lead') {
    const hours = differenceInHours(now, parseISO(lastMessage.created_at));
    if (hours <= 24) return { temperature: 'hot', emoji: '🔥', label: 'Quente' };
    if (hours <= 72) return { temperature: 'warm', emoji: '😐', label: 'Morno' };
    return { temperature: 'cold', emoji: '❄️', label: 'Frio' };
  }
  
  const days = differenceInDays(now, parseISO(lead.created_at));
  if (days <= 1) return { temperature: 'hot', emoji: '🔥', label: 'Quente' };
  if (days <= 3) return { temperature: 'warm', emoji: '😐', label: 'Morno' };
  return { temperature: 'cold', emoji: '❄️', label: 'Frio' };
}

// Calculate time in funnel
function getTimeInFunnel(lead: Lead): string {
  const days = differenceInDays(new Date(), parseISO(lead.entered_at));
  if (days === 0) {
    const hours = differenceInHours(new Date(), parseISO(lead.entered_at));
    return hours === 0 ? 'agora' : `${hours}h`;
  }
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}sem`;
  return `${Math.floor(days / 30)}m`;
}

// Get initials from name
function getInitials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

// Format currency
function formatCurrency(value: number | null): string {
  if (!value) return '';
  return new Intl.NumberFormat('pt-AO', {
    style: 'currency',
    currency: 'AOA',
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value);
}

// Truncate message
function truncateMessage(msg: string, maxLength = 30): string {
  if (!msg) return '';
  return msg.length > maxLength ? msg.substring(0, maxLength) + '...' : msg;
}

const temperatureColors = {
  hot: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
  warm: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
  cold: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
};

export function LeadCard({ 
  lead, 
  variant = 'default',
  isSelected = false,
  showTemperature = true,
  lastMessage,
  unreadCount = 0,
  onClick,
  className
}: LeadCardProps) {
  const temperature = getTemperature(lead, lastMessage);
  const timeInFunnel = getTimeInFunnel(lead);
  const statusInfo = LEAD_STATUSES[lead.status as LeadStatus];

  // Compact variant - for chat sidebar
  if (variant === 'chat') {
    return (
      <button
        onClick={onClick}
        className={cn(
          "w-full px-3 py-2.5 flex items-center gap-3 hover:bg-muted/50 transition-colors border-b border-border/50 text-left",
          isSelected && "bg-muted",
          className
        )}
      >
        <div className="relative shrink-0">
          <Avatar className="h-11 w-11">
            {lead.avatar_url && <AvatarImage src={lead.avatar_url} />}
            <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
              {getInitials(lead.name)}
            </AvatarFallback>
          </Avatar>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-green-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          {showTemperature && (
            <span className="absolute -bottom-0.5 -right-0.5 text-xs">
              {temperature.emoji}
            </span>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={cn(
              "font-medium truncate text-sm",
              unreadCount > 0 && "font-semibold"
            )}>
              {lead.name || lead.phone}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] text-muted-foreground">
                {timeInFunnel}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <span className={cn(
              "text-xs truncate",
              unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"
            )}>
              {lastMessage ? truncateMessage(lastMessage.message) : lead.utm_source ? `via ${lead.utm_source}` : 'Novo lead'}
            </span>
            <Badge 
              variant="outline"
              className="text-[9px] px-1 py-0 h-4 shrink-0"
              style={{
                borderColor: `hsl(var(--${statusInfo?.color}))`,
                color: `hsl(var(--${statusInfo?.color}))`,
              }}
            >
              {statusInfo?.label}
            </Badge>
          </div>
        </div>
      </button>
    );
  }

  // Funnel variant - for Kanban cards
  if (variant === 'funnel') {
    return (
      <div
        onClick={onClick}
        className={cn(
          "p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors group",
          isSelected && "ring-2 ring-primary",
          className
        )}
      >
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            <Avatar className="h-9 w-9">
              {lead.avatar_url && <AvatarImage src={lead.avatar_url} />}
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                {getInitials(lead.name)}
              </AvatarFallback>
            </Avatar>
            {showTemperature && (
              <span className="absolute -bottom-0.5 -right-0.5 text-xs">
                {temperature.emoji}
              </span>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm truncate">
                {lead.name || lead.phone}
              </p>
            </div>
            {lead.utm_source && (
              <p className="text-xs text-muted-foreground truncate">
                via {lead.utm_source}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeInFunnel}
              </div>
              {lead.deal_value && (
                <div className="flex items-center gap-1 text-primary font-medium">
                  <DollarSign className="h-3 w-3" />
                  {formatCurrency(lead.deal_value)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Compact variant - minimal info
  if (variant === 'compact') {
    return (
      <div
        onClick={onClick}
        className={cn(
          "flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
          isSelected && "bg-muted",
          className
        )}
      >
        <div className="relative">
          <Avatar className="h-8 w-8">
            {lead.avatar_url && <AvatarImage src={lead.avatar_url} />}
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
              {getInitials(lead.name)}
            </AvatarFallback>
          </Avatar>
          {showTemperature && (
            <span className="absolute -bottom-0.5 -right-0.5 text-[10px]">
              {temperature.emoji}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{lead.name || lead.phone}</p>
          <p className="text-xs text-muted-foreground truncate">{lead.phone}</p>
        </div>
        <Badge 
          variant="outline"
          className="text-[10px] px-1.5 py-0"
          style={{
            borderColor: `hsl(var(--${statusInfo?.color}))`,
            color: `hsl(var(--${statusInfo?.color}))`,
          }}
        >
          {statusInfo?.label}
        </Badge>
      </div>
    );
  }

  // Default variant - full card for leads list
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-stretch rounded-lg border shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden bg-card",
        isSelected && "ring-2 ring-primary",
        className
      )}
    >
      {/* Status indicator bar */}
      <div 
        className="w-1.5 shrink-0"
        style={{ backgroundColor: `hsl(var(--${statusInfo?.color}))` }}
      />
      
      <div className="flex-1 p-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="relative shrink-0">
            <Avatar className="h-12 w-12 ring-2 ring-background shadow-md">
              <AvatarImage src={lead.avatar_url || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-white font-semibold">
                {getInitials(lead.name)}
              </AvatarFallback>
            </Avatar>
            {(lead as any).instagram_username && (
              <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 ring-2 ring-background">
                <Instagram className="h-2.5 w-2.5 text-white" />
              </div>
            )}
            {showTemperature && (
              <span className="absolute -top-1 -right-1 text-sm">
                {temperature.emoji}
              </span>
            )}
          </div>

          {/* Main Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-base truncate">
                {lead.name || 'Lead sem nome'}
              </h3>
              <Badge 
                variant="outline"
                className="text-xs font-medium"
                style={{
                  borderColor: `hsl(var(--${statusInfo?.color}))`,
                  color: `hsl(var(--${statusInfo?.color}))`,
                }}
              >
                {statusInfo?.label}
              </Badge>
              {showTemperature && (
                <Badge 
                  variant="outline"
                  className={cn("text-xs font-medium", temperatureColors[temperature.temperature])}
                >
                  {temperature.emoji} {temperature.label}
                </Badge>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                {lead.phone}
              </span>
              {lead.email && (
                <span className="flex items-center gap-1.5 hidden sm:flex">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="truncate max-w-[180px]">{lead.email}</span>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {formatDistanceToNow(new Date(lead.created_at), { locale: ptBR, addSuffix: true })}
              </span>
            </div>
          </div>

          {/* Right side info */}
          <div className="hidden md:flex items-center gap-4">
            {lead.utm_source && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-0.5">Origem</p>
                <Badge variant="secondary" className="font-medium text-xs">
                  {lead.utm_source}
                </Badge>
              </div>
            )}
            
            {lead.deal_value && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-0.5">Valor</p>
                <p className="font-bold text-primary">
                  {formatCurrency(lead.deal_value)}
                </p>
              </div>
            )}

            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-0.5">Funil</p>
              <p className="font-medium text-sm">{timeInFunnel}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
