import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Plus, Trash2, GripVertical, Save, ArrowUp, ArrowDown, Pencil, X, Check, GitBranch,
} from "lucide-react";
import { usePipelineStages, useSavePipelineStage, useDeletePipelineStage, type PipelineStage } from "@/hooks/useAISalesAgent";
import { toast } from "sonner";

const DEFAULT_COLORS = [
  "#6B7280", "#3B82F6", "#F59E0B", "#EF4444", "#10B981",
  "#8B5CF6", "#EC4899", "#F97316", "#06B6D4", "#84CC16",
];

export function PipelineSettings() {
  const { data: stages, isLoading } = usePipelineStages();
  const saveStage = useSavePipelineStage();
  const deleteStage = useDeletePipelineStage();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newStage, setNewStage] = useState({ name: "", display_name: "", color: "#3B82F6", is_terminal: false });

  const handleAdd = () => {
    if (!newStage.name.trim() || !newStage.display_name.trim()) {
      toast.error("Preencha o nome interno e o nome de exibição");
      return;
    }
    const slug = newStage.name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    const maxOrder = Math.max(0, ...(stages || []).map((s) => s.sort_order));
    saveStage.mutate(
      {
        name: slug,
        display_name: newStage.display_name,
        color: newStage.color,
        sort_order: maxOrder + 1,
        is_terminal: newStage.is_terminal,
        is_active: true,
      },
      {
        onSuccess: () => {
          setNewStage({ name: "", display_name: "", color: "#3B82F6", is_terminal: false });
          setShowAdd(false);
        },
      }
    );
  };

  const handleMove = (stage: PipelineStage, direction: "up" | "down") => {
    if (!stages) return;
    const sorted = [...stages].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((s) => s.id === stage.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const other = sorted[swapIdx];
    saveStage.mutate({ id: stage.id, name: stage.name, display_name: stage.display_name, sort_order: other.sort_order });
    saveStage.mutate({ id: other.id, name: other.name, display_name: other.display_name, sort_order: stage.sort_order });
  };

  const handleDelete = (stage: PipelineStage) => {
    if (["new", "won", "lost"].includes(stage.name)) {
      toast.error(`O estágio "${stage.display_name}" é obrigatório e não pode ser removido`);
      return;
    }
    deleteStage.mutate(stage.id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const sorted = [...(stages || [])].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Etapas do Funil de Vendas
          </CardTitle>
          <CardDescription>
            Configure as etapas pelas quais os leads passam no seu processo de vendas.
            Arraste para reordenar, edite nomes e cores, ou crie novas etapas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sorted.map((stage, idx) => (
            <StageRow
              key={stage.id}
              stage={stage}
              isFirst={idx === 0}
              isLast={idx === sorted.length - 1}
              isEditing={editingId === stage.id}
              onEdit={() => setEditingId(editingId === stage.id ? null : stage.id)}
              onSave={(updates) => {
                saveStage.mutate(
                  { id: stage.id, name: stage.name, ...updates },
                  { onSuccess: () => setEditingId(null) }
                );
              }}
              onMove={(dir) => handleMove(stage, dir)}
              onDelete={() => handleDelete(stage)}
              saving={saveStage.isPending}
            />
          ))}

          {/* Add new stage */}
          {showAdd ? (
            <div className="p-4 border rounded-lg bg-accent/50 space-y-3">
              <p className="text-sm font-medium">Nova Etapa</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Nome de Exibição</Label>
                  <Input
                    placeholder="Ex: Avaliação Agendada"
                    value={newStage.display_name}
                    onChange={(e) =>
                      setNewStage({
                        ...newStage,
                        display_name: e.target.value,
                        name: e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Nome Interno (slug)</Label>
                  <Input
                    placeholder="avaliacao_agendada"
                    value={newStage.name}
                    onChange={(e) => setNewStage({ ...newStage, name: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <Label className="text-xs">Cor</Label>
                  <div className="flex gap-1 mt-1">
                    {DEFAULT_COLORS.map((c) => (
                      <button
                        key={c}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${
                          newStage.color === c ? "border-foreground scale-110" : "border-transparent"
                        }`}
                        style={{ backgroundColor: c }}
                        onClick={() => setNewStage({ ...newStage, color: c })}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <Label className="text-xs">Etapa final?</Label>
                  <Switch
                    checked={newStage.is_terminal}
                    onCheckedChange={(v) => setNewStage({ ...newStage, is_terminal: v })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAdd} disabled={saveStage.isPending}>
                  {saveStage.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                  Adicionar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" className="w-full" onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Etapa
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como funciona</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Etapas normais</strong> representam fases do processo de vendas (ex: Novo, Em Negociação).
            O lead avança entre elas conforme o atendimento.
          </p>
          <p>
            <strong>Etapas finais</strong> (como Ganho e Perdido) encerram o funil. Quando um lead chega
            a uma etapa final, a conversa é considerada concluída.
          </p>
          <p>
            <strong>Novo, Ganho e Perdido</strong> são obrigatórios e não podem ser removidos, mas podem ser renomeados.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function StageRow({
  stage,
  isFirst,
  isLast,
  isEditing,
  onEdit,
  onSave,
  onMove,
  onDelete,
  saving,
}: {
  stage: PipelineStage;
  isFirst: boolean;
  isLast: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (updates: { display_name: string; color: string; is_terminal: boolean }) => void;
  onMove: (dir: "up" | "down") => void;
  onDelete: () => void;
  saving: boolean;
}) {
  const [editName, setEditName] = useState(stage.display_name);
  const [editColor, setEditColor] = useState(stage.color);
  const [editTerminal, setEditTerminal] = useState(stage.is_terminal);
  const isProtected = ["new", "won", "lost"].includes(stage.name);

  if (isEditing) {
    return (
      <div className="p-3 border rounded-lg bg-accent/30 space-y-3">
        <div className="flex gap-3">
          <div className="flex-1">
            <Label className="text-xs">Nome de Exibição</Label>
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Slug</Label>
            <Input value={stage.name} disabled className="bg-muted w-40" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div>
            <Label className="text-xs">Cor</Label>
            <div className="flex gap-1 mt-1">
              {DEFAULT_COLORS.map((c) => (
                <button
                  key={c}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${
                    editColor === c ? "border-foreground scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setEditColor(c)}
                />
              ))}
            </div>
          </div>
          {!isProtected && (
            <div className="flex items-center gap-2 ml-auto">
              <Label className="text-xs">Etapa final?</Label>
              <Switch checked={editTerminal} onCheckedChange={setEditTerminal} />
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => onSave({ display_name: editName, color: editColor, is_terminal: editTerminal })}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
            Salvar
          </Button>
          <Button size="sm" variant="ghost" onClick={onEdit}>
            <X className="h-4 w-4 mr-1" /> Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/30 transition-colors group">
      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{stage.display_name}</span>
          <span className="text-xs text-muted-foreground">({stage.name})</span>
          {stage.is_terminal && (
            <Badge variant="outline" className="text-xs px-1.5 py-0">
              Final
            </Badge>
          )}
          {!stage.is_active && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              Inactivo
            </Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMove("up")} disabled={isFirst}>
          <ArrowUp className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMove("down")} disabled={isLast}>
          <ArrowDown className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        {!isProtected && (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
