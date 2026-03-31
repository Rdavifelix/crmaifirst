import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Save } from 'lucide-react';
import { useUserAvailability, useUpdateAvailability, UserAvailability } from '@/hooks/useCalendar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const DAY_ABBREVS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface DayConfig {
  day_of_week: number;
  is_available: boolean;
  start_time: string;
  end_time: string;
}

export function AvailabilitySettings() {
  const [profileId, setProfileId] = useState('');
  const [days, setDays] = useState<DayConfig[]>(
    Array.from({ length: 7 }, (_, i) => ({
      day_of_week: i,
      is_available: i >= 1 && i <= 5,
      start_time: '09:00',
      end_time: '18:00',
    }))
  );

  const { data: availability, isLoading } = useUserAvailability(profileId);
  const updateAvailability = useUpdateAvailability();

  // Get current user profile
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('profiles').select('id').eq('user_id', user.id).single()
        .then(({ data }) => { if (data) setProfileId(data.id); });
    });
  }, []);

  // Populate from DB
  useEffect(() => {
    if (availability && availability.length > 0) {
      setDays(prev => prev.map(d => {
        const dbDay = availability.find(a => a.day_of_week === d.day_of_week);
        if (dbDay) return {
          day_of_week: d.day_of_week,
          is_available: dbDay.is_available,
          start_time: dbDay.start_time.slice(0, 5), // "09:00:00" -> "09:00"
          end_time: dbDay.end_time.slice(0, 5),
        };
        return d;
      }));
    }
  }, [availability]);

  const updateDay = (dayOfWeek: number, updates: Partial<DayConfig>) => {
    setDays(prev => prev.map(d =>
      d.day_of_week === dayOfWeek ? { ...d, ...updates } : d
    ));
  };

  const handleSave = async () => {
    if (!profileId) return;
    try {
      await updateAvailability.mutateAsync(
        days.map(d => ({
          profile_id: profileId,
          day_of_week: d.day_of_week,
          start_time: d.start_time,
          end_time: d.end_time,
          is_available: d.is_available,
        }))
      );
      toast.success('Disponibilidade salva!');
    } catch {
      toast.error('Erro ao salvar disponibilidade');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Horários de Disponibilidade</h3>
          <p className="text-sm text-muted-foreground">Configure seus horários de trabalho por dia da semana.</p>
        </div>
        <Button onClick={handleSave} disabled={updateAvailability.isPending} size="sm">
          {updateAvailability.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar
        </Button>
      </div>

      <div className="grid gap-2">
        {days.map(day => (
          <Card key={day.day_of_week} className="p-3">
            <div className="flex items-center gap-4">
              <div className="w-24 shrink-0">
                <Label className="font-medium text-sm">{DAY_NAMES[day.day_of_week]}</Label>
              </div>

              <Switch
                checked={day.is_available}
                onCheckedChange={v => updateDay(day.day_of_week, { is_available: v })}
              />

              {day.is_available ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    type="time"
                    value={day.start_time}
                    onChange={e => updateDay(day.day_of_week, { start_time: e.target.value })}
                    className="w-28"
                  />
                  <span className="text-sm text-muted-foreground">até</span>
                  <Input
                    type="time"
                    value={day.end_time}
                    onChange={e => updateDay(day.day_of_week, { end_time: e.target.value })}
                    className="w-28"
                  />
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Indisponível</span>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
