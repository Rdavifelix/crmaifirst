import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, ListChecks, PhoneOff } from 'lucide-react';
import { SalesPlaybook } from '@/hooks/usePlaybooks';

interface PlaybookSelectModalProps {
  open: boolean;
  playbooks: SalesPlaybook[];
  onSelect: (playbook: SalesPlaybook | null) => void;
  onCancel: () => void;
}

export function PlaybookSelectModal({ open, playbooks, onSelect, onCancel }: PlaybookSelectModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Selecionar Playbook
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Escolha um roteiro para o Sales Coach te guiar durante a chamada.
        </p>

        <div className="space-y-2 mt-2">
          {playbooks.map(pb => (
            <button
              key={pb.id}
              onClick={() => onSelect(pb)}
              className="w-full text-left p-3 rounded-lg border hover:border-primary/50 hover:bg-primary/5 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{pb.name}</span>
                <Badge variant="secondary" className="text-[10px]">
                  <ListChecks className="h-3 w-3 mr-1" />
                  {pb.phases.length} fases
                </Badge>
              </div>
              {pb.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{pb.description}</p>
              )}
            </button>
          ))}

          {playbooks.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum playbook ativo. Crie um em Configurações.
            </p>
          )}
        </div>

        <div className="flex gap-2 mt-2">
          <Button variant="outline" className="flex-1" onClick={() => onSelect(null)}>
            Sem coach
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            <PhoneOff className="h-4 w-4 mr-1" />
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
