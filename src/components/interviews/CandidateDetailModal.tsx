import { useState, useCallback, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Candidate, InterviewSession, useInterviewSessions, useUpdateCandidate, useCreateInterviewSession, useUpdateInterviewSession } from '@/hooks/useCandidates';
import { InterviewTranscriptionPanel } from './InterviewTranscriptionPanel';
import { InterviewEndedModal } from './InterviewEndedModal';
import { useInterviewTranscription } from '@/hooks/useInterviewTranscription';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User, Video, FileText, CheckCircle, XCircle, Clock, Loader2, Copy, ExternalLink, MessageCircle, Send, Pencil, Check, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

interface CandidateDetailModalProps {
  candidate: Candidate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusLabels: Record<string, string> = {
  registered: 'Registado',
  interview_scheduled: 'Agendado',
  interviewed: 'Entrevistado',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
};

const signatureStatusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4 text-yellow-500" />,
  approved: <CheckCircle className="h-4 w-4 text-green-500" />,
  rejected: <XCircle className="h-4 w-4 text-red-500" />,
};

export function CandidateDetailModal({ candidate, open, onOpenChange }: CandidateDetailModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateCandidate = useUpdateCandidate();
  const createSession = useCreateInterviewSession();
  const updateSession = useUpdateInterviewSession();
  const { data: sessions } = useInterviewSessions(candidate?.id || '');
  const transcription = useInterviewTranscription();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');

  useEffect(() => {
    if (candidate && !isEditingContact) {
      setEditName(candidate.name || '');
      setEditEmail(candidate.email || '');
      setEditPhone(candidate.phone || '');
    }
  }, [candidate?.id, candidate?.name, candidate?.email, candidate?.phone, isEditingContact]);

  const handleScheduleMeet = useCallback(async () => {
    if (!candidate) return;
    setIsScheduling(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-meet-interview', {
        body: { candidate_id: candidate.id },
      });
      if (error) throw error;
      toast({ title: 'Reunião criada!', description: 'O link do Google Meet foi gerado.' });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });

      // Auto-send via WhatsApp if candidate has phone
      if (candidate.phone) {
        await handleSendWhatsApp();
      }
    } catch (err: any) {
      toast({ title: 'Erro ao criar reunião', description: err.message, variant: 'destructive' });
    } finally {
      setIsScheduling(false);
    }
  }, [candidate, toast, queryClient]);

  const handleSendWhatsApp = useCallback(async () => {
    if (!candidate) return;
    if (!candidate.phone) {
      toast({ title: 'Sem telefone', description: 'O candidato não tem número de telefone cadastrado.', variant: 'destructive' });
      return;
    }
    setIsSendingWhatsApp(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-candidate-whatsapp', {
        body: { candidate_id: candidate.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'WhatsApp enviado! 📱', description: 'O link da entrevista foi enviado ao candidato.' });
    } catch (err: any) {
      toast({ title: 'Erro ao enviar WhatsApp', description: err.message, variant: 'destructive' });
    } finally {
      setIsSendingWhatsApp(false);
    }
  }, [candidate, toast]);

  const handleStartTranscription = useCallback(async () => {
    if (!candidate || !user) return;

    // Get profile_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      toast({ title: 'Perfil não encontrado', variant: 'destructive' });
      return;
    }

    // Create session
    const session = await createSession.mutateAsync({
      candidate_id: candidate.id,
      profile_id: profile.id,
    });

    setActiveSessionId(session.id);
    await transcription.startTranscription(session.id, candidate.name || undefined);
  }, [candidate, user, createSession, transcription, toast]);

  const handleStopTranscription = useCallback(async () => {
    transcription.stopTranscription();

    if (!activeSessionId || !candidate) return;

    const finals = transcription.getFinalTranscriptions();

    // Save final transcriptions
    await updateSession.mutateAsync({
      id: activeSessionId,
      status: 'completed',
      transcriptions: finals,
      ended_at: new Date().toISOString(),
      duration_seconds: finals.length > 0
        ? Math.round((finals[finals.length - 1].timestamp - finals[0].timestamp) / 1000)
        : 0,
    });

    // Update candidate status
    await updateCandidate.mutateAsync({ id: candidate.id, status: 'interviewed' });

    // Trigger AI analysis
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-interview', {
        body: {
          session_id: activeSessionId,
          candidate_id: candidate.id,
        },
      });
      if (!error && data?.analysis) {
        setAnalysisData(data.analysis);
        setShowAnalysis(true);
      }
    } catch {
      // AI analysis failed silently
    } finally {
      setIsAnalyzing(false);
      setActiveSessionId(null);
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['interview-sessions'] });
    }
  }, [activeSessionId, candidate, transcription, updateSession, updateCandidate, queryClient]);

  const handleStatusChange = useCallback(async (status: string) => {
    if (!candidate) return;
    await updateCandidate.mutateAsync({ id: candidate.id, status });
  }, [candidate, updateCandidate]);

  const handleSaveContact = useCallback(async () => {
    if (!candidate) return;
    const updates: Partial<Candidate> & { id: string } = { id: candidate.id };
    if (editName !== (candidate.name || '')) updates.name = editName.trim() || null;
    if (editEmail !== (candidate.email || '')) updates.email = editEmail.trim() || null;
    if (editPhone !== (candidate.phone || '')) updates.phone = editPhone.trim() || null;

    if (Object.keys(updates).length > 1) {
      await updateCandidate.mutateAsync(updates);
    }
    setIsEditingContact(false);
  }, [candidate, editName, editEmail, editPhone, updateCandidate]);

  const handleCancelEdit = useCallback(() => {
    if (candidate) {
      setEditName(candidate.name || '');
      setEditEmail(candidate.email || '');
      setEditPhone(candidate.phone || '');
    }
    setIsEditingContact(false);
  }, [candidate]);

  if (!candidate) return null;

  const signatureData = candidate.signature_analysis as any;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={candidate.photo_url || undefined} />
                <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
              </Avatar>
              <div>
                <div>{candidate.name || 'Candidato'}</div>
                <div className="text-sm font-normal text-muted-foreground">{candidate.position || '—'}</div>
              </div>
            </SheetTitle>
          </SheetHeader>

          <Tabs defaultValue="info" className="mt-4">
            <TabsList className="w-full">
              <TabsTrigger value="info" className="flex-1">Dados</TabsTrigger>
              <TabsTrigger value="interview" className="flex-1">Entrevista</TabsTrigger>
              <TabsTrigger value="history" className="flex-1">Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4 mt-4">
              {/* Status */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Select value={candidate.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Contact info */}
              <div className="space-y-2 text-sm">
                {isEditingContact ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Nome</label>
                      <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Nome do candidato" className="h-8" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Email</label>
                      <Input value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="email@exemplo.com" type="email" className="h-8" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Telefone</label>
                      <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="+244 9XX XXX XXX" className="h-8" />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveContact} disabled={updateCandidate.isPending}>
                        {updateCandidate.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                        Guardar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                        <X className="h-3 w-3 mr-1" /> Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div><strong>Nome:</strong> {candidate.name || '—'}</div>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setIsEditingContact(true)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                    <div><strong>Email:</strong> {candidate.email || '—'}</div>
                    <div><strong>Telefone:</strong> {candidate.phone || '—'}</div>
                    <div><strong>Vaga:</strong> {candidate.position || '—'}</div>
                  </div>
                )}
              </div>

              {/* Signature analysis */}
              <div className="border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Assinatura</span>
                  {signatureStatusIcons[candidate.signature_status]}
                  <span className="text-xs text-muted-foreground capitalize">{candidate.signature_status}</span>
                </div>
                {candidate.photo_url && (
                  <img src={candidate.photo_url} alt="Foto" className="w-full h-40 object-cover rounded-md" />
                )}
                {signatureData && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    {signatureData.nome_legivel && <div>Nome: {signatureData.nome_extraido || '—'}</div>}
                    {signatureData.confianca != null && <div>Confiança: {signatureData.confianca}%</div>}
                    {signatureData.observacoes && <div>Obs: {signatureData.observacoes}</div>}
                  </div>
                )}
              </div>

              {/* Meet link */}
              {candidate.meet_link ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <a href={candidate.meet_link} target="_blank" rel="noopener noreferrer">
                        <Video className="h-4 w-4 mr-1" />
                        Abrir Meet
                      </a>
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => {
                      navigator.clipboard.writeText(candidate.meet_link!);
                      toast({ title: 'Link copiado!' });
                    }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  {candidate.phone && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-green-600 border-green-200 hover:bg-green-50"
                      onClick={handleSendWhatsApp}
                      disabled={isSendingWhatsApp}
                    >
                      {isSendingWhatsApp ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <MessageCircle className="h-4 w-4 mr-1" />
                      )}
                      Enviar link por WhatsApp
                    </Button>
                  )}
                </div>
              ) : (
                <Button size="sm" onClick={handleScheduleMeet} disabled={isScheduling}>
                  {isScheduling ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Video className="h-4 w-4 mr-1" />}
                  Agendar Entrevista (Google Meet)
                </Button>
              )}
            </TabsContent>

            <TabsContent value="interview" className="mt-4">
              <div className="border border-border rounded-lg h-[400px]">
                {isAnalyzing ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Analisando entrevista com IA...</p>
                  </div>
                ) : (
                  <InterviewTranscriptionPanel
                    transcriptions={transcription.transcriptions}
                    isTranscribing={transcription.isTranscribing}
                    error={transcription.error}
                    onStart={handleStartTranscription}
                    onStop={handleStopTranscription}
                  />
                )}
              </div>
            </TabsContent>

            <TabsContent value="history" className="mt-4 space-y-3">
              {sessions && sessions.length > 0 ? (
                sessions.map((s) => (
                  <div key={s.id} className="border border-border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{s.status}</Badge>
                      {s.ai_score != null && (
                        <span className="text-sm font-bold">{s.ai_score.toFixed(1)}/10</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {s.started_at && new Date(s.started_at).toLocaleString('pt-BR')}
                      {s.duration_seconds > 0 && ` • ${Math.round(s.duration_seconds / 60)} min`}
                    </div>
                    {s.ai_analysis && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setAnalysisData(s.ai_analysis);
                          setShowAnalysis(true);
                        }}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Ver Avaliação
                      </Button>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma entrevista realizada ainda.
                </p>
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <InterviewEndedModal
        open={showAnalysis}
        onOpenChange={setShowAnalysis}
        analysis={analysisData}
        candidateName={candidate.name || 'Candidato'}
      />
    </>
  );
}
