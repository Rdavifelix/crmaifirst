import { useState } from 'react';
import { Lead } from '@/hooks/useLeads';
import { LeadIntelligence } from '@/hooks/useLeadIntelligence';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LEAD_STATUSES, LeadStatus } from '@/lib/constants';
import { Video, MoreVertical } from 'lucide-react';
import { Click2CallButton } from './Click2CallButton';
import { MeetingTranscriptionModal } from './MeetingTranscriptionModal';
import { AIAgentBadge } from '@/components/inbox/AIAgentBadge';

interface LeadSmartHeaderProps {
  lead: Lead;
  intelligence: LeadIntelligence;
  onOpenDetails: () => void;
}

export function LeadSmartHeader({ 
  lead, 
  intelligence, 
  onOpenDetails,
}: LeadSmartHeaderProps) {
  const [meetingOpen, setMeetingOpen] = useState(false);
  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="px-4 py-3 border-b bg-card flex items-center gap-3">
      {/* Avatar + Name (clickable for details) */}
      <button 
        onClick={onOpenDetails}
        className="flex items-center gap-3 hover:opacity-80 transition-opacity group"
      >
        <Avatar className="h-10 w-10">
          {lead.avatar_url && <AvatarImage src={lead.avatar_url} />}
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {getInitials(lead.name)}
          </AvatarFallback>
        </Avatar>
        
        <div className="text-left">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">
              {lead.name || lead.phone}
            </h3>
            <Badge 
              variant="secondary" 
              className="bg-green-500/20 text-green-500 text-[10px] px-1.5 py-0"
            >
              ATIVO
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {lead.utm_source ? `${lead.utm_source} • ` : ''}{lead.phone}
          </p>
        </div>
      </button>

      {/* Action buttons */}
      <div className="flex items-center gap-1 ml-auto">
        {/* AI Agent Badge */}
        <AIAgentBadge leadId={lead.id} compact />

        {/* Click2Call Button */}
        <Click2CallButton 
          phoneNumber={lead.phone} 
          contactName={lead.name || undefined} 
          variant="icon" 
          size="default" 
        />
        
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => setMeetingOpen(true)}>
          <Video className="h-4 w-4 text-muted-foreground" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={onOpenDetails}>
          <MoreVertical className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>

      <MeetingTranscriptionModal
        open={meetingOpen}
        onClose={() => setMeetingOpen(false)}
        leadId={lead.id}
        leadName={lead.name}
      />
    </div>
  );
}
