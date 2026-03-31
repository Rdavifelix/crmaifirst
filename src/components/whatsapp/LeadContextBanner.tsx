import { useState } from 'react';
import { LeadIntelligence } from '@/hooks/useLeadIntelligence';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, Lightbulb, MapPin, Clock, Brain, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lead } from '@/hooks/useLeads';

interface LeadContextBannerProps {
  lead: Lead;
  intelligence: LeadIntelligence;
}

export function LeadContextBanner({ lead, intelligence }: LeadContextBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Only show if we have at least one piece of context
  const hasContext = intelligence.origin || intelligence.bestContactTime || intelligence.discProfile;
  
  if (!hasContext) return null;

  const contextItems = [
    intelligence.origin && {
      icon: MapPin,
      label: intelligence.origin,
      title: 'Origem',
    },
    intelligence.bestContactTime && {
      icon: Clock,
      label: intelligence.bestContactTime,
      title: 'Melhor horário',
    },
    intelligence.discProfile && {
      icon: Brain,
      label: intelligence.discProfile,
      title: 'Perfil DISC',
    },
  ].filter(Boolean);

  // Extended context for expanded view
  const extendedContext = [
    lead.utm_campaign && {
      icon: Target,
      label: lead.utm_campaign,
      title: 'Campanha',
    },
    lead.deal_value && {
      icon: Target,
      label: `Kz ${lead.deal_value.toLocaleString('pt-AO')}`,
      title: 'Valor',
    },
  ].filter(Boolean);

  return (
    <motion.div 
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="border-b bg-muted/30"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full px-4 py-2 flex items-center gap-2 text-xs hover:bg-muted/50 transition-colors",
          isExpanded && "bg-muted/40"
        )}
      >
        <Lightbulb className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
        
        <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
          {contextItems.map((item, index) => (
            <div key={index} className="flex items-center gap-1.5 text-muted-foreground">
              {index > 0 && <span className="text-border">·</span>}
              <item.icon className="h-3 w-3 shrink-0" />
              <span className="truncate">{item.label}</span>
            </div>
          ))}
        </div>

        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-3 gap-3 border-t border-border/50">
              {[...contextItems, ...extendedContext].map((item, index) => (
                <div key={index} className="flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {item.title}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <item.icon className="h-3.5 w-3.5 text-primary" />
                    <span className="text-sm font-medium text-foreground truncate">
                      {item.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
