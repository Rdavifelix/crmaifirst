import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Video, Phone, CheckSquare, Play, Clock, User, ExternalLink } from 'lucide-react';
import { LeadTask, useUpdateLeadTask } from '@/hooks/useLeadTasks';
import { format, parseISO, isToday, isTomorrow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface TaskCardProps {
  task: LeadTask;
  onStartMeeting?: (task: LeadTask) => void;
  sellerName?: string;
}

const TYPE_CONFIG: Record<string, { icon: typeof Video; label: string }> = {
  meeting: { icon: Video, label: 'Reunião' },
  call: { icon: Phone, label: 'Ligação' },
  task: { icon: CheckSquare, label: 'Tarefa' },
};

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-destructive/10 text-destructive border-destructive/20',
  medium: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  low: 'bg-muted text-muted-foreground border-border',
};

export function TaskCard({ task, onStartMeeting, sellerName }: TaskCardProps) {
  const updateTask = useUpdateLeadTask();
  const config = TYPE_CONFIG[task.type] || TYPE_CONFIG.task;
  const Icon = config.icon;
  const isCompleted = task.status === 'completed';
  const isMeeting = task.type === 'meeting';
  const hasMeetLink = !!task.meet_link;

  const handleToggleComplete = async () => {
    try {
      await updateTask.mutateAsync({
        id: task.id,
        status: isCompleted ? 'pending' : 'completed',
        completed_at: isCompleted ? null : new Date().toISOString(),
      });
    } catch {
      toast.error('Erro ao atualizar tarefa');
    }
  };

  const formatScheduled = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return `Hoje ${format(date, 'HH:mm')}`;
    if (isTomorrow(date)) return `Amanhã ${format(date, 'HH:mm')}`;
    return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
  };

  const isOverdue = task.scheduled_at && isPast(parseISO(task.scheduled_at)) && !isCompleted;
  const isActive = isMeeting && task.status === 'in_progress';

  return (
    <Card className={`p-3 transition-all ${isCompleted ? 'opacity-60' : ''} ${isActive ? 'ring-2 ring-primary/50 bg-primary/5' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <Checkbox
          checked={isCompleted}
          onCheckedChange={handleToggleComplete}
          className="mt-1"
        />

        {/* Icon */}
        {isMeeting && (
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-medium text-sm ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
              {task.title}
            </span>
            {isActive && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-1 animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                Em call
              </Badge>
            )}
            {isOverdue && !isActive && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                Atrasada
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {task.scheduled_at && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatScheduled(task.scheduled_at)}
                {task.duration_minutes && task.duration_minutes > 0 && (
                  <span className="text-muted-foreground">
                    ({task.duration_minutes >= 60 
                      ? `${Math.floor(task.duration_minutes / 60)}h${task.duration_minutes % 60 > 0 ? task.duration_minutes % 60 : ''}` 
                      : `${task.duration_minutes}min`})
                  </span>
                )}
              </span>
            )}
            {sellerName && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {sellerName}
              </span>
            )}
          </div>
        </div>

        {/* Meeting actions */}
        {isMeeting && hasMeetLink && !isCompleted && (
          <Button
            size="sm"
            className="gap-1.5 shrink-0"
            onClick={() => onStartMeeting?.(task)}
          >
            <Play className="h-3.5 w-3.5" />
            {isActive ? 'Continuar' : 'Iniciar'}
          </Button>
        )}
      </div>
    </Card>
  );
}
