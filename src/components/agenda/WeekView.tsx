import { format, addDays, startOfWeek, isSameDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CalendarTask } from '@/hooks/useCalendar';
import { UserAvailability } from '@/hooks/useCalendar';
import { cn } from '@/lib/utils';

interface WeekViewProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  tasks: CalendarTask[];
  availability?: UserAvailability[];
  onTaskClick?: (task: CalendarTask) => void;
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8h - 20h
const HOUR_HEIGHT = 60; // px per hour

const TYPE_STYLES: Record<string, string> = {
  meeting: 'bg-primary/20 border-primary/40 text-primary-foreground',
  call: 'bg-amber-500/20 border-amber-500/40',
  task: 'bg-emerald-500/20 border-emerald-500/40',
};

export function WeekView({ currentDate, onDateChange, tasks, availability, onTaskClick }: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { locale: ptBR });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const prevWeek = () => onDateChange(addDays(currentDate, -7));
  const nextWeek = () => onDateChange(addDays(currentDate, 7));

  const getTaskPosition = (task: CalendarTask) => {
    if (!task.scheduled_at) return null;
    const date = new Date(task.scheduled_at);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const top = (hours - 8) * HOUR_HEIGHT + (minutes / 60) * HOUR_HEIGHT;
    const height = Math.max(((task.duration_minutes || 30) / 60) * HOUR_HEIGHT, 24);
    return { top, height };
  };

  const isUnavailable = (dayOfWeek: number) => {
    if (!availability) return false;
    const dayAvail = availability.find(a => a.day_of_week === dayOfWeek);
    return dayAvail ? !dayAvail.is_available : true;
  };

  const getAvailabilityRange = (dayOfWeek: number) => {
    if (!availability) return { start: 8, end: 20 };
    const dayAvail = availability.find(a => a.day_of_week === dayOfWeek);
    if (!dayAvail || !dayAvail.is_available) return null;
    const [sh, sm] = dayAvail.start_time.split(':').map(Number);
    const [eh, em] = dayAvail.end_time.split(':').map(Number);
    return { start: sh + sm / 60, end: eh + em / 60 };
  };

  return (
    <div>
      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={prevWeek}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="font-semibold text-lg">
          {format(weekDays[0], "dd MMM", { locale: ptBR })} — {format(weekDays[6], "dd MMM yyyy", { locale: ptBR })}
        </h3>
        <Button variant="ghost" size="icon" onClick={nextWeek}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Grid */}
      <div className="flex overflow-x-auto border rounded-lg">
        {/* Time Column */}
        <div className="shrink-0 w-16 border-r">
          <div className="h-12 border-b" /> {/* Header spacer */}
          {HOURS.map(h => (
            <div key={h} className="h-[60px] border-b px-2 text-xs text-muted-foreground flex items-start pt-1">
              {`${h.toString().padStart(2, '0')}:00`}
            </div>
          ))}
        </div>

        {/* Day Columns */}
        {weekDays.map((day, dayIdx) => {
          const dayTasks = tasks.filter(t => t.scheduled_at && isSameDay(new Date(t.scheduled_at), day));
          const unavailable = isUnavailable(day.getDay());
          const range = getAvailabilityRange(day.getDay());

          return (
            <div key={dayIdx} className="flex-1 min-w-[120px] border-r last:border-r-0">
              {/* Day Header */}
              <div className={cn(
                'h-12 border-b flex flex-col items-center justify-center',
                isToday(day) && 'bg-primary/5',
              )}>
                <span className="text-[10px] uppercase text-muted-foreground">
                  {format(day, 'EEE', { locale: ptBR })}
                </span>
                <span className={cn(
                  'text-sm font-semibold',
                  isToday(day) && 'text-primary',
                )}>
                  {format(day, 'd')}
                </span>
              </div>

              {/* Hours Grid */}
              <div className="relative">
                {HOURS.map(h => {
                  const inRange = range && h >= range.start && h < range.end;
                  return (
                    <div
                      key={h}
                      className={cn(
                        'h-[60px] border-b',
                        unavailable ? 'bg-muted/50' : !inRange ? 'bg-muted/20' : '',
                      )}
                    />
                  );
                })}

                {/* Task blocks */}
                {dayTasks.map(task => {
                  const pos = getTaskPosition(task);
                  if (!pos || pos.top < 0) return null;

                  return (
                    <button
                      key={task.id}
                      onClick={() => onTaskClick?.(task)}
                      className={cn(
                        'absolute left-0.5 right-0.5 rounded px-1.5 py-0.5 text-left border overflow-hidden cursor-pointer hover:opacity-80 transition-opacity',
                        TYPE_STYLES[task.type] || TYPE_STYLES.task,
                        task.status === 'completed' && 'opacity-50',
                      )}
                      style={{ top: pos.top, height: pos.height }}
                    >
                      <p className="text-[10px] font-medium truncate">{task.title}</p>
                      {pos.height >= 36 && task.scheduled_at && (
                        <p className="text-[9px] opacity-70">
                          {format(new Date(task.scheduled_at), 'HH:mm')}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
