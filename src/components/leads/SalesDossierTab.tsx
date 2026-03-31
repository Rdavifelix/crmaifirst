import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  RefreshCw,
  User,
  MessageSquare,
  Target,
  Shield,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  Brain,
  Zap,
  Heart,
  Star,
  FileText,
  Instagram,
  Users,
  TrendingUp,
  MessageCircle,
  Award,
  BookOpen,
} from 'lucide-react';

interface SalesDossier {
  executiveSummary: string;
  discProfile: {
    primary: 'D' | 'I' | 'S' | 'C';
    secondary: 'D' | 'I' | 'S' | 'C' | null;
    label: string;
    description: string;
    communicationTips: string[];
  };
  buyerPersona: {
    likelyRole: string;
    decisionMakingStyle: string;
    mainMotivators: string[];
    likelyObjections: string[];
  };
  spinQuestions: {
    situation: string[];
    problem: string[];
    implication: string[];
    needPayoff: string[];
  };
  openingScript: string;
  rapportTips: string[];
  socialProofSuggestions: string[];
  objectionHandling: Array<{
    objection: string;
    response: string;
  }>;
  closingTechniques: string[];
  urgencyTriggers: string[];
  redFlags: string[];
  greenFlags: string[];
  callAgenda: Array<{
    phase: string;
    duration: string;
    objective: string;
    script: string;
  }>;
  keyInsights: string[];
  instagramInsights: string;
  confidenceScore: number;
}

interface SalesDossierTabProps {
  leadId: string;
}

