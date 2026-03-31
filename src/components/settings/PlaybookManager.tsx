import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, BookOpen, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { usePlaybooks, PlaybookPhase, SalesPlaybook } from '@/hooks/usePlaybooks';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// ── Empty templates ────────────────────────────────────────────────
const emptyPhase = (): PlaybookPhase => ({
  name: '',
  description: '',
  checklist: [{ label: '' }],
  forbidden_topics: [],
  tips: '',
});

// ── Phase Editor ───────────────────────────────────────────────────
function PhaseEditor({
  phase,
  index,
  onChange,
  onRemove,
}: {
  phase: PlaybookPhase;
  index: number;
  onChange: (p: PlaybookPhase) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <Card className="border-l-4 border-l-primary/30">
      <CardHeader className="py-2 px-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Fase {index + 1}</span>
            <Input
              value={phase.name}
              onChange={(e) => onChange({ ...phase, name: e.target.value })}
              placeholder="Nome da fase"
              className="h-7 text-sm font-semibold w-40"
            />
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onRemove}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="px-3 pb-3 space-y-3">
          <div>
            <Label className="text-xs">Descrição</Label>
            <Input
              value={phase.description || ''}
              onChange={(e) => onChange({ ...phase, description: e.target.value })}
              placeholder="Breve descrição"
              className="h-7 text-xs"
            />
          </div>

          {/* Checklist — just labels, AI handles detection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Checklist (a IA detecta automaticamente)</Label>
            {phase.checklist.map((item, idx) => (
              <div key={idx} className="flex gap-1.5 items-center">
                <Input
                  value={item.label}
                  onChange={(e) => {
                    const updated = [...phase.checklist];
                    updated[idx] = { label: e.target.value };
                    onChange({ ...phase, checklist: updated });
                  }}
                  placeholder="Ex: Se apresentar com nome e empresa"
                  className="h-7 text-xs flex-1"
                />
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => {
                  const updated = phase.checklist.filter((_, i) => i !== idx);
                  onChange({ ...phase, checklist: updated });
                }}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => onChange({ ...phase, checklist: [...phase.checklist, { label: '' }] })}>
              <Plus className="h-3 w-3 mr-1" /> Item
            </Button>
          </div>

          {/* Forbidden Topics — just descriptions */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-destructive">Tópicos Proibidos</Label>
            {phase.forbidden_topics.map((ft, idx) => (
              <div key={idx} className="flex gap-1.5 items-center">
                <Input
                  value={ft}
                  onChange={(e) => {
                    const updated = [...phase.forbidden_topics];
                    updated[idx] = e.target.value;
                    onChange({ ...phase, forbidden_topics: updated });
                  }}
                  placeholder="Ex: Não falar de preço antes de apresentar a solução"
                  className="h-7 text-xs flex-1"
                />
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => {
                  const updated = phase.forbidden_topics.filter((_, i) => i !== idx);
                  onChange({ ...phase, forbidden_topics: updated });
                }}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => onChange({ ...phase, forbidden_topics: [...phase.forbidden_topics, ''] })}>
              <Plus className="h-3 w-3 mr-1" /> Tópico proibido
            </Button>
          </div>

          {/* Tips */}
          <div>
            <Label className="text-xs">Dica para o comercial</Label>
            <Input
              value={phase.tips || ''}
              onChange={(e) => onChange({ ...phase, tips: e.target.value })}
              placeholder="Ex: Seja caloroso e genuíno"
              className="h-7 text-xs"
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ── Main Manager ───────────────────────────────────────────────────
export function PlaybookManager() {
  const { playbooks, isLoading, createPlaybook, updatePlaybook } = usePlaybooks();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [context, setContext] = useState('');
  const [phases, setPhases] = useState<PlaybookPhase[]>([emptyPhase()]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setContext('');
    setPhases([emptyPhase()]);
  };

  const openEdit = (pb: SalesPlaybook) => {
    setEditingId(pb.id);
    setName(pb.name);
    setDescription(pb.description || '');
    setContext(pb.context || '');
    setPhases(pb.phases.length > 0 ? pb.phases : [emptyPhase()]);
    setShowCreate(true);
  };

  const openCreate = () => {
    setEditingId(null);
    resetForm();
    setShowCreate(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    const cleanPhases = phases.filter(p => p.name.trim());
    if (editingId) {
      await updatePlaybook.mutateAsync({ id: editingId, name, description, context, phases: cleanPhases });
    } else {
      await createPlaybook.mutateAsync({ name, description, context, phases: cleanPhases });
    }
    setShowCreate(false);
    resetForm();
  };

  const updatePhase = (idx: number, phase: PlaybookPhase) => {
    const updated = [...phases];
    updated[idx] = phase;
    setPhases(updated);
  };

  const removePhase = (idx: number) => {
    if (phases.length <= 1) return;
    setPhases(phases.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Playbooks de Vendas</h3>
          <p className="text-sm text-muted-foreground">Configure roteiros — a IA detecta o progresso automaticamente</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Novo Playbook
        </Button>
      </div>

      <div className="grid gap-3">
        {playbooks.map(pb => (
          <Card key={pb.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => openEdit(pb)}>
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">{pb.name}</p>
                    {pb.description && <p className="text-xs text-muted-foreground">{pb.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-[10px]">{pb.phases.length} fases</Badge>
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={pb.is_active}
                      onCheckedChange={(checked) => updatePlaybook.mutate({ id: pb.id, is_active: checked })}
                    />
                    <span className="text-xs text-muted-foreground">{pb.is_active ? 'Ativo' : 'Inativo'}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {!isLoading && playbooks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>Nenhum playbook criado ainda</p>
          </div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar' : 'Novo'} Playbook</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-2">
            <div className="space-y-4 pb-4">
              <div className="grid gap-3">
                <div>
                  <Label>Nome</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Venda Consultiva" />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Breve descrição do playbook" />
                </div>
                <div>
                  <Label>Contexto para IA</Label>
                  <Textarea
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    placeholder="Contexto adicional que a IA deve considerar (produto, público-alvo, etc.)"
                    rows={2}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Fases do Playbook</Label>
                {phases.map((phase, idx) => (
                  <PhaseEditor
                    key={idx}
                    phase={phase}
                    index={idx}
                    onChange={(p) => updatePhase(idx, p)}
                    onRemove={() => removePhase(idx)}
                  />
                ))}
                <Button variant="outline" size="sm" onClick={() => setPhases([...phases, emptyPhase()])}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar Fase
                </Button>
              </div>
            </div>
          </ScrollArea>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!name.trim()}>
              {editingId ? 'Salvar' : 'Criar'} Playbook
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
