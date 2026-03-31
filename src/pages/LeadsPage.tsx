import { useState, useMemo } from 'react';
import { LeadDetailModal } from '@/components/leads/LeadDetailModal';
import { useLeads } from '@/hooks/useLeads';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search,
  Filter,
  Users,
  DollarSign,
  TrendingUp,
  Sparkles,
  Target,
  UserPlus,
} from 'lucide-react';
import { LeadCard } from '@/components/leads/LeadCard';
import { NewLeadModal } from '@/components/leads/NewLeadModal';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  new: { color: 'text-blue-600', bg: 'bg-blue-500/10 border-blue-500/20', label: 'Novo' },
  first_contact: { color: 'text-amber-600', bg: 'bg-amber-500/10 border-amber-500/20', label: 'Primeiro Contacto' },
  negotiating: { color: 'text-pink-600', bg: 'bg-pink-500/10 border-pink-500/20', label: 'Em Negociação' },
  proposal_sent: { color: 'text-orange-600', bg: 'bg-orange-500/10 border-orange-500/20', label: 'Proposta Enviada' },
  follow_up: { color: 'text-purple-600', bg: 'bg-purple-500/10 border-purple-500/20', label: 'Follow-up' },
  won: { color: 'text-emerald-600', bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'Ganho' },
  lost: { color: 'text-red-600', bg: 'bg-red-500/10 border-red-500/20', label: 'Perdido' },
};


export default function LeadsPage() {
  const { data: leads, isLoading } = useLeads();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [showNewLead, setShowNewLead] = useState(false);

  const filteredLeads = leads?.filter(lead => {
    const matchesSearch = 
      lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.includes(searchTerm) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesSource = sourceFilter === 'all' || lead.utm_source === sourceFilter;
    
    return matchesSearch && matchesStatus && matchesSource;
  }) || [];

  const uniqueSources = [...new Set(leads?.map(l => l.utm_source).filter(Boolean))] as string[];

  const stats = useMemo(() => ({
    total: leads?.length || 0,
    new: leads?.filter(l => l.status === 'new').length || 0,
    won: leads?.filter(l => l.status === 'won').length || 0,
    totalValue: leads?.filter(l => l.status === 'won').reduce((acc, l) => acc + (l.deal_value || 0), 0) || 0,
    conversionRate: leads?.length ? Math.round((leads.filter(l => l.status === 'won').length / leads.length) * 100) : 0,
  }), [leads]);

  const handleLeadClick = (leadId: string) => {
    setSelectedLeadId(leadId);
  };


  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-purple-500/5 to-blue-500/5 rounded-3xl blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border bg-card/50 backdrop-blur-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-emerald-600 text-white">
                <Users className="h-5 w-5" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Central de Leads
              </h1>
            </div>
            <p className="text-muted-foreground">
              Visão 360° de todos os seus leads com análise inteligente
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-3 py-1.5 text-sm font-medium border-primary/30 bg-primary/5">
              <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary" />
              IA Ativa
            </Badge>
            <Button onClick={() => setShowNewLead(true)} size="sm" className="gap-1.5">
              <UserPlus className="h-4 w-4" />
              Novo Lead
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total</p>
                  <p className="text-3xl font-bold mt-1">{stats.total}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/20">
                  <Users className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-500 to-orange-500 text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm font-medium">Novos</p>
                  <p className="text-3xl font-bold mt-1">{stats.new}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/20">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500 to-green-600 text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm font-medium">Conversão</p>
                  <p className="text-3xl font-bold mt-1">{stats.conversionRate}%</p>
                </div>
                <div className="p-3 rounded-xl bg-white/20">
                  <Target className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-500 to-violet-600 text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Receita</p>
                  <p className="text-2xl font-bold mt-1">
                    {new Intl.NumberFormat('pt-AO', { 
                      style: 'currency', 
                      currency: 'AOA',
                      notation: 'compact',
                      maximumFractionDigits: 1
                    }).format(stats.totalValue)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-white/20">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por nome, telefone ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 bg-background/50 border-muted-foreground/20 focus:border-primary/50"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-44 h-11 bg-background/50 border-muted-foreground/20">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {Object.entries(statusConfig).map(([value, config]) => (
                  <SelectItem key={value} value={value}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-full md:w-44 h-11 bg-background/50 border-muted-foreground/20">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas origens</SelectItem>
                {uniqueSources.map((source) => (
                  <SelectItem key={source} value={source}>{source}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leads List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-muted-foreground">
            {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''} encontrado{filteredLeads.length !== 1 ? 's' : ''}
          </p>
        </div>

        {isLoading ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-muted-foreground">Carregando leads...</p>
              </div>
            </CardContent>
          </Card>
        ) : filteredLeads.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-16">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="p-4 rounded-full bg-muted">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Nenhum lead encontrado</p>
                  <p className="text-sm text-muted-foreground">Tente ajustar os filtros de pesquisa</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredLeads.map((lead, index) => (
              <motion.div
                key={lead.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.02 }}
              >
                <LeadCard
                  lead={lead}
                  variant="default"
                  showTemperature={true}
                  onClick={() => handleLeadClick(lead.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Lead Detail Modal */}
      <LeadDetailModal
        leadId={selectedLeadId}
        open={!!selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
      />

      {/* New Lead Modal */}
      <NewLeadModal open={showNewLead} onClose={() => setShowNewLead(false)} />
    </div>
  );
}
