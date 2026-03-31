export const CAMPAIGN_OBJECTIVES = [
  { value: 'OUTCOME_LEADS', label: 'Geração de Leads' },
  { value: 'OUTCOME_TRAFFIC', label: 'Tráfego' },
  { value: 'OUTCOME_AWARENESS', label: 'Reconhecimento' },
  { value: 'OUTCOME_ENGAGEMENT', label: 'Engajamento' },
  { value: 'OUTCOME_SALES', label: 'Vendas' },
] as const;

export const AD_STATUSES = {
  ACTIVE: { label: 'Ativo', color: 'bg-green-500' },
  PAUSED: { label: 'Pausado', color: 'bg-yellow-500' },
  DELETED: { label: 'Excluído', color: 'bg-red-500' },
  ARCHIVED: { label: 'Arquivado', color: 'bg-gray-500' },
} as const;

export const CREATIVE_ANGLES = [
  { value: 'dor', label: 'Dor', emoji: '😰', description: 'Foca na dor/problema do público', promptHint: 'pessoa frustrada, sobrecarregada, perdendo tempo' },
  { value: 'oportunidade', label: 'Oportunidade', emoji: '🚀', description: 'Mostra oportunidade de mercado', promptHint: 'oportunidade emergente, tendência, mercado em alta' },
  { value: 'resultado', label: 'Resultado', emoji: '💰', description: 'Evidencia resultados concretos', promptHint: 'pessoa bem-sucedida, gráficos subindo, celebração' },
  { value: 'curiosidade', label: 'Curiosidade', emoji: '🤔', description: 'Gera curiosidade e desejo', promptHint: 'mistério, segredo revelado, bastidores' },
  { value: 'autoridade', label: 'Autoridade', emoji: '👑', description: 'Posiciona como autoridade', promptHint: 'especialista, palco, ensino, prova social' },
] as const;

export const CREATIVE_FORMATS = [
  { value: '1:1', label: 'Feed (1:1)', width: 1080, height: 1080 },
  { value: '9:16', label: 'Stories (9:16)', width: 1080, height: 1920 },
  { value: '4:5', label: 'Feed Vertical (4:5)', width: 1080, height: 1350 },
  { value: '16:9', label: 'Landscape (16:9)', width: 1920, height: 1080 },
] as const;

export const CTA_OPTIONS = [
  { value: 'LEARN_MORE', label: 'Saiba mais' },
  { value: 'SIGN_UP', label: 'Cadastre-se' },
  { value: 'APPLY_NOW', label: 'Inscreva-se' },
  { value: 'CONTACT_US', label: 'Fale conosco' },
  { value: 'SHOP_NOW', label: 'Comprar agora' },
] as const;

export const OPTIMIZATION_GOALS = [
  { value: 'LEAD_GENERATION', label: 'Geração de Leads' },
  { value: 'LINK_CLICKS', label: 'Cliques no Link' },
  { value: 'LANDING_PAGE_VIEWS', label: 'Visualizações da LP' },
  { value: 'IMPRESSIONS', label: 'Impressões' },
  { value: 'REACH', label: 'Alcance' },
] as const;

export const BID_STRATEGIES = [
  { value: 'LOWEST_COST_WITHOUT_CAP', label: 'Menor custo (automático)' },
  { value: 'LOWEST_COST_WITH_BID_CAP', label: 'Menor custo com teto' },
  { value: 'COST_CAP', label: 'Custo-alvo' },
] as const;

export const COPY_TEMPLATES = {
  dor: { headline: 'Cansado de [DOR]? Existe uma saída.', primary_text: 'Você está [DESCREVENDO DOR]? A maioria dos empreendedores perde tempo e dinheiro porque não sabe usar IA a seu favor.', description: 'Webinário gratuito toda terça às 20h' },
  oportunidade: { headline: 'A IA está mudando tudo. Você vai ficar de fora?', primary_text: 'Enquanto você lê isso, seus concorrentes estão automatizando processos com IA. O mercado está mudando rápido.', description: 'Vaga limitada no webinário ao vivo' },
  resultado: { headline: 'R$500 mil com IA: veja como replicar', primary_text: 'Frank Costa faturou meio milhão 100% no automático usando IA. Neste webinário gratuito, ele mostra o passo a passo.', description: 'Método testado e validado' },
  curiosidade: { headline: 'O segredo que empresários de sucesso usam', primary_text: 'Existe um método simples de IA que separa quem escala dos que ficam estagnados.', description: 'Descubra no webinário gratuito' },
  autoridade: { headline: 'Aprenda com quem já implementou IA em +200 negócios', primary_text: 'Frank Costa é especialista em IA aplicada a negócios e já ajudou centenas de empresários a automatizar e escalar.', description: 'Webinário ao vivo com Frank Costa' },
} as const;

export const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'] as const;

export const META_API_VERSION = 'v21.0';
export const META_GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`;

export type CreativeAngleKey = typeof CREATIVE_ANGLES[number]['value'];
