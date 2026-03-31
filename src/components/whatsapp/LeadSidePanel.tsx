import { useState } from 'react';
import { Lead, useLeadMessages, useLeadStatusHistory, useLeadPostSaleStages, useUpdateLead } from '@/hooks/useLeads';
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
import { 
  Sparkles, 
  Phone, 
  Mail,
  Calendar, 
  DollarSign,
  MapPin,
  Clock,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Zap,
  User,
  Instagram,
  History,
  Target,
  ExternalLink,
  Link2,
  Heart,
  Users,
  Grid3X3,
  CheckCircle2,
  Circle,
  RefreshCw,
  Search,
  ArrowRight,
  Globe,
  Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface LeadSidePanelProps {
  lead: Lead;
  isCollapsed: boolean;
  onToggle: () => void;
}

interface AIAnalysis {
  healthScore?: number;
  engagementLabel?: string;
  nextBestAction?: string;
  predictedOutcomeLabel?: string;
  recommendations?: string[];
  attentionPoints?: string[];
}

export function LeadSidePanel({ 
  lead, 
  isCollapsed,
  onToggle,
}: LeadSidePanelProps) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [instagramUsername, setInstagramUsername] = useState(lead.instagram_username || '');
  const [dealValue, setDealValue] = useState('');
  const [lossReason, setLossReason] = useState('');

  const { data: messages } = useLeadMessages(lead.id);
  const { data: statusHistory } = useLeadStatusHistory(lead.id);
  const { data: postSaleStages } = useLeadPostSaleStages(lead.id);
  const { data: instagramContent, isLoading: loadingContent } = useInstagramContent(lead.id);
  const enrichMutation = useEnrichInstagram();
  const updateLead = useUpdateLead();

  const instagramData = lead.instagram_data as InstagramProfile | null;

  const currentStageIndex = Object.keys(LEAD_STATUSES).indexOf(lead.status || 'new');

  const analyzeNow = async () => {
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
    } catch {
      toast.error('Erro ao analisar lead');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleEnrichInstagram = () => {
    if (!instagramUsername.trim()) return;
    enrichMutation.mutate({ leadId: lead.id, instagramUsername });
  };

  const handleStatusChange = async (newStatus: LeadStatus) => {
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

  if (isCollapsed) {
    return (
      <div className="w-12 border-l bg-card/50 flex flex-col items-center py-4">
        <Button variant="ghost" size="icon" onClick={onToggle} className="mb-4">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex flex-col items-center gap-3">
          <div 
            className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-colors"
            onClick={onToggle}
          >
            <User className="h-4 w-4 text-primary" />
          </div>
          {instagramData && (
            <div 
              className="w-8 h-8 rounded-full bg-pink-500/10 flex items-center justify-center cursor-pointer hover:bg-pink-500/20 transition-colors"
              onClick={onToggle}
            >
              <Instagram className="h-4 w-4 text-pink-500" />
            </div>
          )}
          {analysis && (
            <div 
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer",
                analysis.healthScore && analysis.healthScore >= 70 
                  ? "bg-green-500/20 text-green-500"
                  : analysis.healthScore && analysis.healthScore >= 40
                  ? "bg-yellow-500/20 text-yellow-500"
                  : "bg-red-500/20 text-red-500"
              )}
              onClick={onToggle}
            >
              {analysis.healthScore || '?'}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 380, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      className="border-l bg-card/50 flex flex-col"
    >
      {/* Header com Toggle */}
      <div className="p-3 border-b flex items-center justify-between bg-muted/30">
        <span className="font-semibold text-sm">Painel do Lead</span>
        <Button variant="ghost" size="icon" onClick={onToggle}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="dados" className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start px-2 pt-2 bg-transparent gap-1 flex-shrink-0">
          <TabsTrigger value="dados" className="text-xs gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <User className="h-3 w-3" />
            Dados
          </TabsTrigger>
          <TabsTrigger value="instagram" className="text-xs gap-1 data-[state=active]:bg-pink-500 data-[state=active]:text-white">
            <Instagram className="h-3 w-3" />
            Insta
          </TabsTrigger>
          <TabsTrigger value="jornada" className="text-xs gap-1 data-[state=active]:bg-purple-500 data-[state=active]:text-white">
            <History className="h-3 w-3" />
            Jornada
          </TabsTrigger>
          <TabsTrigger value="ia" className="text-xs gap-1 data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
            <Sparkles className="h-3 w-3" />
            IA
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          {/* TAB: Dados do Lead */}
          <TabsContent value="dados" className="p-4 space-y-4 mt-0">
            {/* Contato */}
            <Card className="p-4 space-y-3">
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Contacto</h4>
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
              </div>
            </Card>

            {/* UTM / Origem */}
            <Card className="p-4 space-y-3">
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1.5">
                <Globe className="h-3 w-3" />
                Origem / Tracking
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
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
                <div className="grid grid-cols-2 gap-1.5">
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

          {/* TAB: Instagram */}
          <TabsContent value="instagram" className="p-4 space-y-4 mt-0">
            {/* Input para pesquisar */}
            <Card className="p-3 space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                  <Input
                    placeholder="username"
                    value={instagramUsername}
                    onChange={(e) => setInstagramUsername(e.target.value.replace(/^@/, ''))}
                    className="pl-7 h-8 text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleEnrichInstagram()}
                  />
                </div>
                <Button 
                  size="sm"
                  onClick={handleEnrichInstagram} 
                  disabled={enrichMutation.isPending || !instagramUsername.trim()}
                  className="h-8 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                >
                  {enrichMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : instagramData ? (
                    <RefreshCw className="h-3 w-3" />
                  ) : (
                    <Search className="h-3 w-3" />
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
                  
                  <div className="p-3 space-y-3">
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-lg bg-muted/50">
                        <p className="text-lg font-bold">{formatNumber(instagramData.follower_count)}</p>
                        <p className="text-[10px] text-muted-foreground">Seguidores</p>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/50">
                        <p className="text-lg font-bold">{formatNumber(instagramData.following_count)}</p>
                        <p className="text-[10px] text-muted-foreground">Seguindo</p>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/50">
                        <p className="text-lg font-bold">{formatNumber(instagramData.media_count)}</p>
                        <p className="text-[10px] text-muted-foreground">Posts</p>
                      </div>
                    </div>

                    {/* Bio */}
                    {instagramData.biography && (
                      <div className="p-2 rounded-lg bg-muted/50 text-sm">
                        {instagramData.biography}
                      </div>
                    )}

                    {/* Category */}
                    {instagramData.category && (
                      <Badge variant="secondary" className="text-xs">
                        {instagramData.category}
                      </Badge>
                    )}

                    {/* External Link */}
                    {instagramData.external_url && (
                      <a 
                        href={instagramData.external_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                      >
                        <Link2 className="h-3 w-3" />
                        {instagramData.external_url}
                      </a>
                    )}
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Grid de posts */}
            {instagramContent && instagramContent.length > 0 && (
              <Card className="p-3">
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Grid3X3 className="h-3 w-3" />
                  Últimos Posts
                </h4>
                <div className="grid grid-cols-3 gap-1.5">
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
                          <span className="flex items-center gap-0.5">
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
              <Card className="p-6 text-center">
                <Instagram className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Digite o @ do Instagram para pesquisar dados
                </p>
              </Card>
            )}
          </TabsContent>

          {/* TAB: Jornada */}
          <TabsContent value="jornada" className="p-4 space-y-4 mt-0">
            {/* Timeline de status */}
            <Card className="p-4">
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <Target className="h-3 w-3" />
                Etapa do Funil
              </h4>
              <div className="space-y-1">
                {Object.entries(LEAD_STATUSES).map(([status, info], index) => {
                  const isComplete = index < currentStageIndex;
                  const isCurrent = status === lead.status;
                  const isPending = index > currentStageIndex;

                  return (
                    <div
                      key={status}
                      className={cn(
                        "flex items-center gap-2 py-2 px-3 rounded-lg transition-colors",
                        isCurrent && "bg-primary/10 border border-primary/30",
                        isComplete && "opacity-60"
                      )}
                    >
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        isComplete && "bg-green-500",
                        isCurrent && "bg-primary",
                        isPending && "bg-muted-foreground/30"
                      )} />
                      <span className={cn(
                        "text-sm flex-1",
                        isCurrent && "font-medium text-primary"
                      )}>
                        {info.label}
                      </span>
                      {isComplete && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Histórico de mudanças */}
            {statusHistory && statusHistory.length > 0 && (
              <Card className="p-4">
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <History className="h-3 w-3" />
                  Histórico de Mudanças
                </h4>
                <div className="space-y-3">
                  {statusHistory.map((history) => (
                    <div key={history.id} className="flex items-start gap-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-1.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          {history.old_status && (
                            <>
                              <Badge variant="outline" className="text-[10px]">
                                {LEAD_STATUSES[history.old_status as LeadStatus]?.label || history.old_status}
                              </Badge>
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            </>
                          )}
                          <Badge className="text-[10px]" style={{ 
                            backgroundColor: `hsl(var(--${LEAD_STATUSES[history.new_status as LeadStatus]?.color}))`,
                            color: 'white'
                          }}>
                            {LEAD_STATUSES[history.new_status as LeadStatus]?.label || history.new_status}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {format(parseISO(history.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Entrada */}
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Lead criado em {format(parseISO(lead.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </div>
            </Card>
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
                            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
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
                            <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
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
        </ScrollArea>
      </Tabs>
    </motion.div>
  );
}
