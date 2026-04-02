// Parsing utilities ported from src/config/sheets.ts for Deno edge functions.
// Returns database-ready objects with snake_case column names.

export function parseDate(v: string | undefined): string | null {
  if (!v || !v.trim()) return null;
  const s = v.trim();

  // DD/MM/YYYY
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) {
    const d = new Date(+br[3], +br[2] - 1, +br[1]);
    if (isNaN(d.getTime())) return null;
    return `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
  }

  // YYYY-MM-DD
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const d = new Date(+iso[1], +iso[2] - 1, +iso[3]);
    if (isNaN(d.getTime())) return null;
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }

  // fallback
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export function parseNumber(v: string | undefined): number {
  if (!v || !v.trim()) return 0;
  const cleaned = v.replace(/R\$\s*/gi, "").replace(/\s/g, "");
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let normalized: string;
  if (lastComma >= 0 && lastDot >= 0) {
    if (lastDot > lastComma) {
      normalized = cleaned.replace(/,/g, "");
    } else {
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    }
  } else if (lastComma >= 0) {
    if (/,\d{2}$/.test(cleaned)) {
      normalized = cleaned.replace(",", ".");
    } else {
      normalized = cleaned.replace(/,/g, "");
    }
  } else {
    normalized = cleaned;
  }
  const n = parseFloat(normalized);
  return isNaN(n) ? 0 : n;
}

function str(v: string | undefined): string {
  return v?.trim() ?? "";
}

// ── Row types (database-ready, snake_case) ──────────────────────────────────

export interface SheetsLeadRow {
  origem: string;
  instagram: string;
  email: string;
  nome: string;
  telefone: string;
  faturamento: string;
  profissao: string;
  mql: string;
  socio: string;
  lead_scoring: string;
  data_cadastro: string | null;
  data_contato: string | null;
  data_agendamento: string | null;
  data_call: string | null;
  hora_call: string;
  sdr: string;
  status_call: string;
  status_venda: string;
  motivo_noshow: string;
  cash_collected: number;
  valor_total: number;
  closer: string;
  produto_vendido: string;
  valor_oportunidade: number;
  data_conclusao: string | null;
  razao_perda: string;
  link_reuniao: string;
  observacoes: string;
  data_2call: string | null;
  hora_2call: string;
  status_call_2: string;
  status_venda_2: string;
  motivo_noshow_2: string;
  cash_collected_2: number;
  valor_total_2: number;
  ad_name_email: string;
  ad_name_telefone: string;
}

export interface SheetsMetaAdRow {
  day: string | null;
  campaign_name: string;
  campaign_id: string;
  ad_set_name: string;
  ad_name: string;
  ad_id: string;
  amount_spent: number;
  impressions: number;
  three_sec_views: number;
  video_watches_75: number;
  link_clicks: number;
  landing_page_views: number;
}

export interface SheetsGhlBaseRow {
  contact_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  business_name: string;
  created: string | null;
  last_activity: string | null;
  tags: string;
  utm_placement: string;
  utm_target: string;
  utm_term: string;
  utm_campaign: string;
  utm_medium: string;
  utm_content: string;
  utm_source: string;
  faixa_faturamento: string;
  area_atuacao: string;
  faixa_faturamento_mensal: string;
  ad_name: string;
}

export interface SheetsGhlLeadRow {
  contact_id: string;
  nome: string;
  email: string;
  telefone: string;
  data_criacao: string | null;
  tags: string;
  source: string;
  faturamento: string;
  profissao: string;
  campaign_first: string;
  ad_name_first: string;
  utm_source: string;
  session_source: string;
  campaign_latest: string;
  ad_name_latest: string;
  funil: string;
  socio: string;
  webinar_tag: string;
}

// ── Row parsers ─────────────────────────────────────────────────────────────

export function parseLeadRows(raw: string[][]): SheetsLeadRow[] {
  if (raw.length < 4) return [];
  return raw.slice(3)
    .filter((r) => str(r[2]) || str(r[3]) || str(r[4])) // skip empty rows
    .map((r) => ({
      origem: str(r[0]),
      instagram: str(r[1]),
      email: str(r[2]),
      nome: str(r[3]),
      telefone: str(r[4]),
      faturamento: str(r[5]),
      profissao: str(r[6]),
      mql: str(r[7]),
      socio: str(r[8]),
      lead_scoring: str(r[9]),
      data_cadastro: parseDate(r[10]),
      data_contato: parseDate(r[11]),
      data_agendamento: parseDate(r[12]),
      data_call: parseDate(r[13]),
      hora_call: str(r[14]),
      sdr: str(r[15]),
      status_call: str(r[16]),
      status_venda: str(r[17]),
      motivo_noshow: str(r[18]),
      cash_collected: parseNumber(r[19]),
      valor_total: parseNumber(r[20]),
      closer: str(r[21]),
      produto_vendido: str(r[22]),
      valor_oportunidade: parseNumber(r[23]),
      data_conclusao: parseDate(r[24]),
      razao_perda: str(r[25]),
      link_reuniao: str(r[26]),
      observacoes: str(r[27]),
      data_2call: parseDate(r[30]),
      hora_2call: str(r[31]),
      status_call_2: str(r[32]),
      status_venda_2: str(r[33]),
      motivo_noshow_2: str(r[34]),
      cash_collected_2: parseNumber(r[35]),
      valor_total_2: parseNumber(r[36]),
      ad_name_email: str(r[37]),
      ad_name_telefone: str(r[38]),
    }));
}

export function parseMetaRows(raw: string[][]): SheetsMetaAdRow[] {
  if (raw.length < 2) return [];
  return raw.slice(1)
    .filter((r) => str(r[0]) || str(r[1])) // skip empty rows
    .map((r) => ({
      day: parseDate(r[0]),
      campaign_name: str(r[1]),
      campaign_id: str(r[2]),
      ad_set_name: str(r[3]),
      ad_name: str(r[4]),
      ad_id: str(r[5]),
      amount_spent: parseNumber(r[6]),
      impressions: parseNumber(r[7]),
      three_sec_views: parseNumber(r[8]),
      video_watches_75: parseNumber(r[9]),
      link_clicks: parseNumber(r[10]),
      landing_page_views: parseNumber(r[11]),
    }));
}

export function parseGhlRows(raw: string[][]): SheetsGhlBaseRow[] {
  if (raw.length < 2) return [];
  return raw.slice(1)
    .filter((r) => str(r[0])) // skip rows without contact_id
    .map((r) => ({
      contact_id: str(r[0]),
      first_name: str(r[1]),
      last_name: str(r[2]),
      phone: str(r[3]),
      email: str(r[4]),
      business_name: str(r[5]),
      created: parseDate(r[6]),
      last_activity: parseDate(r[7]),
      tags: str(r[8]),
      utm_placement: str(r[9]),
      utm_target: str(r[10]),
      utm_term: str(r[11]),
      utm_campaign: str(r[12]),
      utm_medium: str(r[13]),
      utm_content: str(r[14]),
      utm_source: str(r[15]),
      area_atuacao: str(r[16]),
      faixa_faturamento: str(r[17]),
      faixa_faturamento_mensal: str(r[18]),
      ad_name: str(r[19]),
    }));
}

export function parseGhlLeadsTab(raw: string[][]): SheetsGhlLeadRow[] {
  if (raw.length < 2) return [];
  return raw.slice(1)
    .filter((r) => str(r[0])) // skip rows without contact_id
    .map((r) => ({
      contact_id: str(r[0]),
      nome: str(r[1]),
      email: str(r[2]),
      telefone: str(r[3]),
      data_criacao: parseDate(r[4]),
      tags: str(r[5]),
      source: str(r[6]),
      faturamento: str(r[7]),
      profissao: str(r[8]),
      campaign_first: str(r[9]),
      ad_name_first: str(r[10]),
      utm_source: str(r[11]),
      session_source: str(r[12]),
      campaign_latest: str(r[13]),
      ad_name_latest: str(r[14]),
      funil: str(r[15]),
      socio: str(r[16]),
      webinar_tag: str(r[17]),
    }));
}
