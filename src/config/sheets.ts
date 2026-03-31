// ── Types ──────────────────────────────────────────────────────────────────────

export interface LeadRow {
  origem: string;
  instagram: string;
  email: string;
  nome: string;
  telefone: string;
  faturamento: string;
  profissao: string;
  mql: string;
  socio: string;
  leadScoring: string;
  dataCadastro: Date | null;
  dataContato: Date | null;
  dataAgendamento: Date | null;
  dataCall: Date | null;
  horaCall: string;
  sdr: string;
  statusCall: string;
  statusVenda: string;
  motivoNoshow: string;
  cashCollected: number;
  valorTotal: number;
  closer: string;
  produtoVendido: string;
  valorOportunidade: number;
  dataConclusao: Date | null;
  razaoPerda: string;
  linkReuniao: string;
  observacoes: string;
  data2Call: Date | null;
  hora2Call: string;
  statusCall2: string;
  statusVenda2: string;
  motivoNoshow2: string;
  cashCollected2: number;
  valorTotal2: number;
  adNameEmail: string;
  adNameTelefone: string;
}

export interface MetaAdveronixRow {
  day: Date | null;
  campaignName: string;
  campaignId: string;
  adSetName: string;
  adName: string;
  adId: string;
  amountSpent: number;
  impressions: number;
  threeSecViews: number;
  videoWatches75: number;
  linkClicks: number;
  landingPageViews: number;
}

export interface LeadsGhlRow {
  contactId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  businessName: string;
  created: Date | null;
  lastActivity: Date | null;
  tags: string;
  utmPlacement: string;
  utmTarget: string;
  utmTerm: string;
  utmCampaign: string;
  utmMedium: string;
  utmContent: string;
  utmSource: string;
  faixaFaturamento: string;
  areaAtuacao: string;
  faixaFaturamentoMensal: string;
  adName: string;
}

// ── GHL LEADS tab (processed view with funnel classification) ─────────────────

export interface GhlLeadsTabRow {
  contactId: string;
  nome: string;
  email: string;
  telefone: string;
  dataCriacao: Date | null;
  tags: string;
  source: string;
  faturamento: string;
  profissao: string;
  campaignFirst: string;
  adNameFirst: string;
  utmSource: string;
  sessionSource: string;
  campaignLatest: string;
  adNameLatest: string;
  funil: string;
  socio: string;
  webinarTag: string;
}



export function parseDate(v: string | undefined): Date | null {
  if (!v || !v.trim()) return null;
  const s = v.trim();

  // DD/MM/YYYY
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) {
    const d = new Date(+br[3], +br[2] - 1, +br[1]);
    return isNaN(d.getTime()) ? null : d;
  }

  // YYYY-MM-DD
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const d = new Date(+iso[1], +iso[2] - 1, +iso[3]);
    return isNaN(d.getTime()) ? null : d;
  }

  // fallback
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function parseNumber(v: string | undefined): number {
  if (!v || !v.trim()) return 0;
  const cleaned = v.replace(/R\$\s*/gi, "").replace(/\s/g, "");
  // Detect format: if dot comes AFTER comma → US format (comma=thousands, dot=decimal)
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let normalized: string;
  if (lastComma >= 0 && lastDot >= 0) {
    if (lastDot > lastComma) {
      // US format: 2,333.00 → remove commas
      normalized = cleaned.replace(/,/g, "");
    } else {
      // BR format: 2.333,00 → remove dots, comma→dot
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    }
  } else if (lastComma >= 0) {
    // Only comma: could be BR decimal (1.234,56 without thousands) or thousands
    // If comma is followed by exactly 2 digits at end → treat as decimal
    if (/,\d{2}$/.test(cleaned)) {
      normalized = cleaned.replace(",", ".");
    } else {
      normalized = cleaned.replace(/,/g, "");
    }
  } else {
    // Only dots or no separators
    normalized = cleaned;
  }
  const n = parseFloat(normalized);
  return isNaN(n) ? 0 : n;
}

function str(v: string | undefined): string {
  return v?.trim() ?? "";
}

// ── Row parsers ───────────────────────────────────────────────────────────────

