import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Plus, Loader2 } from 'lucide-react';
import { useLeadTasks, LeadTask } from '@/hooks/useLeadTasks';
import { useSellers } from '@/hooks/useSellers';
import { TaskCard } from './TaskCard';
import { NewTaskModal } from './NewTaskModal';
import { MeetingStartModal } from './MeetingStartModal';
import { MeetingTranscriptionModal } from '@/components/whatsapp/MeetingTranscriptionModal';

interface CapturedStreams {
  mic: MediaStream;
  display: MediaStream | null;
}

interface LeadTasksPanelProps {
  leadId: string;
  leadName: string | null;
}

export function LeadTasksPanel({ leadId, leadName }: LeadTasksPanelProps) {
  const { data: tasks, isLoading } = useLeadTasks(leadId);
  const { data: sellers } = useSellers();
  const [showNewTask, setShowNewTask] = useState(false);
  const [tab, setTab] = useState<'pending' | 'completed'>('pending');
  const [meetingTask, setMeetingTask] = useState<LeadTask | null>(null);
  const [showTranscription, setShowTranscription] = useState(false);
  const [capturedStreams, setCapturedStreams] = useState<CapturedStreams | null>(null);

  const pendingTasks = tasks?.filter(t => t.status !== 'completed') || [];
  const completedTasks = tasks?.filter(t => t.status === 'completed') || [];
  const displayed = tab === 'pending' ? pendingTasks : completedTasks;

  const getSellerName = (profileId: string | null) => {
    if (!profileId || !sellers) return undefined;
    return sellers.find(s => s.id === profileId)?.full_name || undefined;
  };

  const handleStartMeeting = (task: LeadTask) => {
    setMeetingTask(task);
  };

  const handleStartTranscription = (streams: CapturedStreams) => {
    setCapturedStreams(streams);
    setMeetingTask(null);
    setShowTranscription(true);
  };

  const handleCloseTranscription = () => {
    setShowTranscription(false);
    setCapturedStreams(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Tarefas</h3>
        </div>
        <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowNewTask(true)}>
          <Plus className="h-3.5 w-3.5" />
          Nova
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={tab === 'pending' ? 'default' : 'outline'}
          onClick={() => setTab('pending')}
          className="gap-1"
        >
          Pendentes
          <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
            {pendingTasks.length}
          </Badge>
        </Button>
        <Button
          size="sm"
          variant={tab === 'completed' ? 'default' : 'outline'}
          onClick={() => setTab('completed')}
          className="gap-1"
        >
          Concluídas
          <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
            {completedTasks.length}
          </Badge>
        </Button>
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {displayed.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            {tab === 'pending' ? 'Nenhuma tarefa pendente' : 'Nenhuma tarefa concluída'}
          </div>
        ) : (
          displayed.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onStartMeeting={handleStartMeeting}
              sellerName={getSellerName(task.assigned_to)}
            />
          ))
        )}
      </div>

      {/* Modals */}
      <NewTaskModal
        open={showNewTask}
        onClose={() => setShowNewTask(false)}
        leadId={leadId}
        leadName={leadName}
      />

      <MeetingStartModal
        open={!!meetingTask}
        onClose={() => setMeetingTask(null)}
        task={meetingTask}
        leadName={leadName}
        onStartTranscription={handleStartTranscription}
      />

      <MeetingTranscriptionModal
        open={showTranscription}
        onClose={handleCloseTranscription}
        leadId={leadId}
        leadName={leadName}
        preCapturedStreams={capturedStreams}
      />
    </div>
  );
}
