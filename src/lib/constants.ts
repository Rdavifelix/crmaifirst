// Status do funil de vendas
export const LEAD_STATUSES = {
  new: { label: 'Novo Lead', color: 'status-new', order: 1 },
  first_contact: { label: 'Primeiro Contacto', color: 'status-contact', order: 2 },
  negotiating: { label: 'Em Negociação', color: 'status-negotiating', order: 3 },
  proposal_sent: { label: 'Proposta Enviada', color: 'status-proposal', order: 4 },
  follow_up: { label: 'Follow-up', color: 'status-followup', order: 5 },
  won: { label: 'Fechou ✅', color: 'status-won', order: 6 },
  lost: { label: 'Perdeu ❌', color: 'status-lost', order: 7 },
} as const;

// Status pós-venda
export const POST_SALE_STATUSES = {
  awaiting_onboarding: { label: 'Aguardando Onboarding', color: 'postsale-awaiting', order: 1 },
  in_onboarding: { label: 'Em Onboarding', color: 'postsale-onboarding', order: 2 },
  onboarding_complete: { label: 'Onboarding Concluído', color: 'postsale-complete', order: 3 },
  follow_up_30: { label: 'Acompanhamento 30 dias', color: 'postsale-followup', order: 4 },
  active_client: { label: 'Cliente Ativo', color: 'postsale-active', order: 5 },
} as const;

// Motivos de perda
export const LOSS_REASONS = [
  'Preço elevado',
  'Escolheu concorrente',
  'Sem orçamento disponível',
  'Timing inadequado',
  'Deixou de responder',
  'Produto não atende',
  'Desistiu da compra',
  'Outro',
] as const;

// Categorias de canais
export const CHANNEL_CATEGORIES = {
  social: 'Redes Sociais',
  ads: 'Anúncios',
  organic: 'Orgânico',
  referral: 'Indicação',
  other: 'Outros',
} as const;

// UTM defaults
export const UTM_MEDIUMS = [
  'social',
  'cpc',
  'cpm',
  'email',
  'affiliate',
  'referral',
  'organic',
  'video',
  'display',
] as const;

export type LeadStatus = keyof typeof LEAD_STATUSES;
export type PostSaleStatus = keyof typeof POST_SALE_STATUSES;
export type ChannelCategory = keyof typeof CHANNEL_CATEGORIES;