import { useState, useEffect } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Lead, useLeadMessages, useLeadStatusHistory, useLeadPostSaleStages, useUpdateLead, useLead } from '@/hooks/useLeads';
import { useLeadMeetings, LeadMeeting } from '@/hooks/useLeadMeetings';
import { useInstagramContent, useEnrichInstagram, InstagramProfile } from '@/hooks/useInstagramData';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LEAD_STATUSES, LeadStatus, LOSS_REASONS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { AIAgentBadge } from '@/components/inbox/AIAgentBadge';
import { 
  Sparkles, 
  Phone, 
  Mail,
  Calendar, 
  DollarSign,
  Clock,
  AlertTriangle,
  Loader2,
  Zap,
  User,
  Instagram,
  History,
  Target,
  ExternalLink,
  Link2,
  Heart,
  Grid3X3,
  CheckCircle2,
  RefreshCw,
  Search,
  ArrowRight,
  Globe,
  MessageCircle,
  Briefcase,
  X,
  Pencil,
  Save,
  Video,
  ChevronDown,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { SalesDossierTab } from './SalesDossierTab';
import { LeadTasksPanel } from '@/components/tasks/LeadTasksPanel';
import { LeadTimeline } from './LeadTimeline';
import { LeadStatusPipeline } from './LeadStatusPipeline';
import { LeadQuickMetrics } from './LeadQuickMetrics';
import { SalesScoreBANT } from './SalesScoreBANT';
import { useNavigate } from 'react-router-dom';
import { CallButton } from '@/components/calls/CallButton';

interface LeadDetailModalProps {
  leadId: string | null;
  open: boolean;
  onClose: () => void;
}

interface AIAnalysis {
  healthScore?: number;
  engagementLabel?: string;
  nextBestAction?: string;
  predictedOutcomeLabel?: string;
  recommendations?: string[];
  attentionPoints?: string[];
}

export function LeadDetailModal({ leadId, open, onClose }: LeadDetailModalProps) {
  const navigate = useNavigate();
  const { data: lead, isLoading: loadingLead } = useLead(leadId || '');
  
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [instagramUsername, setInstagramUsername] = useState('');
  const [dealValue, setDealValue] = useState('');
  const [lossReason, setLossReason] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    notes: '',
  });

  const { data: messages } = useLeadMessages(leadId || '');
  const { data: statusHistory } = useLeadStatusHistory(leadId || '');
  const { data: postSaleStages } = useLeadPostSaleStages(leadId || '');
  const { data: instagramContent, isLoading: loadingContent } = useInstagramContent(leadId || '');
  const { data: meetings } = useLeadMeetings(leadId || '');
  const enrichMutation = useEnrichInstagram();
  const updateLead = useUpdateLead();

  const instagramData = lead?.instagram_data as InstagramProfile | null;
  const currentStageIndex = Object.keys(LEAD_STATUSES).indexOf(lead?.status || 'new');

  useEffect(() => {
    if (lead?.instagram_username) {
      setInstagramUsername(lead.instagram_username);
    }
  }, [lead?.instagram_username]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setAnalysis(null);
      setHasAnalyzed(false);
      setDealValue('');
      setLossReason('');
      setIsEditing(false);
    }
  }, [open]);

  // Sync edit form with lead data
  useEffect(() => {
    if (lead) {
      setEditForm({
        name: lead.name || '',
        phone: lead.phone || '',
        email: lead.email || '',
        notes: lead.notes || '',
      });
    }
  }, [lead]);

  const analyzeNow = async () => {
    if (!lead) return;
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-lead', {
        body: {
          lead,
          messages: messages?.slice(-10),
          statusHistory,
          postSaleStages,
        },
      });

      if (error) throw error;
      setAnalysis(data);
      setHasAnalyzed(true);
    } catch (err) {
      // Analysis failed
      toast.error('Erro ao analisar lead');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleEnrichInstagram = () => {
    if (!instagramUsername.trim() || !lead) return;
    enrichMutation.mutate({ leadId: lead.id, instagramUsername });
  };

  const handleStatusChange = async (newStatus: LeadStatus) => {
    if (!lead) return;
    const updates: Partial<Lead> & { id: string } = {
      id: lead.id,
      status: newStatus,
    };

    if (newStatus === 'won') {
      updates.closed_at = new Date().toISOString();
      updates.post_sale_status = 'awaiting_onboarding';
      if (dealValue) {
        updates.deal_value = parseFloat(dealValue);
      }
    } else if (newStatus === 'lost') {
      updates.closed_at = new Date().toISOString();
      updates.loss_reason = lossReason;
    }

    try {
      await updateLead.mutateAsync(updates);
      toast.success(`Status alterado para ${LEAD_STATUSES[newStatus].label}`);
      setDealValue('');
      setLossReason('');
    } catch (error) {
      toast.error('Erro ao alterar status');
    }
  };

  const handleSaveEdit = async () => {
    if (!lead) return;
    try {
      await updateLead.mutateAsync({
        id: lead.id,
        name: editForm.name || null,
        phone: editForm.phone,
        email: editForm.email || null,
        notes: editForm.notes || null,
      });
      setIsEditing(false);
      toast.success('Lead atualizado!');
    } catch {
      toast.error('Erro ao salvar');
    }
  };

  const handleOpenChat = () => {
    if (lead) {
      onClose();
      navigate(`/whatsapp?lead=${lead.id}`);
    }
  };

  const formatNumber = (num: number | undefined) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
    }).format(value);
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!leadId) return null;

  const statusConfig: Record<string, { gradient: string; label: string }> = {
    new: { gradient: 'from-blue-500 to-blue-600', label: 'Novo' },
    first_contact: { gradient: 'from-amber-500 to-orange-500', label: 'Primeiro Contacto' },
    negotiating: { gradient: 'from-pink-500 to-rose-500', label: 'Em Negociação' },
    proposal_sent: { gradient: 'from-orange-500 to-red-500', label: 'Proposta Enviada' },
    follow_up: { gradient: 'from-purple-500 to-violet-500', label: 'Follow-up' },
    won: { gradient: 'from-emerald-500 to-green-600', label: 'Ganho' },
    lost: { gradient: 'from-red-500 to-rose-600', label: 'Perdido' },
  };

  return (
    <Sheet open={open} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-2xl p-0 overflow-hidden flex flex-col gap-0">
        {loadingLead ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : lead ? (
          <>
            {/* Header */}
            <div className={`relative p-6 bg-gradient-to-br ${statusConfig[lead.status || 'new']?.gradient || 'from-primary to-primary'}`}>
              <div className="absolute inset-0 bg-black/10" />
              
              {/* Close button */}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onClose}
                className="absolute right-4 top-4 text-white/80 hover:text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </Button>

              <div className="relative flex items-start gap-4">
                <Avatar className="h-16 w-16 ring-4 ring-white/20 shadow-xl">
                  <AvatarImage src={lead.avatar_url || undefined} />
                  <AvatarFallback className="bg-white/20 text-white text-xl font-bold">
                    {getInitials(lead.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-white">
                  <h2 className="text-2xl font-bold">{lead.name || 'Lead sem nome'}</h2>
                  <div className="flex items-center gap-3 mt-2 text-white/80 text-sm">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {lead.phone}
                    </span>
                    {lead.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" />
                        {lead.email}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                      {LEAD_STATUSES[(lead.status || 'new') as LeadStatus]?.label || lead.status}
                    </Badge>
                    {lead.deal_value && (
                      <Badge className="bg-white/20 text-white border-white/30">
                        {formatCurrency(lead.deal_value)}
                      </Badge>
                    )}
                    <AIAgentBadge leadId={lead.id} compact />
                  </div>
                </div>

                {/* Sales Score in Header */}
                <div className={cn(
                  "w-16 h-16 rounded-xl border-2 flex flex-col items-center justify-center shrink-0",
                  lead.sales_score != null && lead.sales_score >= 70 
                    ? "bg-emerald-500/20 border-emerald-400/40 text-white"
                    : lead.sales_score != null && lead.sales_score >= 40
                    ? "bg-amber-500/20 border-amber-400/40 text-white"
                    : lead.sales_score != null
                    ? "bg-red-500/20 border-red-400/40 text-white"
                    : "bg-white/10 border-white/20 text-white/60"
                )}>
                  <span className="text-xl font-bold leading-none">
                    {lead.sales_score ?? '—'}
                  </span>
                  <span className="text-[8px] uppercase tracking-wider opacity-70 mt-0.5">Score</span>
                </div>
              </div>

              {/* Chat Button */}
              <Button 
                onClick={handleOpenChat}
                className="absolute right-4 bottom-4 bg-white/20 hover:bg-white/30 text-white border-white/30"
                size="sm"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Abrir Chat
              </Button>
            </div>

            {/* Pipeline Visual de Status */}
            <div className="px-4 py-2 border-b bg-card">
              <LeadStatusPipeline 
                currentStatus={lead.status || 'new'} 
                onStatusChange={handleStatusChange}
                disabled={updateLead.isPending}
              />
            </div>

            {/* Métricas Resumidas */}
            <LeadQuickMetrics lead={lead} />

            <Tabs defaultValue="dados" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="w-full justify-start px-4 pt-2 bg-transparent gap-1 flex-shrink-0 border-b">
                <TabsTrigger value="dados" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <User className="h-3.5 w-3.5" />
                  Dados
                </TabsTrigger>
                <TabsTrigger value="dossie" className="gap-1.5 data-[state=active]:bg-purple-500 data-[state=active]:text-white">
                  <Briefcase className="h-3.5 w-3.5" />
                  Dossiê
                </TabsTrigger>
                <TabsTrigger value="instagram" className="gap-1.5 data-[state=active]:bg-pink-500 data-[state=active]:text-white">
                  <Instagram className="h-3.5 w-3.5" />
                  Insta
                </TabsTrigger>
                <TabsTrigger value="jornada" className="gap-1.5 data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
                  <History className="h-3.5 w-3.5" />
                  Jornada
                </TabsTrigger>
                <TabsTrigger value="ia" className="gap-1.5 data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
                  <Sparkles className="h-3.5 w-3.5" />
                  IA
                </TabsTrigger>
                <TabsTrigger value="reunioes" className="gap-1.5 data-[state=active]:bg-cyan-500 data-[state=active]:text-white">
                  <Video className="h-3.5 w-3.5" />
                  Reuniões
                </TabsTrigger>
                <TabsTrigger value="tarefas" className="gap-1.5 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Tarefas
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1">
                {/* TAB: Dados do Lead */}
                <TabsContent value="dados" className="p-4 space-y-4 mt-0">
                  {/* Contato */}
                  <Card className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Contato</h4>
                      <div className="flex items-center gap-1">
                        {isEditing ? (
                          <>
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setIsEditing(false)}>
                              Cancelar
                            </Button>
                            <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSaveEdit} disabled={updateLead.isPending}>
                              {updateLead.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                              Salvar
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setIsEditing(true)}>
                              <Pencil className="h-3 w-3" />
                              Editar
                            </Button>
                            <CallButton
                              phoneNumber={lead.phone}
                              leadId={lead.id}
                              showLabel
                              size="sm"
                            />
                          </>
                        )}
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Nome</Label>
                          <Input
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            placeholder="Nome do lead"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Telefone</Label>
                          <Input
                            value={editForm.phone}
                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                            placeholder="923 999 999"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Email</Label>
                          <Input
                            value={editForm.email}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            placeholder="email@exemplo.com"
                            className="h-8 text-sm"
                            type="email"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Observações</Label>
                          <Textarea
                            value={editForm.notes}
                            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                            placeholder="Notas sobre o lead..."
                            className="text-sm min-h-[60px]"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{lead.phone}</span>
                        </div>
                        {lead.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{lead.email}</span>
                          </div>
                        )}
                        {lead.notes && (
                          <div className="text-sm text-muted-foreground pt-2 border-t">
                            <p className="text-xs uppercase tracking-wider font-medium mb-1">Observações</p>
                            <p className="whitespace-pre-wrap">{lead.notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>

                  {/* UTM / Origem */}
                  <Card className="p-4 space-y-3">
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1.5">
                      <Globe className="h-3 w-3" />
                      Origem / Tracking
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground text-xs">Fonte</span>
                        <p className="font-medium">{lead.utm_source || 'Direto'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Mídia</span>
                        <p className="font-medium">{lead.utm_medium || '-'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Campanha</span>
                        <p className="font-medium">{lead.utm_campaign || '-'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Conteúdo</span>
                        <p className="font-medium">{lead.utm_content || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                      <Calendar className="h-3 w-3" />
                      Entrou em {format(parseISO(lead.entered_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </div>
                  </Card>

                  {/* Sales Score & BANT */}
                  <SalesScoreBANT lead={lead} />

                  {/* Negociação */}
                  <Card className="p-4 space-y-3">
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1.5">
                      <DollarSign className="h-3 w-3" />
                      Negociação
                    </h4>
                    
                    {/* Status atual */}
                    <div className="flex items-center gap-2">
                      <Badge 
                        className="text-xs"
                        style={{ 
                          backgroundColor: `hsl(var(--${LEAD_STATUSES[lead.status as LeadStatus]?.color}))`,
                          color: 'white'
                        }}
                      >
                        {LEAD_STATUSES[lead.status as LeadStatus]?.label}
                      </Badge>
                      {lead.deal_value && (
                        <span className="text-sm font-bold text-primary">
                          {formatCurrency(lead.deal_value)}
                        </span>
                      )}
                    </div>

                    {/* Botões de status */}
                    <div className="space-y-2 pt-2">
                      <span className="text-xs text-muted-foreground">Mover para:</span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {Object.entries(LEAD_STATUSES)
                          .filter(([s]) => s !== lead.status && s !== 'won' && s !== 'lost')
                          .map(([s, info]) => (
                            <Button
                              key={s}
                              variant="outline"
                              size="sm"
                              className="justify-start text-xs h-8"
                              onClick={() => handleStatusChange(s as LeadStatus)}
                              disabled={updateLead.isPending}
                            >
                              <div 
                                className="w-2 h-2 rounded-full mr-1.5"
                                style={{ backgroundColor: `hsl(var(--${info.color}))` }}
                              />
                              {info.label}
                            </Button>
                          ))}
                      </div>

                      {/* Fechar como ganho */}
                      {lead.status !== 'won' && (
                        <div className="flex gap-1.5 pt-2">
                          <Input
                            type="number"
                            placeholder="Valor R$"
                            value={dealValue}
                            onChange={(e) => setDealValue(e.target.value)}
                            className="h-8 text-xs"
                          />
                          <Button 
                            size="sm"
                            className="h-8 bg-emerald-500 hover:bg-emerald-600 text-xs"
                            onClick={() => handleStatusChange('won')}
                            disabled={updateLead.isPending}
                          >
                            Fechou ✅
                          </Button>
                        </div>
                      )}

                      {/* Fechar como perdido */}
                      {lead.status !== 'lost' && (
                        <div className="flex gap-1.5">
                          <Select value={lossReason} onValueChange={setLossReason}>
                            <SelectTrigger className="h-8 text-xs flex-1">
                              <SelectValue placeholder="Motivo" />
                            </SelectTrigger>
                            <SelectContent>
                              {LOSS_REASONS.map((reason) => (
                                <SelectItem key={reason} value={reason} className="text-xs">
                                  {reason}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => handleStatusChange('lost')}
                            disabled={updateLead.isPending || !lossReason}
                          >
                            Perdeu ❌
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Tempo no funil */}
                  <Card className="p-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">No funil há:</span>
                      <span className="font-medium">
                        {formatDistanceToNow(parseISO(lead.entered_at), { locale: ptBR })}
                      </span>
                    </div>
                  </Card>
                </TabsContent>

                {/* TAB: Dossiê de Vendas */}
                <TabsContent value="dossie" className="p-4 mt-0">
                  <SalesDossierTab leadId={lead.id} />
                </TabsContent>

                {/* TAB: Instagram */}
                <TabsContent value="instagram" className="p-4 space-y-4 mt-0">
                  {/* Input para buscar */}
                  <Card className="p-3 space-y-3">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                        <Input
                          placeholder="username"
                          value={instagramUsername}
                          onChange={(e) => setInstagramUsername(e.target.value.replace(/^@/, ''))}
                          className="pl-7 h-9 text-sm"
                          onKeyDown={(e) => e.key === 'Enter' && handleEnrichInstagram()}
                        />
                      </div>
                      <Button 
                        size="sm"
                        onClick={handleEnrichInstagram} 
                        disabled={enrichMutation.isPending || !instagramUsername.trim()}
                        className="h-9 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                      >
                        {enrichMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : instagramData ? (
                          <RefreshCw className="h-4 w-4" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </Card>

                  {/* Perfil do Instagram */}
                  {instagramData && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                      <Card className="overflow-hidden">
                        <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 p-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-14 w-14 ring-2 ring-white/30">
                              <AvatarImage src={instagramData.profile_pic_url_hd || instagramData.profile_pic_url} />
                              <AvatarFallback className="bg-white/20 text-white">
                                {instagramData.username?.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 text-white">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold">{instagramData.full_name || instagramData.username}</span>
                                {instagramData.is_verified && (
                                  <CheckCircle2 className="h-4 w-4 fill-white" />
                                )}
                              </div>
                              <p className="text-white/80 text-sm">@{instagramData.username}</p>
                            </div>
                            <a 
                              href={`https://instagram.com/${instagramData.username}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-2 rounded-full bg-white/20 hover:bg-white/30"
                            >
                              <ExternalLink className="h-4 w-4 text-white" />
                            </a>
                          </div>
                        </div>
                        
                        <div className="p-4 space-y-3">
                          {/* Stats */}
                          <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="p-3 rounded-lg bg-muted/50">
                              <p className="text-xl font-bold">{formatNumber(instagramData.follower_count)}</p>
                              <p className="text-xs text-muted-foreground">Seguidores</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50">
                              <p className="text-xl font-bold">{formatNumber(instagramData.following_count)}</p>
                              <p className="text-xs text-muted-foreground">Seguindo</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50">
                              <p className="text-xl font-bold">{formatNumber(instagramData.media_count)}</p>
                              <p className="text-xs text-muted-foreground">Posts</p>
                            </div>
                          </div>

                          {/* Bio */}
                          {instagramData.biography && (
                            <div className="p-3 rounded-lg bg-muted/50 text-sm">
                              {instagramData.biography}
                            </div>
                          )}

                          {/* Category */}
                          {instagramData.category && (
                            <Badge variant="secondary">{instagramData.category}</Badge>
                          )}

                          {/* External Link */}
                          {instagramData.external_url && (
                            <a 
                              href={instagramData.external_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                            >
                              <Link2 className="h-4 w-4" />
                              {instagramData.external_url}
                            </a>
                          )}
                        </div>
                      </Card>
                    </motion.div>
                  )}

                  {/* Grid de posts */}
                  {instagramContent && instagramContent.length > 0 && (
                    <Card className="p-4">
                      <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                        <Grid3X3 className="h-3 w-3" />
                        Últimos Posts
                      </h4>
                      <div className="grid grid-cols-3 gap-2">
                        {instagramContent.slice(0, 9).map((post) => (
                          <div 
                            key={post.id} 
                            className="aspect-square rounded-md overflow-hidden bg-muted relative group cursor-pointer"
                          >
                            {post.thumbnail_url || post.media_url ? (
                              <img 
                                src={post.thumbnail_url || post.media_url || ''} 
                                alt="" 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Grid3X3 className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs">
                              {post.likes_count && (
                                <span className="flex items-center gap-1">
                                  <Heart className="h-3 w-3" />
                                  {formatNumber(post.likes_count)}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {!instagramData && !enrichMutation.isPending && (
                    <Card className="p-8 text-center">
                      <Instagram className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Digite o @ do Instagram para buscar dados
                      </p>
                    </Card>
                  )}
                </TabsContent>

                {/* TAB: Jornada */}
                <TabsContent value="jornada" className="p-4 mt-0">
                  <LeadTimeline
                    lead={lead}
                    statusHistory={statusHistory}
                    messages={messages}
                  />
                </TabsContent>

                {/* TAB: IA */}
                <TabsContent value="ia" className="p-4 space-y-4 mt-0">
                  {/* CTA para analisar */}
                  {!hasAnalyzed && (
                    <Card className="p-4 bg-gradient-to-br from-primary/5 to-emerald-500/5 border-primary/20">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <Sparkles className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">Análise de IA</p>
                          <p className="text-xs text-muted-foreground">Gere insights sobre este lead</p>
                        </div>
                      </div>
                      <Button
                        onClick={analyzeNow}
                        disabled={isAnalyzing}
                        className="w-full gap-2"
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Analisando...
                          </>
                        ) : (
                          <>
                            <Zap className="h-4 w-4" />
                            Gerar Análise
                          </>
                        )}
                      </Button>
                    </Card>
                  )}

                  {/* Resultados da análise */}
                  {analysis && (
                    <AnimatePresence>
                      {/* Health Score */}
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <Card className="p-4">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold",
                              analysis.healthScore && analysis.healthScore >= 70 
                                ? "bg-green-500/20 text-green-500"
                                : analysis.healthScore && analysis.healthScore >= 40
                                ? "bg-yellow-500/20 text-yellow-500"
                                : "bg-red-500/20 text-red-500"
                            )}>
                              {analysis.healthScore || '?'}
                            </div>
                            <div className="flex-1">
                              <p className="text-xs uppercase tracking-wider text-muted-foreground">Health Score</p>
                              <p className="font-medium">{analysis.predictedOutcomeLabel || 'Análise completa'}</p>
                              <div className="h-2 bg-muted rounded-full overflow-hidden mt-2">
                                <div 
                                  className={cn(
                                    "h-full rounded-full transition-all",
                                    analysis.healthScore && analysis.healthScore >= 70 
                                      ? "bg-green-500"
                                      : analysis.healthScore && analysis.healthScore >= 40
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                                  )}
                                  style={{ width: `${analysis.healthScore || 0}%` }}
                                />
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={analyzeNow} disabled={isAnalyzing}>
                              <RefreshCw className={cn("h-4 w-4", isAnalyzing && "animate-spin")} />
                            </Button>
                          </div>
                        </Card>
                      </motion.div>

                      {/* Próxima ação */}
                      {analysis.nextBestAction && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                          <Card className="p-4 bg-primary/5 border-primary/20">
                            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                              <Target className="h-3 w-3" />
                              Próxima Melhor Ação
                            </p>
                            <p className="font-medium">{analysis.nextBestAction}</p>
                          </Card>
                        </motion.div>
                      )}

                      {/* Pontos de atenção */}
                      {analysis.attentionPoints && analysis.attentionPoints.length > 0 && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                          <Card className="p-4">
                            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                              <AlertTriangle className="h-3 w-3" />
                              Pontos de Atenção
                            </p>
                            <div className="space-y-2">
                              {analysis.attentionPoints.map((point, i) => (
                                <div 
                                  key={i}
                                  className="flex items-start gap-2 text-sm p-2 rounded bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                                >
                                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                                  <span>{point}</span>
                                </div>
                              ))}
                            </div>
                          </Card>
                        </motion.div>
                      )}

                      {/* Recomendações */}
                      {analysis.recommendations && analysis.recommendations.length > 0 && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                          <Card className="p-4">
                            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                              <Sparkles className="h-3 w-3" />
                              Recomendações
                            </p>
                            <div className="space-y-2">
                              {analysis.recommendations.map((rec, i) => (
                                <div 
                                  key={i}
                                  className="flex items-start gap-2 text-sm p-2 rounded bg-primary/5"
                                >
                                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                                  <span>{rec}</span>
                                </div>
                              ))}
                            </div>
                          </Card>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </TabsContent>

                {/* TAB: Reuniões */}
                <TabsContent value="reunioes" className="p-4 space-y-3 mt-0">
                  {!meetings || meetings.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Video className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhuma reunião registada</p>
                    </div>
                  ) : (
                    meetings.map((meeting) => (
                      <Card key={meeting.id} className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Video className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">
                              {meeting.started_at
                                ? format(parseISO(meeting.started_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                                : 'Data desconhecida'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {meeting.duration_seconds > 0 && (
                              <Badge variant="outline" className="text-xs gap-1">
                                <Clock className="h-3 w-3" />
                                {Math.floor(meeting.duration_seconds / 60)}min
                              </Badge>
                            )}
                            <Badge variant={meeting.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                              {meeting.status === 'active' ? 'Em curso' : 'Concluída'}
                            </Badge>
                          </div>
                        </div>

                        {meeting.ai_summary && (
                          <p className="text-sm text-muted-foreground">{meeting.ai_summary}</p>
                        )}

                        {meeting.ai_sentiment && (
                          <Badge variant="outline" className="text-xs">
                            Sentimento: {meeting.ai_sentiment}
                          </Badge>
                        )}

                        {Array.isArray(meeting.transcriptions) && meeting.transcriptions.length > 0 && (
                          <details className="mt-2">
                            <summary className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1 hover:text-foreground">
                              <ChevronDown className="h-3 w-3" />
                              Ver transcrição ({meeting.transcriptions.length} segmentos)
                            </summary>
                            <div className="mt-2 space-y-1 max-h-48 overflow-y-auto border rounded-lg p-3 bg-muted/30">
                              {(meeting.transcriptions as any[]).map((t: any, i: number) => (
                                <div key={i} className="text-xs">
                                  <span className={`font-semibold ${t.speakerType === 'local' ? 'text-primary' : 'text-blue-500'}`}>
                                    {t.speaker}:
                                  </span>{' '}
                                  <span className="text-foreground">{t.text}</span>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </Card>
                    ))
                  )}
                </TabsContent>

                {/* TAB: Tarefas */}
                <TabsContent value="tarefas" className="mt-0">
                  <LeadTasksPanel leadId={lead.id} leadName={lead.name} />
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Lead não encontrado
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
