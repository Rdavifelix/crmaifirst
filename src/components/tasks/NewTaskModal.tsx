import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Video, CheckSquare, Phone, Loader2, Link2, AlertTriangle } from 'lucide-react';
import { useCreateLeadTask } from '@/hooks/useLeadTasks';
import { useSellers } from '@/hooks/useSellers';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NewTaskModalProps {
  open: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string | null;
}

const TASK_TYPES = [
  { value: 'task', label: 'Tarefa', icon: CheckSquare },
  { value: 'meeting', label: 'Reunião', icon: Video },
  { value: 'call', label: 'Ligação', icon: Phone },
];

const DURATIONS = [
  { value: '15', label: '15 min' },
  { value: '30', label: '30 min' },
  { value: '45', label: '45 min' },
  { value: '60', label: '1 hora' },
  { value: '90', label: '1h30' },
  { value: '120', label: '2 horas' },
];

export function NewTaskModal({ open, onClose, leadId, leadName }: NewTaskModalProps) {
  const [type, setType] = useState('task');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [meetLink, setMeetLink] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [duration, setDuration] = useState('60');
  const [assignedTo, setAssignedTo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createTask = useCreateLeadTask();
  const { data: sellers } = useSellers();
  const [conflicts, setConflicts] = useState<Array<{ title: string; scheduled_at: string; duration_minutes: number | null }>>([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);

  // Check for schedule conflicts when assignee + date/time change
  useEffect(() => {
    const checkConflicts = async () => {
      if (!assignedTo || !scheduledDate) {
        setConflicts([]);
        return;
      }

      const time = scheduledTime || '09:00';
      const startDate = new Date(`${scheduledDate}T${time}`);
      const durationMins = parseInt(duration) || 60;
      const endDate = new Date(startDate.getTime() + durationMins * 60 * 1000);

      // Search tasks for this assignee that overlap the time range
      const dayStart = new Date(`${scheduledDate}T00:00:00`).toISOString();
      const dayEnd = new Date(`${scheduledDate}T23:59:59`).toISOString();

      setCheckingConflicts(true);
      try {
        const { data } = await supabase
          .from('lead_tasks')
          .select('title, scheduled_at, duration_minutes')
          .eq('assigned_to', assignedTo)
          .neq('status', 'completed')
          .gte('scheduled_at', dayStart)
          .lte('scheduled_at', dayEnd);

        if (!data) { setConflicts([]); return; }

        // Check time overlaps
        const overlapping = data.filter(task => {
          if (!task.scheduled_at) return false;
          const taskStart = new Date(task.scheduled_at);
          const taskDuration = task.duration_minutes || 60;
          const taskEnd = new Date(taskStart.getTime() + taskDuration * 60 * 1000);
          return startDate < taskEnd && endDate > taskStart;
        });

        setConflicts(overlapping);
      } catch {
        setConflicts([]);
      } finally {
        setCheckingConflicts(false);
      }
    };

    checkConflicts();
  }, [assignedTo, scheduledDate, scheduledTime, duration]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Perfil não encontrado');

      let scheduledAt: string | undefined;
      if (scheduledDate && scheduledTime) {
        scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
      } else if (scheduledDate) {
        scheduledAt = new Date(`${scheduledDate}T09:00`).toISOString();
      }

      await createTask.mutateAsync({
        lead_id: leadId,
        profile_id: profile.id,
        assigned_to: assignedTo || undefined,
        type,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        meet_link: type === 'meeting' && meetLink.trim() ? meetLink.trim() : undefined,
        scheduled_at: scheduledAt,
        duration_minutes: type === 'meeting' ? parseInt(duration) : undefined,
      });

      toast.success('Tarefa criada!');
      resetForm();
      onClose();
    } catch (err: any) {
      toast.error('Erro ao criar tarefa: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setType('task');
    setTitle('');
    setDescription('');
    setPriority('medium');
    setMeetLink('');
    setScheduledDate('');
    setScheduledTime('');
    setDuration('60');
    setAssignedTo('');
  };

  const TypeIcon = TASK_TYPES.find(t => t.value === type)?.icon || CheckSquare;

  return (
    <Dialog open={open} onOpenChange={() => { resetForm(); onClose(); }}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TypeIcon className="h-5 w-5 text-primary" />
            Nova Tarefa · {leadName || 'Lead'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          {/* Type */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    <span className="flex items-center gap-2">
                      <t.icon className="h-4 w-4" />
                      {t.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Responsible */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Responsável</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar..." />
              </SelectTrigger>
              <SelectContent>
                {sellers?.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.full_name || 'Sem nome'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs text-muted-foreground">Título *</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Apresentar proposta comercial"
            />
          </div>

          {/* Date & Time */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Data
            </Label>
            <Input
              type="date"
              value={scheduledDate}
              onChange={e => setScheduledDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Hora
            </Label>
            <Input
              type="time"
              value={scheduledTime}
              onChange={e => setScheduledTime(e.target.value)}
            />
          </div>

          {/* Duration (for meetings) */}
          {type === 'meeting' && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Duração</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATIONS.map(d => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Priority */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Prioridade</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Schedule conflict warning */}
          {conflicts.length > 0 && (
            <div className="col-span-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-1.5">
              <div className="flex items-center gap-2 text-amber-600 text-sm font-medium">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Conflito de agenda!
              </div>
              {conflicts.map((c, i) => {
                const start = new Date(c.scheduled_at);
                const dur = c.duration_minutes || 60;
                const end = new Date(start.getTime() + dur * 60 * 1000);
                const fmt = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                return (
                  <p key={i} className="text-xs text-amber-700">
                    • {c.title} — {fmt(start)} às {fmt(end)} ({dur}min)
                  </p>
                );
              })}
            </div>
          )}
          {type === 'meeting' && (
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Link2 className="h-3 w-3" />
                Link do Google Meet
              </Label>
              <Input
                value={meetLink}
                onChange={e => setMeetLink(e.target.value)}
                placeholder="https://meet.google.com/xxx-xxx-xxx"
              />
            </div>
          )}

          {/* Notes */}
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs text-muted-foreground">Notas</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Observações..."
              className="min-h-[80px]"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => { resetForm(); onClose(); }}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Criar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
