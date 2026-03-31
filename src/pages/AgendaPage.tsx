import { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, List, LayoutGrid, Plus, Clock, Video, AlertTriangle, CalendarClock, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { CalendarView } from '@/components/agenda/CalendarView';
import { WeekView } from '@/components/agenda/WeekView';
import { ListView } from '@/components/agenda/ListView';
import { EventModal } from '@/components/agenda/EventModal';
import { AvailabilitySettings } from '@/components/agenda/AvailabilitySettings';
import { useCalendarTasks, useCalendarStats, useUserAvailability, CalendarTask } from '@/hooks/useCalendar';
import { useSellers } from '@/hooks/useSellers';
import { supabase } from '@/integrations/supabase/client';
import { LeadTask } from '@/hooks/useLeadTasks';

type ViewMode = 'calendar' | 'week' | 'list';

export default function AgendaPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterType, setFilterType] = useState('all');
  const [filterAssigned, setFilterAssigned] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<LeadTask | null>(null);
  const [profileId, setProfileId] = useState('');

  const { data: sellers } = useSellers();

  // Get user profile
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('profiles').select('id').eq('user_id', user.id).single()
        .then(({ data }) => { if (data) setProfileId(data.id); });
    });
  }, []);

  // Calculate date ranges based on view
  const today = format(new Date(), 'yyyy-MM-dd');
  const wStart = format(startOfWeek(currentDate, { locale: ptBR }), 'yyyy-MM-dd');
  const wEnd = format(endOfWeek(currentDate, { locale: ptBR }), 'yyyy-MM-dd');
  const mStart = format(startOfMonth(currentDate), 'yyyy-MM-dd');
  const mEnd = format(endOfMonth(currentDate), 'yyyy-MM-dd');

  // For list view, show current month + next month
  const listEnd = format(endOfMonth(addMonths(currentDate, 1)), 'yyyy-MM-dd');

  const rangeStart = viewMode === 'calendar' ? mStart : viewMode === 'week' ? wStart : mStart;
  const rangeEnd = viewMode === 'calendar' ? mEnd : viewMode === 'week' ? wEnd : listEnd;

  const filters = {
    type: filterType !== 'all' ? filterType : undefined,
    assignedTo: filterAssigned !== 'all' ? filterAssigned : undefined,
    status: filterStatus !== 'all' ? filterStatus : undefined,
  };

  const { data: tasks = [], isLoading } = useCalendarTasks(rangeStart, rangeEnd, filters);
  const { data: stats } = useCalendarStats(today, wStart, wEnd);
  const { data: availability } = useUserAvailability(profileId);

  const handleTaskClick = (task: CalendarTask) => {
    setSelectedTask(task as LeadTask);
    setEventModalOpen(true);
  };

  const handleNewEvent = () => {
    setSelectedTask(null);
    setEventModalOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agenda</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus eventos, reuniões e tarefas.</p>
        </div>
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="h-4 w-4 mr-2" />
                Disponibilidade
              </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-lg">
              <SheetHeader>
                <SheetTitle>Configurar Disponibilidade</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <AvailabilitySettings />
              </div>
            </SheetContent>
          </Sheet>
          <Button onClick={handleNewEvent}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Evento
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.todayCount ?? 0}</p>
              <p className="text-xs text-muted-foreground">Eventos hoje</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Video className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.weekMeetings ?? 0}</p>
              <p className="text-xs text-muted-foreground">Reuniões esta semana</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.overdue ?? 0}</p>
              <p className="text-xs text-muted-foreground">Tarefas atrasadas</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CalendarClock className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium truncate">
                {stats?.nextMeeting?.title || 'Nenhuma'}
              </p>
              <p className="text-xs text-muted-foreground">
                {stats?.nextMeeting?.scheduled_at
                  ? format(new Date(stats.nextMeeting.scheduled_at), "dd/MM HH:mm")
                  : 'Próxima reunião'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters + View Toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="task">Tarefa</SelectItem>
              <SelectItem value="meeting">Reunião</SelectItem>
              <SelectItem value="call">Ligação</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterAssigned} onValueChange={setFilterAssigned}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {sellers?.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.full_name || 'Sem nome'}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="completed">Concluída</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs value={viewMode} onValueChange={v => setViewMode(v as ViewMode)}>
          <TabsList>
            <TabsTrigger value="calendar" className="gap-1.5">
              <LayoutGrid className="h-4 w-4" />
              Mês
            </TabsTrigger>
            <TabsTrigger value="week" className="gap-1.5">
              <CalendarDays className="h-4 w-4" />
              Semana
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-1.5">
              <List className="h-4 w-4" />
              Lista
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Views */}
      <div>
        {viewMode === 'calendar' && (
          <CalendarView
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            tasks={tasks}
            onTaskClick={handleTaskClick}
          />
        )}
        {viewMode === 'week' && (
          <WeekView
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            tasks={tasks}
            availability={availability}
            onTaskClick={handleTaskClick}
          />
        )}
        {viewMode === 'list' && (
          <ListView
            tasks={tasks}
            onTaskClick={handleTaskClick}
          />
        )}
      </div>

      {/* Event Modal */}
      <EventModal
        open={eventModalOpen}
        onClose={() => { setEventModalOpen(false); setSelectedTask(null); }}
        task={selectedTask}
      />
    </div>
  );
}
