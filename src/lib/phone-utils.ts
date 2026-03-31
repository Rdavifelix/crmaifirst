/**
 * Utilitários de validação e formatação de telefone angolano
 * Formato: +244 9XX XXX XXX
 */

// Remove tudo excepto dígitos
export const cleanPhone = (phone: string): string => phone.replace(/\D/g, '');

// Valida se é um número angolano válido (9 dígitos começando por 9, com ou sem +244)
export const isValidAngolanPhone = (phone: string): boolean => {
  const digits = cleanPhone(phone);
  // 9 dígitos locais (9XXXXXXXX)
  if (/^9\d{8}$/.test(digits)) return true;
  // Com indicativo 244
  if (/^244\s*9\d{8}$/.test(digits)) return true;
  return false;
};

// Formata para exibição: +244 9XX XXX XXX
export const formatAngolanPhone = (phone: string): string => {
  const digits = cleanPhone(phone);
  let local = digits;
  if (digits.startsWith('244') && digits.length === 12) {
    local = digits.slice(3);
  }
  if (local.length === 9) {
    return `+244 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
  }
  return phone;
};

// Formata input em tempo real enquanto o utilizador digita
export const formatPhoneInput = (value: string): string => {
  const digits = cleanPhone(value);
  
  // Se começa com 244, trata como número com indicativo
  if (digits.startsWith('244')) {
    const local = digits.slice(3);
    if (local.length === 0) return '+244 ';
    if (local.length <= 3) return `+244 ${local}`;
    if (local.length <= 6) return `+244 ${local.slice(0, 3)} ${local.slice(3)}`;
    return `+244 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6, 9)}`;
  }
  
  // Número local (9 dígitos)
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`;
};

// Normaliza para E.164 angolano (+244XXXXXXXXX)
export const toE164AO = (phone: string): string | null => {
  const digits = cleanPhone(phone);
  if (/^9\d{8}$/.test(digits)) return `+244${digits}`;
  if (/^2449\d{8}$/.test(digits)) return `+${digits}`;
  return null;
};
