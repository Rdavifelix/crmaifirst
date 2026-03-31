import { Candidate } from '@/hooks/useCandidates';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Star } from 'lucide-react';

const statusLabels: Record<string, string> = {
  registered: 'Registado',
  interview_scheduled: 'Agendado',
  interviewed: 'Entrevistado',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
};

const statusColors: Record<string, string> = {
  registered: 'bg-blue-500/10 text-blue-600 border-blue-200',
  interview_scheduled: 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
  interviewed: 'bg-purple-500/10 text-purple-600 border-purple-200',
  approved: 'bg-green-500/10 text-green-600 border-green-200',
  rejected: 'bg-red-500/10 text-red-600 border-red-200',
};

interface CandidateCardProps {
  candidate: Candidate;
  onClick: () => void;
}

export function CandidateCard({ candidate, onClick }: CandidateCardProps) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4 flex items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={candidate.photo_url || undefined} />
          <AvatarFallback>
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">
            {candidate.name || 'Sem nome'}
          </p>
          <p className="text-sm text-muted-foreground truncate">
            {candidate.position || 'Cargo não informado'}
          </p>
          <p className="text-xs text-muted-foreground">
            {candidate.email || candidate.phone || '—'}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <Badge variant="outline" className={statusColors[candidate.status] || ''}>
            {statusLabels[candidate.status] || candidate.status}
          </Badge>
          {candidate.interview_score != null && (
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
              <span className="font-medium">{candidate.interview_score.toFixed(1)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
