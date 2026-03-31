import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, startOfWeek, endOfWeek, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Video, Phone, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarTask } from '@/hooks/useCalendar';
import { cn } from '@/lib/utils';

interface CalendarViewProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  tasks: CalendarTask[];
  onTaskClick?: (task: CalendarTask) => void;
}

const TYPE_COLORS: Record<string, string> = {
  meeting: 'bg-primary',
  call: 'bg-amber-500',
  task: 'bg-emerald-500',
};

const TYPE_ICONS: Record<string, typeof Video> = {
  meeting: Video,
  call: Phone,
  task: CheckSquare,
};

export function CalendarView({ currentDate, onDateChange, tasks, onTaskClick }: CalendarViewProps) {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { locale: ptBR });
  const calEnd = endOfWeek(monthEnd, { locale: ptBR });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const getTasksForDay = (day: Date) =>
    tasks.filter(t => t.scheduled_at && isSameDay(new Date(t.scheduled_at), day));

  const selectedDayTasks = selectedDay ? getTasksForDay(selectedDay) : [];

  const prevMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() - 1);
    onDateChange(d);
  };

  const nextMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + 1);
    onDateChange(d);
  };

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="flex gap-4">
      {/* Calendar Grid */}
      <div className="flex-1">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="font-semibold text-lg capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </h3>
          <Button variant="ghost" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Week Headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekDays.map(d => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            const dayTasks = getTasksForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isSelected = selectedDay && isSameDay(day, selectedDay);

            return (
              <button
                key={i}
                onClick={() => setSelectedDay(day)}
                className={cn(
                  'relative p-2 min-h-[80px] rounded-lg text-left transition-colors border',
                  isCurrentMonth ? 'bg-card' : 'bg-muted/30 text-muted-foreground',
                  isToday(day) && 'border-primary',
                  isSelected && 'ring-2 ring-primary/50',
                  !isSelected && !isToday(day) && 'border-transparent hover:border-border',
                )}
              >
                <span className={cn(
                  'text-sm font-medium',
                  isToday(day) && 'text-primary font-bold',
                )}>
                  {format(day, 'd')}
                </span>

                {/* Task dots */}
                {dayTasks.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {dayTasks.slice(0, 3).map(t => (
                      <div key={t.id} className="flex items-center gap-1">
                        <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', TYPE_COLORS[t.type] || TYPE_COLORS.task)} />
                        <span className="text-[10px] truncate leading-tight">{t.title}</span>
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">+{dayTasks.length - 3} mais</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Side Panel - Selected Day */}
      {selectedDay && (
        <Card className="w-80 p-4 shrink-0">
          <h4 className="font-semibold mb-3">
            {isToday(selectedDay) ? 'Hoje' : format(selectedDay, "dd 'de' MMMM", { locale: ptBR })}
          </h4>

          {selectedDayTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum evento neste dia.</p>
          ) : (
            <ScrollArea className="max-h-[500px]">
              <div className="space-y-2">
                {selectedDayTasks.map(task => {
                  const Icon = TYPE_ICONS[task.type] || CheckSquare;
                  const time = task.scheduled_at ? format(new Date(task.scheduled_at), 'HH:mm') : '';
                  return (
                    <button
                      key={task.id}
                      onClick={() => onTaskClick?.(task)}
                      className="w-full text-left p-2.5 rounded-lg border hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          'h-6 w-6 rounded flex items-center justify-center shrink-0',
                          task.type === 'meeting' ? 'bg-primary/10 text-primary' :
                          task.type === 'call' ? 'bg-amber-500/10 text-amber-600' :
                          'bg-emerald-500/10 text-emerald-600',
                        )}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-sm font-medium truncate', task.status === 'completed' && 'line-through text-muted-foreground')}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {time && <span>{time}</span>}
                            {task.lead_name && <span>· {task.lead_name}</span>}
                          </div>
                        </div>
                        {task.status === 'completed' && (
                          <Badge variant="secondary" className="text-[10px]">Concluída</Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </Card>
      )}
    </div>
  );
}
