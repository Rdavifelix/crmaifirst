import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TranscriptionSegment } from '@/contexts/CallContext';
import { PlaybookPhase, SalesPlaybook } from './usePlaybooks';

// ── Types ──────────────────────────────────────────────────────────
export interface CoachAlert {
  id: string;
  message: string;
  timestamp: number;
  severity: 'warning' | 'critical';
}

export interface CoachSuggestion {
  text: string;
}

export interface CoachState {
  currentPhaseIndex: number;
  checklistState: boolean[][];
  alerts: CoachAlert[];
  suggestion: CoachSuggestion | null;
  isAnalyzing: boolean;
  phaseCelebration: boolean;
  sessionId: string | null;
}

interface UseSalesCoachParams {
  playbook: SalesPlaybook | null;
  transcriptions: TranscriptionSegment[];
  callId: string;
  leadId?: string;
  leadName?: string;
  profileId?: string;
  isActive: boolean;
}

// ── Hook ───────────────────────────────────────────────────────────
export function useSalesCoach({
  playbook,
  transcriptions,
  callId,
  leadId,
  leadName,
  profileId,
  isActive,
}: UseSalesCoachParams) {
  const [state, setState] = useState<CoachState>({
    currentPhaseIndex: 0,
    checklistState: [],
    alerts: [],
    suggestion: null,
    isAnalyzing: false,
    phaseCelebration: false,
    sessionId: null,
  });

  const lastProcessedIdRef = useRef(-1);
  const pendingSegmentsRef = useRef<TranscriptionSegment[]>([]);
  const aiCallInFlightRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const alertIdCounter = useRef(0);
  const celebrationTimeout = useRef<NodeJS.Timeout>();

  // Initialize checklist state when playbook changes
  useEffect(() => {
    if (!playbook || !isActive) return;
    const initial = playbook.phases.map(p => p.checklist.map(() => false));
    setState(prev => ({ ...prev, checklistState: initial, currentPhaseIndex: 0 }));
  }, [playbook?.id, isActive]);

  // Create coach session on start
  useEffect(() => {
    if (!playbook || !isActive || !callId || sessionIdRef.current) return;
    const createSession = async () => {
      const { data } = await supabase.from('coach_sessions').insert({
        playbook_id: playbook.id,
        call_id: callId,
        lead_id: leadId || null,
        profile_id: profileId || null,
        started_at: new Date().toISOString(),
        checklist_state: playbook.phases.map(p => p.checklist.map(() => false)),
      }).select('id').single();
      if (data) {
        sessionIdRef.current = data.id;
        setState(prev => ({ ...prev, sessionId: data.id }));
      }
    };
    createSession();
  }, [playbook, isActive, callId]);

  // ── Process new segments via LLM ─────────────────────────────────
  const processWithAI = useCallback(async (segments: TranscriptionSegment[], phaseIndex: number) => {
    if (!playbook) return;
    const phase = playbook.phases[phaseIndex];
    if (!phase) return;

    aiCallInFlightRef.current = true;
    setState(prev => ({ ...prev, isAnalyzing: true }));

    try {
      const res = await supabase.functions.invoke('sales-coach-analyze', {
        body: {
          phase: {
            name: phase.name,
            checklist: phase.checklist.map(c => c.label),
            forbidden_topics: phase.forbidden_topics,
            tips: phase.tips,
          },
          checklist_state: state.checklistState[phaseIndex] || [],
          segments: segments.map(t => ({ speaker: t.speaker, text: t.text, speakerType: t.speakerType })),
          lead_context: { name: leadName, lead_id: leadId },
          playbook_context: playbook.context,
          total_phases: playbook.phases.length,
          current_phase_index: phaseIndex,
        },
      });

      if (res.error) throw res.error;
      const result = res.data;

      setState(prev => {
        const newChecklist = prev.checklistState.map(arr => [...arr]);
        const phaseChecklist = newChecklist[prev.currentPhaseIndex];
        const newAlerts = [...prev.alerts];

        // Apply checklist updates
        if (result.checklist_updates && phaseChecklist) {
          for (const upd of result.checklist_updates) {
            if (upd.index >= 0 && upd.index < phaseChecklist.length) {
              phaseChecklist[upd.index] = upd.completed;
            }
          }
        }

        // Apply alert
        if (result.alert) {
          newAlerts.push({
            id: `ai-alert-${alertIdCounter.current++}`,
            message: result.alert.message,
            timestamp: Date.now(),
            severity: result.alert.severity || 'warning',
          });
        }

        return {
          ...prev,
          checklistState: newChecklist,
          alerts: newAlerts,
          suggestion: result.suggestion ? { text: result.suggestion } : prev.suggestion,
          isAnalyzing: false,
        };
      });
    } catch {
      setState(prev => ({ ...prev, isAnalyzing: false }));
    } finally {
      aiCallInFlightRef.current = false;

      // Process any queued segments
      if (pendingSegmentsRef.current.length > 0) {
        const queued = [...pendingSegmentsRef.current];
        pendingSegmentsRef.current = [];
        processWithAI(queued, state.currentPhaseIndex);
      }
    }
  }, [playbook, state.checklistState, state.currentPhaseIndex, leadName, leadId]);

  // Watch for new final transcriptions
  useEffect(() => {
    if (!playbook || !isActive) return;

    const finals = transcriptions.filter(t => t.is_final && t.id > lastProcessedIdRef.current);
    if (finals.length === 0) return;

    const maxId = Math.max(...finals.map(t => t.id));
    lastProcessedIdRef.current = maxId;

    if (aiCallInFlightRef.current) {
      // Queue segments while AI call is in flight
      pendingSegmentsRef.current.push(...finals);
    } else {
      processWithAI(finals, state.currentPhaseIndex);
    }
  }, [transcriptions, playbook, isActive, state.currentPhaseIndex, processWithAI]);

  // Auto-dismiss alerts after 10s
  useEffect(() => {
    if (state.alerts.length === 0) return;
    const timer = setTimeout(() => {
      const cutoff = Date.now() - 10000;
      setState(prev => ({
        ...prev,
        alerts: prev.alerts.filter(a => a.timestamp > cutoff),
      }));
    }, 10000);
    return () => clearTimeout(timer);
  }, [state.alerts]);

  // Auto-advance phase when all checklist items are done
  useEffect(() => {
    if (!playbook || !isActive) return;
    const phaseChecklist = state.checklistState[state.currentPhaseIndex];
    if (!phaseChecklist || phaseChecklist.length === 0) return;

    if (phaseChecklist.every(Boolean)) {
      setState(prev => ({ ...prev, phaseCelebration: true }));
      celebrationTimeout.current = setTimeout(() => {
        setState(prev => {
          const nextIndex = prev.currentPhaseIndex + 1;
          if (nextIndex >= (playbook?.phases.length || 0)) {
            return { ...prev, phaseCelebration: false };
          }
          return { ...prev, currentPhaseIndex: nextIndex, phaseCelebration: false };
        });
      }, 2000);
    }
    return () => { if (celebrationTimeout.current) clearTimeout(celebrationTimeout.current); };
  }, [state.checklistState, state.currentPhaseIndex, playbook, isActive]);

  // ── Save session on updates ──────────────────────────────────────
  useEffect(() => {
    if (!sessionIdRef.current || !playbook) return;
    const save = async () => {
      await supabase.from('coach_sessions').update({
        current_phase_index: state.currentPhaseIndex,
        checklist_state: state.checklistState as unknown as any,
        alerts_triggered: state.alerts.length,
      }).eq('id', sessionIdRef.current!);
    };
    const debounce = setTimeout(save, 2000);
    return () => clearTimeout(debounce);
  }, [state.currentPhaseIndex, state.checklistState]);

  // ── End session ──────────────────────────────────────────────────
  const endCoachSession = useCallback(async () => {
    if (!sessionIdRef.current) return;
    const phasesCompleted = state.checklistState.filter(
      phase => phase.length > 0 && phase.every(Boolean)
    ).length;
    await supabase.from('coach_sessions').update({
      ended_at: new Date().toISOString(),
      phases_completed: phasesCompleted,
      checklist_state: state.checklistState as unknown as any,
      current_phase_index: state.currentPhaseIndex,
    }).eq('id', sessionIdRef.current);
  }, [state]);

  // ── Manual controls ──────────────────────────────────────────────
  const dismissAlert = useCallback((id: string) => {
    setState(prev => ({ ...prev, alerts: prev.alerts.filter(a => a.id !== id) }));
  }, []);

  const manualAdvancePhase = useCallback(() => {
    if (!playbook) return;
    setState(prev => {
      const next = prev.currentPhaseIndex + 1;
      if (next >= playbook.phases.length) return prev;
      return { ...prev, currentPhaseIndex: next };
    });
  }, [playbook]);

  const manualGoBackPhase = useCallback(() => {
    setState(prev => {
      if (prev.currentPhaseIndex <= 0) return prev;
      return { ...prev, currentPhaseIndex: prev.currentPhaseIndex - 1 };
    });
  }, []);

  // Computed
  const currentPhase = playbook?.phases[state.currentPhaseIndex] || null;
  const phaseChecklist = state.checklistState[state.currentPhaseIndex] || [];
  const phaseProgress = phaseChecklist.length > 0
    ? Math.round((phaseChecklist.filter(Boolean).length / phaseChecklist.length) * 100)
    : 0;
  const overallProgress = state.checklistState.length > 0
    ? Math.round(
        (state.checklistState.flat().filter(Boolean).length /
          Math.max(state.checklistState.flat().length, 1)) *
          100
      )
    : 0;

  return {
    currentPhase,
    currentPhaseIndex: state.currentPhaseIndex,
    totalPhases: playbook?.phases.length || 0,
    checklistState: state.checklistState,
    phaseChecklist,
    alerts: state.alerts,
    suggestion: state.suggestion,
    isAnalyzing: state.isAnalyzing,
    phaseCelebration: state.phaseCelebration,
    phaseProgress,
    overallProgress,
    dismissAlert,
    manualAdvancePhase,
    manualGoBackPhase,
    endCoachSession,
    sessionId: state.sessionId,
  };
}
