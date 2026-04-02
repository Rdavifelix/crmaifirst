import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Target } from 'lucide-react';
import type { Goal, GoalMetric, GoalRole, GoalUpsert } from '@/hooks/useGoals';
import type { Seller } from '@/hooks/useSellers';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GoalFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (payload: GoalUpsert) => Promise<void>;
  editingGoal: Goal | null;
  period: string;
  sellers: Seller[];
}

const METRIC_LABELS: Record<GoalMetric, string> = {
  receita: 'Receita',
  vendas: 'Vendas',
  leads: 'Leads',
  agendamentos: 'Agendamentos',
};

export function GoalFormDialog({
  open,
  onClose,
  onSave,
  editingGoal,
  period,
  sellers,
}: GoalFormDialogProps) {
  const [memberName, setMemberName] = useState<string>('__team__');
  const [role, setRole] = useState<GoalRole | ''>('');
  const [metric, setMetric] = useState<GoalMetric>('receita');
  const [target, setTarget] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingGoal) {
      setMemberName(editingGoal.member_name ?? '__team__');
      setRole(editingGoal.role ?? '');
      setMetric(editingGoal.metric);
      setTarget(String(editingGoal.target));
    } else {
      setMemberName('__team__');
      setRole('');
      setMetric('receita');
      setTarget('');
    }
  }, [editingGoal, open]);

  const periodLabel = (() => {
    try {
      const d = parse(period, 'yyyy-MM', new Date());
      return format(d, "MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return period;
    }
  })();

  const handleSave = async () => {
    const numTarget = parseFloat(target);
    if (!target || isNaN(numTarget) || numTarget <= 0) return;

    setSaving(true);
    await onSave({
      period,
      member_name: memberName === '__team__' ? null : memberName,
      role: memberName === '__team__' ? null : (role as GoalRole) || null,
      metric,
      target: numTarget,
    });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {editingGoal ? 'Editar Meta' : 'Nova Meta'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Período</Label>
            <p className="text-sm font-medium capitalize">{periodLabel}</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Membro</Label>
            <Select value={memberName} onValueChange={setMemberName}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__team__">Equipe (Geral)</SelectItem>
                {sellers.map((s) => (
                  <SelectItem key={s.id} value={s.full_name || s.id}>
                    {s.full_name || 'Sem nome'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {memberName !== '__team__' && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Função</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as GoalRole)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SDR">SDR</SelectItem>
                  <SelectItem value="Closer">Closer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Métrica</Label>
            <Select
              value={metric}
              onValueChange={(v) => setMetric(v as GoalMetric)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(METRIC_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Valor da Meta {metric === 'receita' ? '(R$)' : ''}
            </Label>
            <Input
              type="number"
              min={0}
              step={metric === 'receita' ? '0.01' : '1'}
              placeholder={metric === 'receita' ? 'Ex: 50000' : 'Ex: 10'}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !target || parseFloat(target) <= 0}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
