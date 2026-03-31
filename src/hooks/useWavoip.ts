import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export type CallStatus = 
  | 'idle' 
  | 'connecting' 
  | 'ringing' 
  | 'connected' 
  | 'ended' 
  | 'rejected'
  | 'unanswered'
  | 'error';

interface UseWavoipReturn {
  status: CallStatus;
  isConnected: boolean;
  isCalling: boolean;
  startCall: (phoneNumber: string) => void;
  endCall: () => void;
  toggleMute: () => void;
  isMuted: boolean;
  error: string | null;
  callDuration: number;
  peerInfo: { name: string | null; phone: string } | null;
}

// Formato do telefone: remove tudo exceto números
const formatPhoneNumber = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

// Cache do token para evitar múltiplas requisições
let cachedToken: string | null = null;

export function useWavoip(): UseWavoipReturn {
  const [status, setStatus] = useState<CallStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [peerInfo, setPeerInfo] = useState<{ name: string | null; phone: string } | null>(null);
  
  const wavoipRef = useRef<any>(null);
  const activeCallRef = useRef<any>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Limpa o intervalo de duração quando o componente desmonta
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []);

  const startDurationTimer = useCallback(() => {
    setCallDuration(0);
    durationIntervalRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  }, []);

  const stopDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  const resetState = useCallback(() => {
    setTimeout(() => {
      setStatus('idle');
      setError(null);
      setPeerInfo(null);
      setIsMuted(false);
      setCallDuration(0);
      activeCallRef.current = null;
    }, 2000);
  }, []);

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

  // Verifica e solicita permissão de microfone
  const checkMicrophonePermission = useCallback(async (): Promise<boolean> => {
    try {
      // Lista dispositivos disponíveis
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(d => d.kind === 'audioinput');

      if (audioInputs.length === 0) {
        throw new Error('Nenhum microfone detectado no sistema.');
      }

      // Solicita acesso ao microfone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Para o stream após verificar (o Wavoip vai criar o próprio)
      stream.getTracks().forEach(track => track.stop());
      
      return true;
    } catch (err: any) {
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Permissão de microfone negada. Permita o acesso nas configurações do navegador.');
        toast.error('Permissão de microfone negada. Clique no ícone de cadeado na barra de endereços para permitir.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('Nenhum microfone encontrado. Conecte um microfone e tente novamente.');
        toast.error('Nenhum microfone encontrado. Conecte um microfone.');
      } else {
        setError(err.message || 'Erro ao acessar microfone');
        toast.error(err.message || 'Erro ao acessar microfone');
      }
      
      return false;
    }
  }, []);

  const startCall = useCallback(async (phoneNumber: string) => {
    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    if (!formattedPhone) {
      setError('Número de telefone inválido');
      toast.error('Número de telefone inválido');
      return;
    }

    setStatus('connecting');
    setError(null);
    setPeerInfo({ name: null, phone: formattedPhone });

    try {
      // Verificar microfone ANTES de tudo
      const hasMic = await checkMicrophonePermission();
      if (!hasMic) {
        setStatus('error');
        resetState();
        return;
      }

      // Buscar token
      const token = await getWavoipToken();
      
      if (!token) {
        throw new Error('Token Wavoip não configurado. Configure o secret WAVOIP_TOKEN.');
      }

      // Importação dinâmica do Wavoip (nova API)
      const { Wavoip } = await import('@wavoip/wavoip-api');

      // Inicializa o Wavoip com o token
      wavoipRef.current = new Wavoip({
        tokens: [token]
      });

      // Verificar dispositivos disponíveis
      const devices = wavoipRef.current.devices;

      if (devices && devices.length > 0) {
        // Verificar se algum dispositivo está "open" (pronto para ligar)
        const readyDevice = devices.find((d: any) => d.status === 'open');
        if (!readyDevice) {
          // Se o dispositivo está em hibernação, tentar acordar
          const hibernatingDevice = devices.find((d: any) => d.status === 'hibernating');
          if (hibernatingDevice) {
            toast.info('Dispositivo em hibernação, tentando acordar...');
            await hibernatingDevice.wakeUp();
            // Aguardar um pouco para o dispositivo acordar
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
          // Se precisa vincular número (status close ou connecting)
          const needsQR = devices.find((d: any) => d.status === 'close' || d.status === 'connecting');
          if (needsQR) {
            throw new Error('Dispositivo Wavoip não está conectado. É necessário vincular um número de WhatsApp no painel Wavoip.');
          }
        }
      }

      // Inicia a chamada
      const { call, err } = await wavoipRef.current.startCall({
        to: formattedPhone,
      });

      if (err) {
        throw new Error(err.message || 'Erro ao iniciar chamada');
      }

      if (!call) {
        throw new Error('Chamada não foi criada');
      }

      activeCallRef.current = call;
      setStatus('ringing');
      toast.info('Chamando...', { duration: 2000 });

      // Atualiza info do peer
      if (call.peer) {
        setPeerInfo({
          name: call.peer.displayName,
          phone: call.peer.phone || formattedPhone
        });
      }

      // Evento: Chamada aceita pelo destinatário
      call.onPeerAccept((activeCall: any) => {
        activeCallRef.current = activeCall;
        setStatus('connected');
        startDurationTimer();
        toast.success('Chamada conectada!');

        // Eventos da chamada ativa
        activeCall.onEnd(() => {
          setStatus('ended');
          stopDurationTimer();
          toast.info('Chamada encerrada');
          resetState();
        });

        activeCall.onError((error: string) => {
          setError(error);
          setStatus('error');
          stopDurationTimer();
          toast.error('Erro na chamada');
          resetState();
        });

        activeCall.onPeerMute(() => {});

        activeCall.onPeerUnmute(() => {});
      });

      // Evento: Chamada rejeitada pelo destinatário
      call.onPeerReject(() => {
        setStatus('rejected');
        toast.error('Chamada rejeitada');
        resetState();
      });

      // Evento: Chamada não atendida
      call.onUnanswered(() => {
        setStatus('unanswered');
        toast.warning('Chamada não atendida');
        resetState();
      });

      // Evento: Fim (fallback)
      call.onEnd(() => {
        if (status !== 'connected') {
          setStatus('ended');
          resetState();
        }
      });

    } catch (err: any) {
      setError(err?.message || 'Erro ao iniciar chamada');
      setStatus('error');
      toast.error(err?.message || 'Erro ao iniciar chamada');
      resetState();
    }
  }, [startDurationTimer, stopDurationTimer, getWavoipToken, resetState, status, checkMicrophonePermission]);

  const endCall = useCallback(async () => {
    try {
      if (activeCallRef.current && typeof activeCallRef.current.end === 'function') {
        const { err } = await activeCallRef.current.end();
        if (err) {
          // End call error
        }
      }
      setStatus('ended');
      stopDurationTimer();
      toast.info('Chamada encerrada');
      resetState();
    } catch {
      resetState();
    }
  }, [stopDurationTimer, resetState]);

  const toggleMute = useCallback(async () => {
    try {
      if (!activeCallRef.current) return;

      if (isMuted) {
        const { err } = await activeCallRef.current.unmute();
        if (!err) {
          setIsMuted(false);
          toast.info('Microfone ligado');
        }
      } else {
        const { err } = await activeCallRef.current.mute();
        if (!err) {
          setIsMuted(true);
          toast.info('Microfone desligado');
        }
      }
    } catch {
      // Mute/unmute failed
    }
  }, [isMuted]);

  return {
    status,
    isConnected: status === 'connected',
    isCalling: status === 'connecting' || status === 'ringing' || status === 'connected',
    startCall,
    endCall,
    toggleMute,
    isMuted,
    error,
    callDuration,
    peerInfo,
  };
}
