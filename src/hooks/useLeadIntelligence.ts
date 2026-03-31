import { useMemo, useState, useEffect } from 'react';
import { Lead, useLeadMessages, useLeadStatusHistory, useLeadPostSaleStages } from '@/hooks/useLeads';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, differenceInHours, parseISO, getHours } from 'date-fns';

export interface LeadIntelligence {
  // Temperatura
  temperature: 'hot' | 'warm' | 'cold';
  temperatureEmoji: string;
  temperatureLabel: string;
  
  // Tempo no funil
  timeInFunnel: string;
  daysInFunnel: number;
  
  // Contexto
  origin: string | null;
  bestContactTime: string | null;
  discProfile: string | null;
  
  // Ação sugerida pela IA
  suggestedAction: string | null;
  suggestedActionLabel: string | null;
  
  // Loading states
  isAnalyzing: boolean;
  analysisError: string | null;
}

interface LeadMessage {
  sender_type: string;
  created_at: string;
}

// Calculate temperature based on last activity
function calculateTemperature(
  messages: LeadMessage[] | undefined,
  lead: Lead
): { temperature: 'hot' | 'warm' | 'cold'; emoji: string; label: string } {
  if (!messages || messages.length === 0) {
    // New lead without messages - consider warm
    const daysSinceCreated = differenceInDays(new Date(), parseISO(lead.created_at));
    if (daysSinceCreated <= 1) return { temperature: 'hot', emoji: '🔥', label: 'Quente' };
    if (daysSinceCreated <= 3) return { temperature: 'warm', emoji: '😐', label: 'Morno' };
    return { temperature: 'cold', emoji: '❄️', label: 'Frio' };
  }

  // Find last message from the lead
  const lastLeadMessage = [...messages]
    .reverse()
    .find(m => m.sender_type === 'lead');

  if (!lastLeadMessage) {
    // No messages from lead yet
    return { temperature: 'warm', emoji: '😐', label: 'Morno' };
  }

  const hoursSinceLastMessage = differenceInHours(
    new Date(),
    parseISO(lastLeadMessage.created_at)
  );

  if (hoursSinceLastMessage <= 24) {
    return { temperature: 'hot', emoji: '🔥', label: 'Quente' };
  }
  if (hoursSinceLastMessage <= 72) {
    return { temperature: 'warm', emoji: '😐', label: 'Morno' };
  }
  return { temperature: 'cold', emoji: '❄️', label: 'Frio' };
}

// Calculate time in funnel as human-readable string
function calculateTimeInFunnel(lead: Lead): { display: string; days: number } {
  const days = differenceInDays(new Date(), parseISO(lead.entered_at));
  
  if (days === 0) {
    const hours = differenceInHours(new Date(), parseISO(lead.entered_at));
    if (hours === 0) return { display: 'agora', days: 0 };
    return { display: `${hours}h`, days: 0 };
  }
  if (days < 7) return { display: `${days}d`, days };
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return { display: `${weeks}sem`, days };
  }
  const months = Math.floor(days / 30);
  return { display: `${months}m`, days };
}

// Calculate best contact time based on when lead responds most
function calculateBestContactTime(messages: LeadMessage[] | undefined): string | null {
  if (!messages || messages.length < 3) return null;

  const leadMessages = messages.filter(m => m.sender_type === 'lead');
  if (leadMessages.length < 2) return null;

  // Count messages by hour range
  const hourCounts: Record<string, number> = {
    'Manhã (8h-12h)': 0,
    'Tarde (12h-18h)': 0,
    'Noite (18h-22h)': 0,
  };

  leadMessages.forEach(msg => {
    const hour = getHours(parseISO(msg.created_at));
    if (hour >= 8 && hour < 12) hourCounts['Manhã (8h-12h)']++;
    else if (hour >= 12 && hour < 18) hourCounts['Tarde (12h-18h)']++;
    else if (hour >= 18 && hour < 22) hourCounts['Noite (18h-22h)']++;
  });

  // Find the period with most messages
  const maxPeriod = Object.entries(hourCounts).reduce((a, b) => 
    b[1] > a[1] ? b : a
  );

  if (maxPeriod[1] < 2) return null; // Not enough data

  // Return simplified version
  if (maxPeriod[0].includes('Manhã')) return 'Manhã';
  if (maxPeriod[0].includes('Tarde')) return 'Tarde';
  return 'Noite';
}

// Get origin from UTM
function getOrigin(lead: Lead): string | null {
  if (lead.utm_source) {
    const source = lead.utm_source.toLowerCase();
    if (source.includes('instagram')) return 'Instagram';
    if (source.includes('facebook') || source.includes('fb')) return 'Facebook';
    if (source.includes('google')) return 'Google';
    if (source.includes('tiktok')) return 'TikTok';
    if (source.includes('linkedin')) return 'LinkedIn';
    if (source.includes('whatsapp')) return 'WhatsApp';
    return lead.utm_source;
  }
  return null;
}

export function useLeadIntelligence(lead: Lead | null): LeadIntelligence {
  const [suggestedAction, setSuggestedAction] = useState<string | null>(null);
  const [suggestedActionLabel, setSuggestedActionLabel] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [discProfile, setDiscProfile] = useState<string | null>(null);

  const { data: messages } = useLeadMessages(lead?.id || '');
  const { data: statusHistory } = useLeadStatusHistory(lead?.id || '');
  const { data: postSaleStages } = useLeadPostSaleStages(lead?.id || '');

  // Calculate derived values
  const intelligence = useMemo(() => {
    if (!lead) {
      return {
        temperature: 'warm' as const,
        temperatureEmoji: '😐',
        temperatureLabel: 'Morno',
        timeInFunnel: '-',
        daysInFunnel: 0,
        origin: null,
        bestContactTime: null,
      };
    }

    const temp = calculateTemperature(messages, lead);
    const time = calculateTimeInFunnel(lead);
    const bestTime = calculateBestContactTime(messages);
    const origin = getOrigin(lead);

    return {
      temperature: temp.temperature,
      temperatureEmoji: temp.emoji,
      temperatureLabel: temp.label,
      timeInFunnel: time.display,
      daysInFunnel: time.days,
      origin,
      bestContactTime: bestTime,
    };
  }, [lead, messages]);

  // Removed auto-analysis - now triggered manually via LeadDetailSheet

  return {
    ...intelligence,
    discProfile,
    suggestedAction,
    suggestedActionLabel,
    isAnalyzing,
    analysisError,
  };
}