export function parseLeadRows(raw: string[][]): LeadRow[] {
  // Data starts at row 4 (skip 3 header rows)
  if (raw.length < 4) return [];
  return raw.slice(3).map((r) => ({
    origem: str(r[0]),
    instagram: str(r[1]),
    email: str(r[2]),
    nome: str(r[3]),
    telefone: str(r[4]),
    faturamento: str(r[5]),
    profissao: str(r[6]),
    mql: str(r[7]),
    socio: str(r[8]),
    leadScoring: str(r[9]),
    dataCadastro: parseDate(r[10]),
    dataContato: parseDate(r[11]),
    dataAgendamento: parseDate(r[12]),
    dataCall: parseDate(r[13]),
    horaCall: str(r[14]),
    sdr: str(r[15]),
    statusCall: str(r[16]),
    statusVenda: str(r[17]),
    motivoNoshow: str(r[18]),
    cashCollected: parseNumber(r[19]),
    valorTotal: parseNumber(r[20]),
    closer: str(r[21]),
    produtoVendido: str(r[22]),
    valorOportunidade: parseNumber(r[23]),
    dataConclusao: parseDate(r[24]),
    razaoPerda: str(r[25]),
    linkReuniao: str(r[26]),
    observacoes: str(r[27]),
    // Columns 28-29 are empty spacer columns in the sheet
    data2Call: parseDate(r[30]),
    hora2Call: str(r[31]),
    statusCall2: str(r[32]),
    statusVenda2: str(r[33]),
    motivoNoshow2: str(r[34]),
    cashCollected2: parseNumber(r[35]),
    valorTotal2: parseNumber(r[36]),
    adNameEmail: str(r[37]),
    adNameTelefone: str(r[38]),
  }));
}

export function parseMetaRows(raw: string[][]): MetaAdveronixRow[] {
  if (raw.length < 2) return [];
  return raw.slice(1).map((r) => ({
    day: parseDate(r[0]),
    campaignName: str(r[1]),
    campaignId: str(r[2]),
    adSetName: str(r[3]),
    adName: str(r[4]),
    adId: str(r[5]),
    amountSpent: parseNumber(r[6]),
    impressions: parseNumber(r[7]),
    threeSecViews: parseNumber(r[8]),
    videoWatches75: parseNumber(r[9]),
    linkClicks: parseNumber(r[10]),
    landingPageViews: parseNumber(r[11]),
  }));
}

export function parseGhlRows(raw: string[][]): LeadsGhlRow[] {
  if (raw.length < 2) return [];
  return raw.slice(1).map((r) => ({
    contactId: str(r[0]),
    firstName: str(r[1]),
    lastName: str(r[2]),
    phone: str(r[3]),
    email: str(r[4]),
    businessName: str(r[5]),
    created: parseDate(r[6]),
    lastActivity: parseDate(r[7]),
    tags: str(r[8]),
    utmPlacement: str(r[9]),
    utmTarget: str(r[10]),
    utmTerm: str(r[11]),
    utmCampaign: str(r[12]),
    utmMedium: str(r[13]),
    utmContent: str(r[14]),
    utmSource: str(r[15]),
    faixaFaturamento: str(r[17]),
    areaAtuacao: str(r[16]),
    faixaFaturamentoMensal: str(r[18]),
    adName: str(r[19]),
  }));
}

// GHL LEADS tab columns: ID, Nome, Email, Telefone, Data Criação, Tags, Source,
// Faturamento, Profissão, Campaign (First), Ad Name (First), UTM Source,
// Session Source, Campaign (Latest), Ad Name (Latest), Funil, Sócio, Webinar Tag
export function parseGhlLeadsTab(raw: string[][]): GhlLeadsTabRow[] {
  if (raw.length < 2) return [];
  return raw.slice(1).map((r) => ({
    contactId: str(r[0]),
    nome: str(r[1]),
    email: str(r[2]),
    telefone: str(r[3]),
    dataCriacao: parseDate(r[4]),
    tags: str(r[5]),
    source: str(r[6]),
    faturamento: str(r[7]),
    profissao: str(r[8]),
    campaignFirst: str(r[9]),
    adNameFirst: str(r[10]),
    utmSource: str(r[11]),
    sessionSource: str(r[12]),
    campaignLatest: str(r[13]),
    adNameLatest: str(r[14]),
    funil: str(r[15]),
    socio: str(r[16]),
    webinarTag: str(r[17]),
  }));
}
