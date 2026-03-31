import { useState, useCallback } from 'react';
import { useCandidates, useGenerateCandidateToken, Candidate } from '@/hooks/useCandidates';
import { CandidateCard } from '@/components/interviews/CandidateCard';
import { CandidateDetailModal } from '@/components/interviews/CandidateDetailModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Copy, Loader2 } from 'lucide-react';

const statuses = [
  { value: 'all', label: 'Todos' },
  { value: 'registered', label: 'Registado' },
  { value: 'interview_scheduled', label: 'Agendado' },
  { value: 'interviewed', label: 'Entrevistado' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'rejected', label: 'Rejeitado' },
];

export default function InterviewsPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [position, setPosition] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();
  const generateToken = useGenerateCandidateToken();

  const { data: candidates, isLoading } = useCandidates(statusFilter);

  const filtered = candidates?.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.position?.toLowerCase().includes(q)
    );
  });

  const handleGenerate = useCallback(async () => {
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) return;

    try {
      const candidate = await generateToken.mutateAsync({
        position,
        created_by: profile.id,
      });

      const link = `${window.location.origin}/interview/${candidate.token}`;
      setGeneratedLink(link);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  }, [user, position, generateToken, toast]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Entrevistas</h1>
          <p className="text-sm text-muted-foreground">Faça a gestão de candidatos e entrevistas</p>
        </div>
        <Button onClick={() => { setShowGenerate(true); setGeneratedLink(''); setPosition(''); }}>
          <Plus className="h-4 w-4 mr-1" />
          Gerar Link
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar candidato..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statuses.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered && filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map(c => (
            <CandidateCard key={c.id} candidate={c} onClick={() => setSelectedCandidate(c)} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum candidato encontrado
        </div>
      )}

      {/* Detail modal */}
      <CandidateDetailModal
        candidate={selectedCandidate}
        open={!!selectedCandidate}
        onOpenChange={open => { if (!open) setSelectedCandidate(null); }}
      />

      {/* Generate link dialog */}
      <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar Link de Entrevista</DialogTitle>
          </DialogHeader>
          {!generatedLink ? (
            <div className="space-y-4">
              <div className="space-y-2">
                 <Label>Vaga / Cargo</Label>
                <Input
                  value={position}
                  onChange={e => setPosition(e.target.value)}
                  placeholder="Ex: Comercial, Analista de Marketing..."
                />
              </div>
              <DialogFooter>
                <Button onClick={handleGenerate} disabled={generateToken.isPending}>
                  {generateToken.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  Gerar
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
               <p className="text-sm text-muted-foreground">
                Envie este link ao candidato. Ele poderá preencher os seus dados e enviar a foto.
              </p>
              <div className="flex items-center gap-2">
                <Input value={generatedLink} readOnly className="text-xs" />
                <Button size="icon" variant="outline" onClick={() => {
                  navigator.clipboard.writeText(generatedLink);
                  toast({ title: 'Link copiado!' });
                }}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
