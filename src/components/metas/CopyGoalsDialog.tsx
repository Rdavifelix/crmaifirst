import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Copy, Loader2 } from 'lucide-react';
import { useGoals } from '@/hooks/useGoals';
import type { GoalUpsert } from '@/hooks/useGoals';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CopyGoalsDialogProps {
  open: boolean;
  onClose: () => void;
  onCopy: (goals: GoalUpsert[]) => Promise<void>;
  currentPeriod: string;
}

function buildMonthOptions(center: Date, range: number) {
  const options: { value: string; label: string }[] = [];
  for (let i = -range; i <= range; i++) {
    const d = addMonths(center, i);
    options.push({
      value: format(d, 'yyyy-MM'),
      label: format(d, "MMMM 'de' yyyy", { locale: ptBR }),
    });
  }
  return options;
}

export function CopyGoalsDialog({
  open,
  onClose,
  onCopy,
  currentPeriod,
}: CopyGoalsDialogProps) {
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [copying, setCopying] = useState(false);

  const { goals: sourceGoals, isLoading } = useGoals(source || '__none__');
  const monthOptions = buildMonthOptions(new Date(), 6);

  const handleCopy = async () => {
    if (!source || !destination || source === destination) return;
    if (sourceGoals.length === 0) return;

    setCopying(true);
    const payloads: GoalUpsert[] = sourceGoals.map((g) => ({
      period: destination,
      member_name: g.member_name,
      role: g.role,
      metric: g.metric,
      target: g.target,
    }));
    await onCopy(payloads);
    setCopying(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5 text-primary" />
            Copiar Metas
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Copiar de (origem)
            </Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o mês..." />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="capitalize">{opt.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Para (destino)
            </Label>
            <Select value={destination} onValueChange={setDestination}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o mês..." />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="capitalize">{opt.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {source && !isLoading && (
            <p className="text-sm text-muted-foreground">
              {sourceGoals.length === 0
                ? 'Nenhuma meta encontrada no mês de origem.'
                : `${sourceGoals.length} meta(s) serão copiadas.`}
            </p>
          )}
          {source && isLoading && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Carregando metas...
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleCopy}
            disabled={
              copying ||
              !source ||
              !destination ||
              source === destination ||
              sourceGoals.length === 0 ||
              isLoading
            }
          >
            {copying && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Copiar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
