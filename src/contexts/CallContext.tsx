import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCallTranscription } from '@/hooks/useCallTranscription';
import { usePlaybooks, SalesPlaybook } from '@/hooks/usePlaybooks';
import { useSalesCoach } from '@/hooks/useSalesCoach';
import { toast } from 'sonner';

// Types
export type CallStatus = 'idle' | 'connecting' | 'ringing' | 'connected' | 'ended' | 'rejected' | 'unanswered' | 'error';

export interface TranscriptionSegment {
  id: number;
  text: string;
  speaker: string;
  speakerType: 'local' | 'remote';
  confidence: number;
  timestamp: number;
  is_final: boolean;
}

export interface ActiveCall {
  id: string;
  direction: 'INCOMING' | 'OUTGOING';
  status: CallStatus;
  peerPhone: string;
  peerName?: string;
  startedAt: Date;
  duration: number;
  isMuted: boolean;
  leadId?: string;
}

export interface CallEndedResult {
  callId: string;
  duration: number;
  direction: 'INCOMING' | 'OUTGOING';
  peerPhone: string;
  peerName?: string;
  leadId?: string;
  transcriptions: TranscriptionSegment[];
  coachSessionId?: string | null;
}

interface CallOffer {
  accept: () => Promise<any>;
  reject: () => Promise<any>;
  peerPhone: string;
  peerName?: string;
}

interface CallContextType {
  callStatus: CallStatus;
  activeCall: ActiveCall | null;
  callEndedResult: CallEndedResult | null;
  incomingOffer: CallOffer | null;
  transcriptions: TranscriptionSegment[];
  isDeviceConnected: boolean;
  deviceLoading: boolean;
  initiateCall: (phoneNumber: string, leadId?: string) => Promise<void>;
  answerCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => Promise<void>;
  showIncomingModal: boolean;
  showActiveCallModal: boolean;
  showCallEndedModal: boolean;
  setShowIncomingModal: (v: boolean) => void;
  setShowActiveCallModal: (v: boolean) => void;
  setShowCallEndedModal: (v: boolean) => void;
  // Sales Coach
  selectedPlaybook: SalesPlaybook | null;
  setSelectedPlaybook: (pb: SalesPlaybook | null) => void;
  showPlaybookSelect: boolean;
  setShowPlaybookSelect: (v: boolean) => void;
  pendingCallArgs: { phoneNumber: string; leadId?: string } | null;
  confirmCallWithPlaybook: (playbook: SalesPlaybook | null) => void;
  cancelPlaybookSelect: () => void;
  salesCoach: ReturnType<typeof useSalesCoach>;
  activePlaybooks: SalesPlaybook[];
}

const CallContext = createContext<CallContextType | null>(null);

export const useCallContext = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCallContext must be used within CallProvider');
  return ctx;
};

