import { format, isToday, isTomorrow, parseISO, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Video, Phone, CheckSquare, Clock, User, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarTask } from '@/hooks/useCalendar';
import { useUpdateLeadTask } from '@/hooks/useLeadTasks';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ListViewProps {
  tasks: CalendarTask[];
  onTaskClick?: (task: CalendarTask) => void;
}

const TYPE_CONFIG: Record<string, { icon: typeof Video; label: string; color: string }> = {
  meeting: { icon: Video, label: 'Reunião', color: 'text-primary bg-primary/10' },
  call: { icon: Phone, label: 'Ligação', color: 'text-amber-600 bg-amber-500/10' },
  task: { icon: CheckSquare, label: 'Tarefa', color: 'text-emerald-600 bg-emerald-500/10' },
};

function groupByDate(tasks: CalendarTask[]) {
  const groups: Record<string, CalendarTask[]> = {};
  for (const task of tasks) {
    const date = task.scheduled_at ? format(parseISO(task.scheduled_at), 'yyyy-MM-dd') : 'sem-data';
    if (!groups[date]) groups[date] = [];
    groups[date].push(task);
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

function formatGroupLabel(dateStr: string): string {
  if (dateStr === 'sem-data') return 'Sem data';
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Hoje';
  if (isTomorrow(date)) return 'Amanhã';
  return format(date, "EEEE, dd 'de' MMMM", { locale: ptBR });
}

export function ListView({ tasks, onTaskClick }: ListViewProps) {
  const updateTask = useUpdateLeadTask();
  const grouped = groupByDate(tasks);

  const handleToggle = async (task: CalendarTask) => {
    const isCompleted = task.status === 'completed';
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

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <CheckSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>Nenhum evento encontrado neste período.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map(([dateStr, dayTasks]) => (
        <div key={dateStr}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 capitalize">
            {formatGroupLabel(dateStr)}
          </h3>
          <div className="space-y-2">
            {dayTasks.map(task => {
              const config = TYPE_CONFIG[task.type] || TYPE_CONFIG.task;
              const Icon = config.icon;
              const isCompleted = task.status === 'completed';
              const isOverdue = task.scheduled_at && isPast(parseISO(task.scheduled_at)) && !isCompleted;

              return (
                <Card
                  key={task.id}
                  className={cn(
                    'p-3 transition-all cursor-pointer hover:shadow-sm',
                    isCompleted && 'opacity-60',
                  )}
                  onClick={() => onTaskClick?.(task)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isCompleted}
                      onCheckedChange={() => handleToggle(task)}
                      onClick={e => e.stopPropagation()}
                      className="mt-1"
                    />

                    <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', config.color)}>
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn(
                          'font-medium text-sm',
                          isCompleted && 'line-through text-muted-foreground',
                        )}>
                          {task.title}
                        </span>
                        {isOverdue && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Atrasada</Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        {task.scheduled_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(parseISO(task.scheduled_at), 'HH:mm')}
                            {task.duration_minutes > 0 && (
                              <span>
                                ({task.duration_minutes >= 60
                                  ? `${Math.floor(task.duration_minutes / 60)}h${task.duration_minutes % 60 > 0 ? task.duration_minutes % 60 + 'min' : ''}`
                                  : `${task.duration_minutes}min`})
                              </span>
                            )}
                          </span>
                        )}
                        {task.lead_name && (
                          <span className="flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" />
                            {task.lead_name}
                          </span>
                        )}
                        {task.assigned_name && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {task.assigned_name}
                          </span>
                        )}
                      </div>
                    </div>

                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {config.label}
                    </Badge>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
