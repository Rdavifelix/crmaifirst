// ── Funnel classification utility ─────────────────────────────────────────────
// Pure functions, no React dependencies.

export type Funnel = "webinar" | "aplicacao" | "estudo_caso" | "instagram" | "outros";

export const FUNNEL_CONFIG: Record<Funnel, { label: string; color: string }> = {
  webinar:     { label: "Webinar",        color: "hsl(218,70%,42%)" },
  aplicacao:   { label: "Aplicação (MR)", color: "hsl(258,60%,52%)" },
  estudo_caso: { label: "Estudo de Caso", color: "hsl(162,55%,38%)" },
  instagram:   { label: "Instagram",      color: "hsl(36,88%,50%)" },
  outros:      { label: "Outros",         color: "hsl(200,15%,50%)" },
};

/**
 * Classifies a record into one of the marketing funnels.
 *
 * REGRAS DE CLASSIFICAÇÃO (baseadas nos dados reais):
 *
 * WEBINAR:
 *   - origem: [W1] Cadastro, [W27] Aplicação, [W14] Inscrito (qualquer [W\d+])
 *   - adName/campaignName: contém [W seguido de dígito, ou webinar/wbn
 *   - tags: contém lead_w\d+ ou aplicou_w
 *
 * APLICAÇÃO (MR):
 *   - origem: exatamente "MR" ou contém "[MR"
 *   - adName/campaignName: contém [MR ou _MR_
 *
 * ESTUDO DE CASO:
 *   - origem: "ec - Cauê", "ec-" ou "ec " no início
 *   - origem/ad/camp: contém "[EC" ou "estudo de caso"
 *
 * INSTAGRAM:
 *   - origem: [IG], [INSTA], "Dm insta", "Post"
 *
 * OUTROS: tudo que não bate com os padrões acima
 */
export function classifyFunnel(params: {
  adName?: string;
  campaignName?: string;
  origem?: string;
  tags?: string;
  utmCampaign?: string;
}): Funnel {
  const ad   = params.adName?.toLowerCase().trim() ?? "";
  const camp = params.campaignName?.toLowerCase().trim() ?? "";
  const org  = params.origem?.toLowerCase().trim() ?? "";
  const tags = params.tags?.toLowerCase().trim() ?? "";

  // ── WEBINAR ───────────────────────────────────────────────
  if (
    /\[w\d|\[w\]/i.test(org) ||
    /\[w\d|\[w\]/i.test(ad) || /\[w\d|\[w\]/i.test(camp) ||
    /webinar|wbn/i.test(ad) || /webinar|wbn/i.test(camp) ||
    /lead_w\d|aplicou_w/i.test(tags)
  ) {
    return "webinar";
  }

  // ── APLICAÇÃO (MR) ────────────────────────────────────────
  if (
    /^\s*mr\s*$/i.test(params.origem?.trim() ?? "") ||
    /\[mr/i.test(org) ||
    /\[mr/i.test(ad) || /\[mr/i.test(camp) ||
    /_mr_|\bmr\b/i.test(ad) || /_mr_/i.test(camp)
  ) {
    return "aplicacao";
  }

  // ── ESTUDO DE CASO ────────────────────────────────────────
  if (
    /^ec\s*[-–—]/i.test(org) ||
    /\[ec/i.test(org) || /\[ec/i.test(ad) || /\[ec/i.test(camp) ||
    /estudo\s*(de\s*)?caso/i.test(org) ||
    /estudo.?caso/i.test(ad) || /estudo.?caso/i.test(camp)
  ) {
    return "estudo_caso";
  }

  // ── INSTAGRAM ─────────────────────────────────────────────
  if (
    /\[ig\]|\[ig\s/i.test(org) ||
    /\[insta/i.test(org) ||
    /^dm\s*insta/i.test(org) ||
    /^post$/i.test(org) ||
    /\[ig\]/i.test(ad) || /\[ig\]/i.test(camp) ||
    /instagram|insta\b/i.test(tags)
  ) {
    return "instagram";
  }

  return "outros";
}

/**
 * Extracts the webinar number (e.g. 25) from any field containing "W25", "[W25]", "lead_w25".
 */
export function extractWebinarNumber(...fields: (string | undefined)[]): number | null {
  for (const f of fields) {
    if (!f) continue;
    const match = f.match(/w(\d{1,2})\b/i);
    if (match) return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Checks if statusCall indicates a completed call.
 */
export function isCallRealizadaStatus(status: string): boolean {
  const s = status.toLowerCase();
  return s.includes("realizada") && !s.includes("não");
}

/**
 * Checks if statusVenda indicates a sale.
 */
export function isVendaStatus(status: string): boolean {
  return /venda|sinal\s*recebido/i.test(status);
}

/**
 * Checks if a venda status should count faturamento (valorTotal).
 * VENDA - SINAL counts as venda and cash, but NOT faturamento.
 */
export function isVendaComFaturamento(status: string): boolean {
  return isVendaStatus(status) && !/sinal/i.test(status);
}

/**
 * MQL check — faixa faturamento ≥ R$20k
 */
export function isMQL(faixa: string): boolean {
  if (!faixa) return false;
  const f = faixa.trim();
  const nums = [...f.matchAll(/(\d[\d.]*)/g)].map((m) =>
    parseFloat(m[1].replace(/\./g, "")) || 0
  );
  if (!nums.length) return false;
  return Math.min(...nums) >= 20000;
}