// Phone formatting
const cleanPhone = (phone: string) => phone.replace(/\D/g, '');
const toE164BR = (digits: string): string => {
  if (!digits) return '';
  if (digits.startsWith('55') && digits.length >= 12) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
};

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const {
    transcriptions: sttTranscriptions,
    isTranscribing,
    startTranscription,
    stopTranscription,
    getFinalTranscriptions,
  } = useCallTranscription();
  const { activePlaybooks } = usePlaybooks();
  
  // State
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [callEndedResult, setCallEndedResult] = useState<CallEndedResult | null>(null);
  const [incomingOffer, setIncomingOffer] = useState<CallOffer | null>(null);
  const [isDeviceConnected, setIsDeviceConnected] = useState(false);
  const [deviceLoading, setDeviceLoading] = useState(true);
  
  // Modal visibility
  const [showIncomingModal, setShowIncomingModal] = useState(false);
  const [showActiveCallModal, setShowActiveCallModal] = useState(false);
  const [showCallEndedModal, setShowCallEndedModal] = useState(false);
  
  // Sales Coach state
  const [selectedPlaybook, setSelectedPlaybook] = useState<SalesPlaybook | null>(null);
  const [showPlaybookSelect, setShowPlaybookSelect] = useState(false);
  const [pendingCallArgs, setPendingCallArgs] = useState<{ phoneNumber: string; leadId?: string } | null>(null);

  // Refs
  const wavoipRef = useRef<any>(null);
  const activeCallObjRef = useRef<any>(null);
  const callStartTimeRef = useRef<Date | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const callHistoryIdRef = useRef<string | null>(null);
  const profileIdRef = useRef<string | null>(null);
  const isMutedRef = useRef(false);

  // Sales Coach hook
  const salesCoach = useSalesCoach({
    playbook: selectedPlaybook,
    transcriptions: sttTranscriptions,
    callId: callHistoryIdRef.current || '',
    leadId: activeCall?.leadId,
    leadName: activeCall?.peerName,
    profileId: profileIdRef.current || undefined,
    isActive: callStatus === 'connected' && !!selectedPlaybook,
  });

  // Get profile ID
  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (data) profileIdRef.current = data.id;
    };
    fetchProfile();
  }, [user]);

  // Initialize WaVoIP with device token
  useEffect(() => {
    if (!user) {
      setDeviceLoading(false);
      return;
    }

    const initDevice = async () => {
      setDeviceLoading(true);
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!profile) { setDeviceLoading(false); return; }

        const { data: device } = await supabase
          .from('wavoip_devices')
          .select('*')
          .eq('profile_id', profile.id)
          .eq('is_active', true)
          .single();

        if (!device?.token) {
          setDeviceLoading(false);
          return;
        }

        const { Wavoip } = await import('@wavoip/wavoip-api');
        const wavoip = new Wavoip({ tokens: [device.token] });
        wavoipRef.current = wavoip;

        const checkDeviceStatus = () => {
          const devices = wavoip.devices;
          if (devices?.length > 0) {
            const readyDevice = devices.find((d: any) => d.status === 'open');
            setIsDeviceConnected(!!readyDevice);
            const currentStatus = devices[0]?.status || 'disconnected';
            supabase.from('wavoip_devices').update({ status: currentStatus })
              .eq('id', device.id).then(() => {});
          }
        };

        const statusInterval = setInterval(checkDeviceStatus, 5000);
        setTimeout(checkDeviceStatus, 2000);

        wavoip.onOffer(async (offer: any) => {
          const peerPhone = offer?.peer?.phone || 'Desconhecido';
          const peerName = offer?.peer?.displayName;

          let leadId: string | undefined;
          try {
            const { data } = await supabase.rpc('find_lead_by_phone', { p_phone: peerPhone });
            if (data) leadId = data;
          } catch { /* lead lookup failed */ }

          const { data: callRecord } = await supabase.from('call_history').insert({
            profile_id: profile.id,
            wavoip_device_id: device.id,
            direction: 'INCOMING',
            status: 'RINGING',
            peer_phone: peerPhone,
            peer_name: peerName,
            lead_id: leadId,
          }).select('id').single();

          if (callRecord) callHistoryIdRef.current = callRecord.id;

          setIncomingOffer({
            accept: () => offer.accept(),
            reject: () => offer.reject(),
            peerPhone,
            peerName,
          });
          setShowIncomingModal(true);
        });

        setDeviceLoading(false);
        return () => clearInterval(statusInterval);
      } catch {
        setDeviceLoading(false);
      }
    };

    initDevice();
  }, [user]);

  // Duration timer
  const startDurationTimer = useCallback(() => {
    callStartTimeRef.current = new Date();
    durationIntervalRef.current = setInterval(() => {
      if (callStartTimeRef.current) {
        const duration = Math.floor((Date.now() - callStartTimeRef.current.getTime()) / 1000);
        setActiveCall(prev => prev ? { ...prev, duration } : null);
      }
    }, 1000);
  }, []);

  const stopDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  // Setup active call handlers
  const setupActiveCall = useCallback(async (call: any, direction: 'INCOMING' | 'OUTGOING', peerPhone: string, peerName?: string, leadId?: string) => {
    activeCallObjRef.current = call;
    startDurationTimer();
    setCallStatus('connected');
    setActiveCall({
      id: callHistoryIdRef.current || '',
      direction,
      status: 'connected',
      peerPhone,
      peerName,
      startedAt: new Date(),
      duration: 0,
      isMuted: false,
      leadId,
    });
    setShowActiveCallModal(true);

    if (callHistoryIdRef.current) {
      supabase.from('call_history').update({ status: 'ACTIVE' }).eq('id', callHistoryIdRef.current).then(() => {});
    }

    let remoteStream: MediaStream | null = null;
    try {
      await new Promise(r => setTimeout(r, 1500));
      const analyser = await Promise.race([
        call.audio_analyser,
        new Promise(r => setTimeout(r, 3000)),
      ]);
      if (analyser && (analyser as any).context) {
        const ctx = (analyser as any).context as AudioContext;
        const dest = ctx.createMediaStreamDestination();
        (analyser as AnalyserNode).connect(dest);
        remoteStream = dest.stream;
      }
    } catch {
      // Could not capture remote audio stream
    }

    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
      });
      await startTranscription(micStream, remoteStream, peerName);
    } catch {
      // Could not start transcription
    }

    call.onEnd(() => {
      const durationSeconds = callStartTimeRef.current
        ? Math.floor((Date.now() - callStartTimeRef.current.getTime()) / 1000)
        : 0;

      stopDurationTimer();
      stopTranscription();
      
      // End coach session
      if (selectedPlaybook) {
        salesCoach.endCoachSession();
      }

      setCallStatus('ended');
      setShowActiveCallModal(false);

      const finals = getFinalTranscriptions();

      if (callHistoryIdRef.current) {
        const mapped = finals.map(t => ({
          id: t.id, text: t.text, speaker: t.speaker, speakerType: t.speakerType,
          confidence: t.confidence, timestamp: t.timestamp, is_final: t.is_final,
        }));
        supabase.from('call_history').update({
          status: 'ENDED',
          duration_seconds: durationSeconds,
          ended_at: new Date().toISOString(),
          transcriptions: mapped as unknown as any,
        }).eq('id', callHistoryIdRef.current).then(() => {});
      }

      setCallEndedResult({
        callId: callHistoryIdRef.current || '',
        duration: durationSeconds,
        direction,
        peerPhone,
        peerName,
        leadId,
        transcriptions: finals,
        coachSessionId: salesCoach.sessionId,
      });
      setShowCallEndedModal(true);

      activeCallObjRef.current = null;
      callStartTimeRef.current = null;
      isMutedRef.current = false;
      setSelectedPlaybook(null);
    });

    call.onError?.(() => {
      toast.error('Erro na chamada');
      stopDurationTimer();
      stopTranscription();
      setCallStatus('error');
      setShowActiveCallModal(false);
      activeCallObjRef.current = null;
    });

    call.onPeerMute?.(() => {});
    call.onPeerUnmute?.(() => {});
  }, [startDurationTimer, stopDurationTimer, startTranscription, stopTranscription, getFinalTranscriptions, selectedPlaybook, salesCoach]);

  // Actual call start (after playbook selection)
  const startCallInternal = useCallback(async (phoneNumber: string, leadId?: string) => {
    if (!wavoipRef.current) {
      toast.error('Dispositivo WaVoIP não conectado');
      return;
    }
    if (callStatus !== 'idle') {
      toast.error('Já existe uma chamada em andamento');
      return;
    }

    const digits = cleanPhone(phoneNumber);
    const e164 = toE164BR(digits);
    if (!e164) {
      toast.error('Número de telefone inválido');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
    } catch {
      toast.error('Permissão de microfone negada');
      return;
    }

    setCallStatus('connecting');
    setShowActiveCallModal(true);

    let peerName: string | undefined;
    if (leadId) {
      const { data: lead } = await supabase.from('leads').select('name').eq('id', leadId).single();
      if (lead?.name) peerName = lead.name;
    }

    setActiveCall({
      id: '',
      direction: 'OUTGOING',
      status: 'connecting',
      peerPhone: e164,
      peerName,
      startedAt: new Date(),
      duration: 0,
      isMuted: false,
      leadId,
    });

    try {
      const { data: callRecord } = await supabase.from('call_history').insert({
        profile_id: profileIdRef.current,
        direction: 'OUTGOING',
        status: 'CALLING',
        peer_phone: e164,
        peer_name: peerName,
        lead_id: leadId,
      }).select('id').single();

      if (callRecord) callHistoryIdRef.current = callRecord.id;

      const { call, err } = await wavoipRef.current.startCall({ to: e164 });

      if (err) throw new Error(err.message || 'Erro ao iniciar chamada');
      if (!call) throw new Error('Chamada não foi criada');

      setCallStatus('ringing');
      toast.info('Chamando...', { duration: 2000 });

      call.onPeerAccept((activeCallObj: any) => {
        toast.success('Chamada conectada!');
        setupActiveCall(activeCallObj, 'OUTGOING', e164, peerName, leadId);
      });

      call.onPeerReject(() => {
        setCallStatus('rejected');
        toast.error('Chamada rejeitada');
        setShowActiveCallModal(false);
        if (callHistoryIdRef.current) {
          supabase.from('call_history').update({ status: 'REJECTED' }).eq('id', callHistoryIdRef.current).then(() => {});
        }
        setTimeout(() => { setCallStatus('idle'); setActiveCall(null); }, 2000);
      });

      call.onUnanswered(() => {
        setCallStatus('unanswered');
        toast.warning('Chamada não atendida');
        setShowActiveCallModal(false);
        if (callHistoryIdRef.current) {
          supabase.from('call_history').update({ status: 'NOT_ANSWERED' }).eq('id', callHistoryIdRef.current).then(() => {});
        }
        setTimeout(() => { setCallStatus('idle'); setActiveCall(null); }, 2000);
      });

      call.onEnd(() => {
        setCallStatus(prev => {
          if (prev === 'connecting' || prev === 'ringing') {
            setShowActiveCallModal(false);
            setTimeout(() => { setCallStatus('idle'); setActiveCall(null); }, 2000);
            return 'ended';
          }
          return prev;
        });
      });

    } catch (err: any) {
      setCallStatus('error');
      toast.error(err?.message || 'Erro ao iniciar chamada');
      setShowActiveCallModal(false);
      if (callHistoryIdRef.current) {
        supabase.from('call_history').update({ status: 'FAILED' }).eq('id', callHistoryIdRef.current).then(() => {});
      }
      setTimeout(() => { setCallStatus('idle'); setActiveCall(null); }, 2000);
    }
  }, [callStatus, setupActiveCall]);

  // Initiate call — now shows playbook selector first if playbooks exist
  const initiateCall = useCallback(async (phoneNumber: string, leadId?: string) => {
    if (activePlaybooks.length > 0) {
      setPendingCallArgs({ phoneNumber, leadId });
      setShowPlaybookSelect(true);
    } else {
      await startCallInternal(phoneNumber, leadId);
    }
  }, [activePlaybooks, startCallInternal]);

  const confirmCallWithPlaybook = useCallback((playbook: SalesPlaybook | null) => {
    setSelectedPlaybook(playbook);
    setShowPlaybookSelect(false);
    if (pendingCallArgs) {
      startCallInternal(pendingCallArgs.phoneNumber, pendingCallArgs.leadId);
      setPendingCallArgs(null);
    }
  }, [pendingCallArgs, startCallInternal]);

  const cancelPlaybookSelect = useCallback(() => {
    setShowPlaybookSelect(false);
    setPendingCallArgs(null);
  }, []);

  // Answer incoming call
  const answerCall = useCallback(async () => {
    if (!incomingOffer) return;
    try {
      setShowIncomingModal(false);
      const result = await incomingOffer.accept();
      if (result?.call || result) {
        const callObj = result?.call || result;
        setupActiveCall(callObj, 'INCOMING', incomingOffer.peerPhone, incomingOffer.peerName);
      }
    } catch {
      toast.error('Erro ao atender');
    }
  }, [incomingOffer, setupActiveCall]);

  // Reject incoming call
  const rejectCall = useCallback(async () => {
    if (!incomingOffer) return;
    try {
      await incomingOffer.reject();
      setShowIncomingModal(false);
      setIncomingOffer(null);
      if (callHistoryIdRef.current) {
        supabase.from('call_history').update({ status: 'REJECTED' }).eq('id', callHistoryIdRef.current).then(() => {});
      }
    } catch {
      // Reject failed silently
    }
  }, [incomingOffer]);

  // End call
  const endCall = useCallback(async () => {
    try {
      if (activeCallObjRef.current?.end) {
        await activeCallObjRef.current.end();
      }
    } catch {
      // End call failed silently
    }
    stopDurationTimer();
    setCallStatus('idle');
    setActiveCall(null);
    setShowActiveCallModal(false);
    activeCallObjRef.current = null;
  }, [stopDurationTimer]);

  // Toggle mute
  const toggleMute = useCallback(async () => {
    if (!activeCallObjRef.current) return;
    try {
      if (isMutedRef.current) {
        await activeCallObjRef.current.unmute?.();
        isMutedRef.current = false;
      } else {
        await activeCallObjRef.current.mute?.();
        isMutedRef.current = true;
      }
      setActiveCall(prev => prev ? { ...prev, isMuted: isMutedRef.current } : null);
    } catch {
      // Mute toggle failed silently
    }
  }, []);

  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    };
  }, []);

  return (
    <CallContext.Provider value={{
      callStatus,
      activeCall,
      callEndedResult,
      incomingOffer,
      transcriptions: sttTranscriptions,
      isDeviceConnected,
      deviceLoading,
      initiateCall,
      answerCall,
      rejectCall,
      endCall,
      toggleMute,
      showIncomingModal,
      showActiveCallModal,
      showCallEndedModal,
      setShowIncomingModal,
      setShowActiveCallModal,
      setShowCallEndedModal,
      selectedPlaybook,
      setSelectedPlaybook,
      showPlaybookSelect,
      setShowPlaybookSelect,
      pendingCallArgs,
      confirmCallWithPlaybook,
      cancelPlaybookSelect,
      salesCoach,
      activePlaybooks,
    }}>
      {children}
    </CallContext.Provider>
  );
}
