import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface UseClick2CallReturn {
  initiateCall: (phoneNumber: string, contactName?: string) => Promise<void>;
  isLoading: boolean;
}

// Formato do telefone: remove tudo exceto números
const formatPhoneNumber = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

// Normaliza para E.164 (Brasil): 55 + DDD + número
// - Se já vier com 55, mantém
// - Se vier apenas com DDD+número (10/11 dígitos), prefixa 55
const toE164BR = (digitsOnlyPhone: string): string => {
  if (!digitsOnlyPhone) return '';
  if (digitsOnlyPhone.startsWith('55')) return digitsOnlyPhone;
  // DDD (2) + número (8/9)
  if (digitsOnlyPhone.length === 10 || digitsOnlyPhone.length === 11) {
    return `55${digitsOnlyPhone}`;
  }
  // fallback: retorna como está (pode ser internacional já, mas sem 55)
  return digitsOnlyPhone;
};

// Cache do token para evitar múltiplas requisições
let cachedToken: string | null = null;

export function useClick2Call(): UseClick2CallReturn {
  const [isLoading, setIsLoading] = useState(false);

  // Busca o token de forma segura via edge function
  const getWavoipToken = useCallback(async (): Promise<string | null> => {
    if (cachedToken) return cachedToken;

    try {
      const { data, error } = await supabase.functions.invoke('get-wavoip-token');
      
      if (error) throw error;
      
      if (data?.token) {
        cachedToken = data.token;
        return data.token;
      }
      
      return null;
    } catch {
      return null;
    }
  }, []);

  const initiateCall = useCallback(async (phoneNumber: string, contactName?: string) => {
    const digits = formatPhoneNumber(phoneNumber);
    const e164Phone = toE164BR(digits);

    if (!digits) {
      toast.error('Número de telefone inválido');
      return;
    }

    setIsLoading(true);

    // IMPORTANT: abrir popup imediatamente (antes de qualquer await) para evitar bloqueio do navegador
    const features = 'popup=yes,width=400,height=600,resizable=yes,scrollbars=no,status=no,menubar=no,toolbar=no';
    const callWindow = window.open('about:blank', 'wavoip_call', features);
    if (!callWindow) {
      toast.error('Popup bloqueado. Permita popups para este site.');
      setIsLoading(false);
      return;
    }

    // Feedback rápido na janela aberta
    try {
      callWindow.document.title = 'Conectando...';
      callWindow.document.body.style.margin = '0';
      callWindow.document.body.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
      callWindow.document.body.innerHTML = `
        <div style="padding:16px;">
          <div style="font-size:14px; opacity:.8;">Wavoip</div>
          <div style="font-size:18px; font-weight:600; margin-top:8px;">Abrindo chamada…</div>
          <div style="margin-top:8px; font-size:13px; opacity:.75;">Aguarde alguns segundos.</div>
        </div>
      `;
    } catch {
      // ignore
    }

    try {
      const token = await getWavoipToken();
      
      if (!token) {
        throw new Error('Token Wavoip não configurado. Configure o secret WAVOIP_TOKEN.');
      }

      // Monta a URL do Click2Call
      const params = new URLSearchParams({
        token: token,
        phone: e164Phone,
        start_if_ready: 'true',
        available_after_call: 'false',
        close_after_call: 'true',
      });

      // Adiciona nome se disponível
      if (contactName) {
        params.append('name', contactName);
      }

      const callUrl = `https://app.wavoip.com/call?${params.toString()}`;

      // Navega a janela já aberta (evita bloqueio)
      callWindow.location.href = callUrl;
      callWindow.focus();

      toast.success('Janela de chamada aberta!', { duration: 2000 });

    } catch (err: any) {
      toast.error(err?.message || 'Erro ao iniciar chamada');

      // Se deu erro depois de abrir o popup, fecha pra não ficar janela em branco
      try {
        callWindow.close();
      } catch {
        // ignore
      }
    } finally {
      setIsLoading(false);
    }
  }, [getWavoipToken]);

  return {
    initiateCall,
    isLoading,
  };
}
