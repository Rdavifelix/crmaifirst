import { useState, useMemo } from "react";
import {
  useSheetsLeads,
  useCreateSheetsLead,
  useUpdateSheetsLead,
  useDeleteSheetsLead,
  type SheetsLead,
  type SheetsLeadInsert,
} from "@/hooks/useSheetsLeadsCrud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Phone,
  Mail,
  DollarSign,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const STATUS_VENDA_OPTIONS = [
  "", "Venda", "Não fechou", "No show", "Reagendou", "Sem decisão",
];

const STATUS_CALL_OPTIONS = [
  "", "Call Realizada", "No Show", "Reagendou", "Cancelou",
];

const ROWS_PER_PAGE = 25;

const fmtDate = (d: string | null) => {
  if (!d) return "";
  const parts = d.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return d;
};

const fmtBRL = (v: number) =>
  v > 0
    ? `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "-";

// ── Empty form ───────────────────────────────────────────────────────────────

function emptyForm(): Partial<SheetsLeadInsert> {
  return {
    nome: "",
    email: "",
    telefone: "",
    instagram: "",
    origem: "",
    faturamento: "",
    profissao: "",
    socio: "",
    mql: "",
    lead_scoring: "",
    data_cadastro: new Date().toISOString().slice(0, 10),
    data_contato: null,
    data_agendamento: null,
    data_call: null,
    hora_call: "",
    sdr: "",
    status_call: "",
    status_venda: "",
    motivo_noshow: "",
    cash_collected: 0,
    valor_total: 0,
    closer: "",
    produto_vendido: "",
    valor_oportunidade: 0,
    data_conclusao: null,
    razao_perda: "",
    link_reuniao: "",
    observacoes: "",
    data_2call: null,
    hora_2call: "",
    status_call_2: "",
    status_venda_2: "",
    motivo_noshow_2: "",
    cash_collected_2: 0,
    valor_total_2: 0,
    ad_name_email: "",
    ad_name_telefone: "",
  };
}

function leadToForm(lead: SheetsLead): Partial<SheetsLeadInsert> {
  const { id, row_hash, imported_at, updated_at, ...rest } = lead;
  return rest;
}

// ── Form Dialog ──────────────────────────────────────────────────────────────

function LeadFormDialog({
  open,
  onOpenChange,
  initialData,
  editId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: Partial<SheetsLeadInsert>;
  editId: string | null;
}) {
  const [form, setForm] = useState(initialData);
  const createMut = useCreateSheetsLead();
  const updateMut = useUpdateSheetsLead();

  const set = (key: string, value: string | number | null) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (editId) {
      await updateMut.mutateAsync({ id: editId, ...form });
    } else {
      await createMut.mutateAsync(form);
    }
    onOpenChange(false);
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editId ? "Editar Lead" : "Novo Lead"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          {/* ── Contato ─────────────────────── */}
          <fieldset>
            <legend className="text-sm font-semibold text-muted-foreground mb-3">Contato</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Nome</Label><Input value={form.nome ?? ""} onChange={(e) => set("nome", e.target.value)} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} /></div>
              <div><Label>Telefone</Label><Input value={form.telefone ?? ""} onChange={(e) => set("telefone", e.target.value)} /></div>
              <div><Label>Instagram</Label><Input value={form.instagram ?? ""} onChange={(e) => set("instagram", e.target.value)} /></div>
              <div><Label>Origem</Label><Input value={form.origem ?? ""} onChange={(e) => set("origem", e.target.value)} /></div>
              <div><Label>Data Cadastro</Label><Input type="date" value={form.data_cadastro ?? ""} onChange={(e) => set("data_cadastro", e.target.value || null)} /></div>
            </div>
          </fieldset>

          {/* ── Perfil ─────────────────────── */}
          <fieldset>
            <legend className="text-sm font-semibold text-muted-foreground mb-3">Perfil</legend>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label>Profissão</Label><Input value={form.profissao ?? ""} onChange={(e) => set("profissao", e.target.value)} /></div>
              <div><Label>Faturamento</Label><Input value={form.faturamento ?? ""} onChange={(e) => set("faturamento", e.target.value)} /></div>
              <div><Label>Sócio</Label><Input value={form.socio ?? ""} onChange={(e) => set("socio", e.target.value)} /></div>
              <div><Label>MQL</Label><Input value={form.mql ?? ""} onChange={(e) => set("mql", e.target.value)} /></div>
              <div><Label>Lead Scoring</Label><Input value={form.lead_scoring ?? ""} onChange={(e) => set("lead_scoring", e.target.value)} /></div>
            </div>
          </fieldset>

          {/* ── 1a Call ─────────────────────── */}
          <fieldset>
            <legend className="text-sm font-semibold text-muted-foreground mb-3">1a Call</legend>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label>Data Contato</Label><Input type="date" value={form.data_contato ?? ""} onChange={(e) => set("data_contato", e.target.value || null)} /></div>
              <div><Label>Data Agendamento</Label><Input type="date" value={form.data_agendamento ?? ""} onChange={(e) => set("data_agendamento", e.target.value || null)} /></div>
              <div><Label>Data Call</Label><Input type="date" value={form.data_call ?? ""} onChange={(e) => set("data_call", e.target.value || null)} /></div>
              <div><Label>Hora Call</Label><Input value={form.hora_call ?? ""} onChange={(e) => set("hora_call", e.target.value)} placeholder="14:00" /></div>
              <div><Label>SDR</Label><Input value={form.sdr ?? ""} onChange={(e) => set("sdr", e.target.value)} /></div>
              <div><Label>Closer</Label><Input value={form.closer ?? ""} onChange={(e) => set("closer", e.target.value)} /></div>
              <div>
                <Label>Status Call</Label>
                <Select value={form.status_call ?? ""} onValueChange={(v) => set("status_call", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{STATUS_CALL_OPTIONS.map((s) => <SelectItem key={s || "empty"} value={s || " "}>{s || "(vazio)"}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status Venda</Label>
                <Select value={form.status_venda ?? ""} onValueChange={(v) => set("status_venda", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{STATUS_VENDA_OPTIONS.map((s) => <SelectItem key={s || "empty"} value={s || " "}>{s || "(vazio)"}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Motivo No-Show</Label><Input value={form.motivo_noshow ?? ""} onChange={(e) => set("motivo_noshow", e.target.value)} /></div>
              <div><Label>Cash Collected (R$)</Label><Input type="number" step="0.01" value={form.cash_collected ?? 0} onChange={(e) => set("cash_collected", parseFloat(e.target.value) || 0)} /></div>
              <div><Label>Valor Total (R$)</Label><Input type="number" step="0.01" value={form.valor_total ?? 0} onChange={(e) => set("valor_total", parseFloat(e.target.value) || 0)} /></div>
              <div><Label>Produto Vendido</Label><Input value={form.produto_vendido ?? ""} onChange={(e) => set("produto_vendido", e.target.value)} /></div>
              <div><Label>Valor Oportunidade (R$)</Label><Input type="number" step="0.01" value={form.valor_oportunidade ?? 0} onChange={(e) => set("valor_oportunidade", parseFloat(e.target.value) || 0)} /></div>
              <div><Label>Data Conclusão</Label><Input type="date" value={form.data_conclusao ?? ""} onChange={(e) => set("data_conclusao", e.target.value || null)} /></div>
              <div><Label>Razão da Perda</Label><Input value={form.razao_perda ?? ""} onChange={(e) => set("razao_perda", e.target.value)} /></div>
            </div>
          </fieldset>

          {/* ── 2a Call ─────────────────────── */}
          <fieldset>
            <legend className="text-sm font-semibold text-muted-foreground mb-3">2a Call</legend>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label>Data 2a Call</Label><Input type="date" value={form.data_2call ?? ""} onChange={(e) => set("data_2call", e.target.value || null)} /></div>
              <div><Label>Hora 2a Call</Label><Input value={form.hora_2call ?? ""} onChange={(e) => set("hora_2call", e.target.value)} placeholder="14:00" /></div>
              <div>
                <Label>Status Call 2</Label>
                <Select value={form.status_call_2 ?? ""} onValueChange={(v) => set("status_call_2", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{STATUS_CALL_OPTIONS.map((s) => <SelectItem key={s || "empty2"} value={s || " "}>{s || "(vazio)"}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status Venda 2</Label>
                <Select value={form.status_venda_2 ?? ""} onValueChange={(v) => set("status_venda_2", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{STATUS_VENDA_OPTIONS.map((s) => <SelectItem key={s || "empty3"} value={s || " "}>{s || "(vazio)"}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Motivo No-Show 2</Label><Input value={form.motivo_noshow_2 ?? ""} onChange={(e) => set("motivo_noshow_2", e.target.value)} /></div>
              <div><Label>Cash Collected 2 (R$)</Label><Input type="number" step="0.01" value={form.cash_collected_2 ?? 0} onChange={(e) => set("cash_collected_2", parseFloat(e.target.value) || 0)} /></div>
              <div><Label>Valor Total 2 (R$)</Label><Input type="number" step="0.01" value={form.valor_total_2 ?? 0} onChange={(e) => set("valor_total_2", parseFloat(e.target.value) || 0)} /></div>
            </div>
          </fieldset>

          {/* ── Extras ─────────────────────── */}
          <fieldset>
            <legend className="text-sm font-semibold text-muted-foreground mb-3">Outros</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Link Reunião</Label><Input value={form.link_reuniao ?? ""} onChange={(e) => set("link_reuniao", e.target.value)} /></div>
              <div><Label>Ad Name (Email)</Label><Input value={form.ad_name_email ?? ""} onChange={(e) => set("ad_name_email", e.target.value)} /></div>
              <div><Label>Ad Name (Telefone)</Label><Input value={form.ad_name_telefone ?? ""} onChange={(e) => set("ad_name_telefone", e.target.value)} /></div>
            </div>
            <div className="mt-4">
              <Label>Observações</Label>
              <Textarea rows={3} value={form.observacoes ?? ""} onChange={(e) => set("observacoes", e.target.value)} />
            </div>
          </fieldset>
        </div>

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (!status.trim()) return <span className="text-muted-foreground text-xs">-</span>;
  const isVenda = /^venda$/i.test(status.trim());
  const isNoShow = /no\s*show/i.test(status);
  const color = isVenda
    ? "bg-emerald-100 text-emerald-700"
    : isNoShow
    ? "bg-red-100 text-red-700"
    : "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {status}
    </span>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function PipelineVendasPage() {
  const { data: leads, isLoading } = useSheetsLeads();
  const deleteMut = useDeleteSheetsLead();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editLead, setEditLead] = useState<SheetsLead | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!leads) return [];
    return leads.filter((l) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        l.nome.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.telefone.includes(q) ||
        l.closer.toLowerCase().includes(q) ||
        l.sdr.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "venda" && /^venda$/i.test(l.status_venda.trim())) ||
        (statusFilter === "noshow" && /no\s*show/i.test(l.status_call)) ||
        (statusFilter === "pendente" && !l.status_venda.trim());
      return matchesSearch && matchesStatus;
    });
  }, [leads, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / ROWS_PER_PAGE);
  const paginated = filtered.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE);

  const handleEdit = (lead: SheetsLead) => {
    setEditLead(lead);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditLead(null);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteMut.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-[1600px]">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[500px] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-[1600px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1 text-muted-foreground">
            Gestão de Pipeline
          </p>
          <h1 className="text-3xl font-bold leading-none">Pipeline de Vendas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filtered.length} leads {search || statusFilter !== "all" ? "(filtrados)" : ""}
          </p>
        </div>
        <Button onClick={handleNew} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Lead
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email, telefone, closer ou SDR..."
            className="pl-10"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="venda">Vendas</SelectItem>
            <SelectItem value="noshow">No-Show</SelectItem>
            <SelectItem value="pendente">Pendentes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider">Nome</th>
              <th className="text-left py-3 px-3 font-semibold text-xs uppercase tracking-wider">Contato</th>
              <th className="text-left py-3 px-3 font-semibold text-xs uppercase tracking-wider">Cadastro</th>
              <th className="text-left py-3 px-3 font-semibold text-xs uppercase tracking-wider">SDR</th>
              <th className="text-left py-3 px-3 font-semibold text-xs uppercase tracking-wider">Closer</th>
              <th className="text-left py-3 px-3 font-semibold text-xs uppercase tracking-wider">Status Call</th>
              <th className="text-left py-3 px-3 font-semibold text-xs uppercase tracking-wider">Status Venda</th>
              <th className="text-right py-3 px-3 font-semibold text-xs uppercase tracking-wider">Cash</th>
              <th className="text-right py-3 px-3 font-semibold text-xs uppercase tracking-wider">Valor Total</th>
              <th className="text-center py-3 px-3 font-semibold text-xs uppercase tracking-wider w-24">Ações</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-12 text-muted-foreground">
                  Nenhum lead encontrado
                </td>
              </tr>
            ) : (
              paginated.map((l) => (
                <tr
                  key={l.id}
                  className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => handleEdit(l)}
                >
                  <td className="py-2.5 px-4">
                    <div className="font-medium">{l.nome || "-"}</div>
                    {l.profissao && (
                      <div className="text-xs text-muted-foreground">{l.profissao}</div>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex flex-col gap-0.5">
                      {l.telefone && (
                        <span className="flex items-center gap-1 text-xs">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          {l.telefone}
                        </span>
                      )}
                      {l.email && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          {l.email}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-xs">{fmtDate(l.data_cadastro)}</td>
                  <td className="py-2.5 px-3 text-xs">{l.sdr || "-"}</td>
                  <td className="py-2.5 px-3 text-xs font-medium">{l.closer || "-"}</td>
                  <td className="py-2.5 px-3"><StatusBadge status={l.status_call} /></td>
                  <td className="py-2.5 px-3"><StatusBadge status={l.status_venda} /></td>
                  <td className="py-2.5 px-3 text-right text-xs font-semibold text-emerald-600">
                    {l.cash_collected > 0 && <><DollarSign className="w-3 h-3 inline" />{fmtBRL(l.cash_collected)}</>}
                    {l.cash_collected === 0 && "-"}
                  </td>
                  <td className="py-2.5 px-3 text-right text-xs font-medium">
                    {fmtBRL(l.valor_total)}
                  </td>
                  <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleEdit(l)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(l.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Página {page + 1} de {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Form Dialog */}
      {dialogOpen && (
        <LeadFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          initialData={editLead ? leadToForm(editLead) : emptyForm()}
          editId={editLead?.id ?? null}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lead?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. O lead será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
