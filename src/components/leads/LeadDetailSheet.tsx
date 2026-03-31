import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  useLead, 
  useLeadMessages, 
  useLeadStatusHistory, 
  useLeadPostSaleStages 
} from '@/hooks/useLeads';
import { supabase } from '@/integrations/supabase/client';
import { InstagramSection } from './InstagramSection';
import { SalesDossierTab } from './SalesDossierTab';
import { LeadTimeline } from './LeadTimeline';
import { InstagramProfile } from '@/hooks/useInstagramData';
import { 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  DollarSign,
  MessageCircle,
  History,
  Package,
  Clock,
  CheckCircle2,
  ArrowRight,
  Globe,
  FileText,
  Sparkles,
  Brain,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Target,
  Lightbulb,
  Shield,
  Heart,
  Zap,
  RefreshCw,
  ChevronRight,
  Instagram,
  Briefcase
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface LeadDetailSheetProps {
  leadId: string | null;
  open: boolean;
  onClose: () => void;
}

interface LeadAnalysis {
  healthScore: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentLabel: string;
  riskLevel: 'low' | 'medium' | 'high';
  riskLabel: string;
  summary: string;
  strengths: string[];
  attentionPoints: string[];
  recommendations: string[];
  engagementLevel: 'high' | 'medium' | 'low';
  engagementLabel: string;
  predictedOutcome: 'likely_win' | 'uncertain' | 'likely_loss';
  predictedOutcomeLabel: string;
  nextBestAction: string;
}

const statusConfig: Record<string, { color: string; bg: string; label: string; gradient: string }> = {
  new: { color: 'text-blue-600', bg: 'bg-blue-500', label: 'Novo', gradient: 'from-blue-500 to-blue-600' },
  first_contact: { color: 'text-amber-600', bg: 'bg-amber-500', label: 'Primeiro Contacto', gradient: 'from-amber-500 to-orange-500' },
  negotiating: { color: 'text-pink-600', bg: 'bg-pink-500', label: 'Em Negociação', gradient: 'from-pink-500 to-rose-500' },
  proposal_sent: { color: 'text-orange-600', bg: 'bg-orange-500', label: 'Proposta Enviada', gradient: 'from-orange-500 to-red-500' },
  follow_up: { color: 'text-purple-600', bg: 'bg-purple-500', label: 'Follow-up', gradient: 'from-purple-500 to-violet-500' },
  won: { color: 'text-emerald-600', bg: 'bg-emerald-500', label: 'Ganho', gradient: 'from-emerald-500 to-green-600' },
  lost: { color: 'text-red-600', bg: 'bg-red-500', label: 'Perdido', gradient: 'from-red-500 to-rose-600' },
};

export function LeadDetailSheet({ leadId, open, onClose }: LeadDetailSheetProps) {
  const { data: lead, isLoading: loadingLead } = useLead(leadId || '');
  const { data: messages } = useLeadMessages(leadId || '');
  const { data: statusHistory } = useLeadStatusHistory(leadId || '');
  const { data: postSaleStages } = useLeadPostSaleStages(leadId || '');
  
  const [analysis, setAnalysis] = useState<LeadAnalysis | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  const analyzeLeadHealth = async () => {
    if (!lead) return;
    
    setLoadingAnalysis(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-lead', {
        body: { lead, messages, statusHistory, postSaleStages }
      });

      if (error) throw error;
      setAnalysis(data);
    } catch {
      toast.error('Erro ao analisar lead');
    } finally {
      setLoadingAnalysis(false);
    }
  };

  useEffect(() => {
    if (lead && open) {
      analyzeLeadHealth();
    }
  }, [lead?.id, open]);

  if (!leadId) return null;

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-500';
    if (score >= 40) return 'text-amber-500';
    return 'text-red-500';
  };

  const getHealthScoreGradient = (score: number) => {
    if (score >= 70) return 'from-emerald-500 to-green-500';
    if (score >= 40) return 'from-amber-500 to-orange-500';
    return 'from-red-500 to-rose-500';
  };

  return (
    <Sheet open={open} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-3xl p-0 overflow-hidden flex flex-col gap-0">
        {loadingLead ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : lead ? (
          <>
            {/* Header */}
            <div className={`relative p-6 bg-gradient-to-br ${statusConfig[lead.status]?.gradient || 'from-primary to-primary'}`}>
              <div className="absolute inset-0 bg-black/10" />
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
                  <Badge className="mt-3 bg-white/20 text-white border-white/30 hover:bg-white/30">
                    {statusConfig[lead.status]?.label || lead.status}
                  </Badge>
                </div>
                
                {/* Health Score Circle */}
                {analysis && (
                  <motion.div 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center"
                  >
                    <div className="relative w-20 h-20">
                      <svg className="w-20 h-20 -rotate-90">
                        <circle
                          cx="40"
                          cy="40"
                          r="36"
                          stroke="rgba(255,255,255,0.2)"
                          strokeWidth="6"
                          fill="none"
                        />
                        <circle
                          cx="40"
                          cy="40"
                          r="36"
                          stroke="white"
                          strokeWidth="6"
                          fill="none"
                          strokeDasharray={`${analysis.healthScore * 2.26} 226`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold text-white">{analysis.healthScore}</span>
                      </div>
                    </div>
                    <span className="text-xs text-white/80 mt-1">Health Score</span>
                  </motion.div>
                )}
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-6">
                <Tabs defaultValue="dossier" className="w-full">
                  <TabsList className="grid w-full grid-cols-6 mb-6">
                    <TabsTrigger value="dossier" className="gap-1.5">
                      <Briefcase className="h-4 w-4" />
                      <span className="hidden sm:inline">Dossiê</span>
                    </TabsTrigger>
                    <TabsTrigger value="health" className="gap-1.5">
                      <Brain className="h-4 w-4" />
                      <span className="hidden sm:inline">Saúde</span>
                    </TabsTrigger>
                    <TabsTrigger value="instagram" className="gap-1.5">
                      <Instagram className="h-4 w-4" />
                      <span className="hidden sm:inline">Insta</span>
                    </TabsTrigger>
                    <TabsTrigger value="overview" className="gap-1.5">
                      <User className="h-4 w-4" />
                      <span className="hidden sm:inline">Dados</span>
                    </TabsTrigger>
                    <TabsTrigger value="journey" className="gap-1.5">
                      <History className="h-4 w-4" />
                      <span className="hidden sm:inline">Jornada</span>
                    </TabsTrigger>
                    <TabsTrigger value="messages" className="gap-1.5">
                      <MessageCircle className="h-4 w-4" />
                      <span className="hidden sm:inline">Chat</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* Dossier Tab - Sales Dossier */}
                  <TabsContent value="dossier" className="mt-0">
                    <SalesDossierTab leadId={lead.id} />
                  </TabsContent>

                  {/* Health Tab - AI Analysis */}
                  <TabsContent value="health" className="space-y-4 mt-0">
                    {loadingAnalysis ? (
                      <Card className="border-0 shadow-lg">
                        <CardContent className="py-12">
                          <div className="flex flex-col items-center gap-4">
                            <div className="relative">
                              <div className="w-16 h-16 border-4 border-primary/20 rounded-full" />
                              <div className="absolute inset-0 w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                              <Sparkles className="absolute inset-0 m-auto h-6 w-6 text-primary animate-pulse" />
                            </div>
                            <div className="text-center">
                              <p className="font-medium">Analisando lead com IA...</p>
                              <p className="text-sm text-muted-foreground">Gerando dossiê completo</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ) : analysis ? (
                      <AnimatePresence>
                        {/* Summary Card */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <Card className="border-0 shadow-lg overflow-hidden">
                            <div className={`h-1 bg-gradient-to-r ${getHealthScoreGradient(analysis.healthScore)}`} />
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <Brain className="h-5 w-5 text-primary" />
                                  Análise Inteligente
                                </CardTitle>
                                <Button variant="ghost" size="sm" onClick={analyzeLeadHealth}>
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <p className="text-muted-foreground">{analysis.summary}</p>
                              
                              {/* Quick Stats */}
                              <div className="grid grid-cols-3 gap-3">
                                <div className={`p-3 rounded-xl text-center ${
                                  analysis.sentiment === 'positive' ? 'bg-emerald-500/10' :
                                  analysis.sentiment === 'negative' ? 'bg-red-500/10' : 'bg-amber-500/10'
                                }`}>
                                  <Heart className={`h-5 w-5 mx-auto mb-1 ${
                                    analysis.sentiment === 'positive' ? 'text-emerald-500' :
                                    analysis.sentiment === 'negative' ? 'text-red-500' : 'text-amber-500'
                                  }`} />
                                  <p className="text-xs text-muted-foreground">Sentimento</p>
                                  <p className="font-semibold text-sm">{analysis.sentimentLabel}</p>
                                </div>
                                
                                <div className={`p-3 rounded-xl text-center ${
                                  analysis.riskLevel === 'low' ? 'bg-emerald-500/10' :
                                  analysis.riskLevel === 'high' ? 'bg-red-500/10' : 'bg-amber-500/10'
                                }`}>
                                  <Shield className={`h-5 w-5 mx-auto mb-1 ${
                                    analysis.riskLevel === 'low' ? 'text-emerald-500' :
                                    analysis.riskLevel === 'high' ? 'text-red-500' : 'text-amber-500'
                                  }`} />
                                  <p className="text-xs text-muted-foreground">Risco</p>
                                  <p className="font-semibold text-sm">{analysis.riskLabel}</p>
                                </div>
                                
                                <div className={`p-3 rounded-xl text-center ${
                                  analysis.engagementLevel === 'high' ? 'bg-emerald-500/10' :
                                  analysis.engagementLevel === 'low' ? 'bg-red-500/10' : 'bg-amber-500/10'
                                }`}>
                                  <Zap className={`h-5 w-5 mx-auto mb-1 ${
                                    analysis.engagementLevel === 'high' ? 'text-emerald-500' :
                                    analysis.engagementLevel === 'low' ? 'text-red-500' : 'text-amber-500'
                                  }`} />
                                  <p className="text-xs text-muted-foreground">Engajamento</p>
                                  <p className="font-semibold text-sm">{analysis.engagementLabel}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>

                        {/* Next Best Action */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                        >
                          <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/5 to-primary/10">
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-primary/10">
                                  <Target className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                                    Próxima Melhor Ação
                                  </p>
                                  <p className="font-medium mt-1">{analysis.nextBestAction}</p>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>

                        {/* Prediction */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15 }}
                        >
                          <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm flex items-center gap-2">
                                {analysis.predictedOutcome === 'likely_win' ? (
                                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                                ) : analysis.predictedOutcome === 'likely_loss' ? (
                                  <TrendingDown className="h-4 w-4 text-red-500" />
                                ) : (
                                  <Target className="h-4 w-4 text-amber-500" />
                                )}
                                Previsão
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <Badge className={`${
                                analysis.predictedOutcome === 'likely_win' ? 'bg-emerald-500' :
                                analysis.predictedOutcome === 'likely_loss' ? 'bg-red-500' : 'bg-amber-500'
                              } text-white`}>
                                {analysis.predictedOutcomeLabel}
                              </Badge>
                            </CardContent>
                          </Card>
                        </motion.div>

                        {/* Strengths */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                        >
                          <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                Pontos Fortes
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ul className="space-y-2">
                                {analysis.strengths.map((strength, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                                    {strength}
                                  </li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                        </motion.div>

                        {/* Attention Points */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.25 }}
                        >
                          <Card className="border-0 shadow-lg border-l-4 border-l-amber-500">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                Pontos de Atenção
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ul className="space-y-2">
                                {analysis.attentionPoints.map((point, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                                    {point}
                                  </li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                        </motion.div>

                        {/* Recommendations */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                        >
                          <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Lightbulb className="h-4 w-4 text-primary" />
                                Recomendações
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ul className="space-y-2">
                                {analysis.recommendations.map((rec, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm">
                                    <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-xs font-medium">
                                      {i + 1}
                                    </div>
                                    {rec}
                                  </li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                        </motion.div>
                      </AnimatePresence>
                    ) : (
                      <Card className="border-0 shadow-lg">
                        <CardContent className="py-8 text-center">
                          <Button onClick={analyzeLeadHealth}>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Analisar com IA
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  {/* Instagram Tab */}
                  <TabsContent value="instagram" className="mt-0">
                    <InstagramSection 
                      leadId={lead.id}
                      instagramData={(lead as any).instagram_data as InstagramProfile | null}
                      instagramUsername={(lead as any).instagram_username}
                    />
                  </TabsContent>

                  {/* Overview Tab */}
                  <TabsContent value="overview" className="space-y-4 mt-0">
                    <Card className="border-0 shadow-lg">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Informações de Contacto
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{lead.phone}</span>
                        </div>
                        {lead.email && (
                          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{lead.email}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>
                            Criado {format(new Date(lead.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>
                            Há {formatDistanceToNow(new Date(lead.entered_at), { locale: ptBR })} no funil
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Origem do Tráfego
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {lead.utm_source || lead.utm_medium || lead.utm_campaign ? (
                          <div className="grid grid-cols-2 gap-3">
                            {lead.utm_source && (
                              <div className="p-3 rounded-lg bg-muted/50">
                                <p className="text-xs text-muted-foreground mb-1">Fonte</p>
                                <Badge variant="secondary">{lead.utm_source}</Badge>
                              </div>
                            )}
                            {lead.utm_medium && (
                              <div className="p-3 rounded-lg bg-muted/50">
                                <p className="text-xs text-muted-foreground mb-1">Meio</p>
                                <Badge variant="secondary">{lead.utm_medium}</Badge>
                              </div>
                            )}
                            {lead.utm_campaign && (
                              <div className="col-span-2 p-3 rounded-lg bg-muted/50">
                                <p className="text-xs text-muted-foreground mb-1">Campanha</p>
                                <Badge variant="secondary">{lead.utm_campaign}</Badge>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Sem dados de UTM</p>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Negociação
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10">
                          <span className="text-muted-foreground">Valor do negócio</span>
                          <span className="text-2xl font-bold text-emerald-600">
                            {lead.deal_value 
                              ? new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(lead.deal_value)
                              : '—'
                            }
                          </span>
                        </div>
                        {lead.loss_reason && (
                          <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                            <p className="text-xs text-muted-foreground mb-1">Motivo da perda</p>
                            <p className="text-sm text-red-600">{lead.loss_reason}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {lead.notes && (
                      <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Observações
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  {/* Journey Tab */}
                  <TabsContent value="journey" className="mt-0">
                    <LeadTimeline
                      lead={lead as any}
                      statusHistory={statusHistory}
                      messages={messages}
                    />
                  </TabsContent>

                  {/* Messages Tab */}
                  <TabsContent value="messages" className="mt-0">
                    <Card className="border-0 shadow-lg">
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <MessageCircle className="h-4 w-4" />
                          Mensagens ({messages?.length || 0})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {messages && messages.length > 0 ? (
                          <div className="space-y-3">
                            {messages.map((msg, index) => (
                              <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`p-3 rounded-2xl max-w-[85%] ${
                                  msg.sender_type === 'lead'
                                    ? 'bg-muted rounded-bl-sm'
                                    : 'bg-primary text-primary-foreground ml-auto rounded-br-sm'
                                }`}
                              >
                                <p className="text-sm">{msg.message}</p>
                                <p className={`text-xs mt-1 ${
                                  msg.sender_type === 'lead' ? 'text-muted-foreground' : 'opacity-70'
                                }`}>
                                  {format(new Date(msg.created_at), "dd/MM HH:mm", { locale: ptBR })}
                                </p>
                              </motion.div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-8">
                            Nenhuma mensagem registrada
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </ScrollArea>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