const discColors: Record<string, { bg: string; text: string; border: string }> = {
  D: { bg: 'bg-red-500/10', text: 'text-red-600', border: 'border-red-500' },
  I: { bg: 'bg-yellow-500/10', text: 'text-yellow-600', border: 'border-yellow-500' },
  S: { bg: 'bg-green-500/10', text: 'text-green-600', border: 'border-green-500' },
  C: { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500' },
};

const discLabels: Record<string, string> = {
  D: 'Dominante',
  I: 'Influente',
  S: 'Estável',
  C: 'Conforme',
};

export function SalesDossierTab({ leadId }: SalesDossierTabProps) {
  const [dossier, setDossier] = useState<SalesDossier | null>(null);
  const [loading, setLoading] = useState(false);

  const generateDossier = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-sales-dossier', {
        body: { leadId }
      });

      if (error) throw error;
      setDossier(data);
      toast.success('Dossiê gerado com sucesso!');
    } catch {
      toast.error('Erro ao gerar dossiê');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="py-16">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-primary/20 rounded-full" />
              <div className="absolute inset-0 w-20 h-20 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <Brain className="absolute inset-0 m-auto h-8 w-8 text-primary animate-pulse" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-lg">Gerando Dossiê de Vendas...</p>
              <p className="text-sm text-muted-foreground mt-1">
                Analisando dados do lead com IA
              </p>
              <p className="text-xs text-muted-foreground mt-3 max-w-xs">
                SPIN Selling • Perfil DISC • Script de Abertura • Técnicas de Fecho
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!dossier) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="p-4 rounded-full bg-primary/10">
              <FileText className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Dossiê de Vendas</h3>
              <p className="text-muted-foreground max-w-md">
                Gere um dossiê completo com análise comportamental DISC, perguntas SPIN Selling,
                scripts personalizados e técnicas de fecho para a sua chamada.
              </p>
            </div>
            <Button size="lg" onClick={generateDossier} className="gap-2">
              <Sparkles className="h-5 w-5" />
              Gerar Dossiê com IA
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const discStyle = discColors[dossier.discProfile.primary];

  return (
    <AnimatePresence>
      <div className="space-y-4">
        {/* Header with Confidence Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-0 shadow-lg overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-primary to-primary/50" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Dossiê de Vendas
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="gap-1">
                    <Star className="h-3 w-3" />
                    {dossier.confidenceScore}% confiança
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={generateDossier}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{dossier.executiveSummary}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* DISC Profile */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className={`border-0 shadow-lg border-l-4 ${discStyle.border}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className={`h-4 w-4 ${discStyle.text}`} />
                Perfil Comportamental DISC
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-14 h-14 rounded-xl ${discStyle.bg} flex items-center justify-center`}>
                  <span className={`text-2xl font-bold ${discStyle.text}`}>
                    {dossier.discProfile.primary}
                  </span>
                </div>
                <div>
                  <p className="font-semibold">{dossier.discProfile.label}</p>
                  {dossier.discProfile.secondary && (
                    <p className="text-sm text-muted-foreground">
                      Secundário: {discLabels[dossier.discProfile.secondary]}
                    </p>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{dossier.discProfile.description}</p>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">COMO SE COMUNICAR:</p>
                <ul className="space-y-1">
                  {dossier.discProfile.communicationTips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <MessageCircle className="h-3.5 w-3.5 mt-1 text-primary flex-shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Opening Script */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-500/5 to-emerald-500/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-emerald-600" />
                Script de Abertura
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm italic border-l-2 border-emerald-500 pl-3">
                "{dossier.openingScript}"
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* SPIN Questions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Perguntas SPIN Selling
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                {[
                  { key: 'situation', label: 'Situação', color: 'blue', icon: Users },
                  { key: 'problem', label: 'Problema', color: 'amber', icon: AlertTriangle },
                  { key: 'implication', label: 'Implicação', color: 'red', icon: TrendingUp },
                  { key: 'needPayoff', label: 'Necessidade', color: 'emerald', icon: Lightbulb },
                ].map(({ key, label, color, icon: Icon }) => (
                  <div key={key} className={`p-3 rounded-lg bg-${color}-500/5 border border-${color}-500/20`}>
                    <p className={`text-xs font-semibold text-${color}-600 mb-2 flex items-center gap-1`}>
                      <Icon className="h-3 w-3" />
                      {label.toUpperCase()}
                    </p>
                    <ul className="space-y-1">
                      {(dossier.spinQuestions as any)[key].map((q: string, i: number) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <ChevronRight className="h-3.5 w-3.5 mt-1 text-muted-foreground flex-shrink-0" />
                          {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Call Agenda */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Agenda da Call
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dossier.callAgenda.map((phase, index) => (
                  <div key={index} className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{phase.phase}</span>
                        <Badge variant="secondary" className="text-xs">
                          {phase.duration}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{phase.objective}</p>
                      <p className="text-sm mt-1 text-muted-foreground italic">{phase.script}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Objection Handling */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 text-amber-500" />
                Contorno de Objeções
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dossier.objectionHandling.map((item, i) => (
                <div key={i} className="p-3 rounded-lg bg-muted/50 space-y-2">
                  <p className="text-sm font-medium flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    {item.objection}
                  </p>
                  <p className="text-sm text-muted-foreground pl-6 border-l-2 border-emerald-500 ml-1">
                    {item.response}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Closing Techniques */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-0 shadow-lg border-l-4 border-l-emerald-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Award className="h-4 w-4 text-emerald-500" />
                Técnicas de Fecho
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {dossier.closingTechniques.map((technique, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center flex-shrink-0 text-xs font-medium">
                      {i + 1}
                    </div>
                    {technique}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        {/* Rapport Tips & Urgency */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <Card className="border-0 shadow-lg h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Heart className="h-4 w-4 text-pink-500" />
                  Rapport
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {dossier.rapportTips.map((tip, i) => (
                    <li key={i} className="text-xs flex items-start gap-1.5">
                      <div className="w-1 h-1 rounded-full bg-pink-500 mt-1.5 flex-shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <Card className="border-0 shadow-lg h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4 text-orange-500" />
                  Urgência
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {dossier.urgencyTriggers.map((trigger, i) => (
                    <li key={i} className="text-xs flex items-start gap-1.5">
                      <div className="w-1 h-1 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                      {trigger}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Green & Red Flags */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-0 shadow-lg h-full border-l-4 border-l-emerald-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Sinais Positivos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {dossier.greenFlags.map((flag, i) => (
                    <li key={i} className="text-xs flex items-start gap-1.5">
                      <div className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                      {flag}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-0 shadow-lg h-full border-l-4 border-l-red-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Sinais de Alerta
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {dossier.redFlags.map((flag, i) => (
                    <li key={i} className="text-xs flex items-start gap-1.5">
                      <div className="w-1 h-1 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                      {flag}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Instagram Insights */}
        {dossier.instagramInsights && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Instagram className="h-4 w-4 text-pink-500" />
                  Insights do Instagram
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{dossier.instagramInsights}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Key Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Insights Chave
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {dossier.keyInsights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    {insight}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
