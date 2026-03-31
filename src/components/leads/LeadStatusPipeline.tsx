import { LEAD_STATUSES, LeadStatus } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface LeadStatusPipelineProps {
  currentStatus: string;
  onStatusChange?: (status: LeadStatus) => void;
  disabled?: boolean;
}

const statusEntries = Object.entries(LEAD_STATUSES) as [LeadStatus, typeof LEAD_STATUSES[LeadStatus]][];

export function LeadStatusPipeline({ currentStatus, onStatusChange, disabled }: LeadStatusPipelineProps) {
  const currentIndex = statusEntries.findIndex(([key]) => key === currentStatus);

  return (
    <div className="flex items-center w-full gap-0.5 overflow-x-auto py-1">
      {statusEntries.map(([key, info], index) => {
        const isActive = key === currentStatus;
        const isPast = index < currentIndex;
        const isFinal = key === 'won' || key === 'lost';

        return (
          <button
            key={key}
            onClick={() => onStatusChange?.(key)}
            disabled={disabled || isActive}
            className={cn(
              "relative flex items-center justify-center gap-1 px-2.5 py-1.5 text-[11px] font-medium whitespace-nowrap transition-all rounded-md min-w-0 flex-1",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              isActive && "ring-2 ring-primary shadow-sm",
              isActive && !isFinal && "bg-primary text-primary-foreground",
              isActive && key === 'won' && "bg-emerald-500 text-white ring-emerald-500",
              isActive && key === 'lost' && "bg-destructive text-destructive-foreground ring-destructive",
              isPast && "bg-primary/15 text-primary",
              !isActive && !isPast && "bg-muted text-muted-foreground hover:bg-muted/80",
              disabled && "cursor-default",
              !disabled && !isActive && "cursor-pointer hover:ring-1 hover:ring-primary/30"
            )}
            title={info.label}
          >
            {isPast && <Check className="h-3 w-3 shrink-0" />}
            <span className="truncate">{info.label.replace(' ✅', '').replace(' ❌', '')}</span>
          </button>
        );
      })}
    </div>
  );
}
