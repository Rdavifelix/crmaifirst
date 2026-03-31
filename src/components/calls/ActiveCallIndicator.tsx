import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Mic, MicOff } from 'lucide-react';
import { useCallContext } from '@/contexts/CallContext';

const formatDuration = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export function ActiveCallIndicator() {
  const { activeCall, callStatus, endCall, toggleMute, setShowActiveCallModal } = useCallContext();

  if (!activeCall || callStatus === 'idle' || callStatus === 'ended') return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2 rounded-full bg-primary text-primary-foreground shadow-lg">
      <Phone className="h-4 w-4 animate-pulse" />
      
      <button
        onClick={() => setShowActiveCallModal(true)}
        className="text-sm font-medium hover:underline"
      >
        {activeCall.peerName || activeCall.peerPhone}
      </button>

      {callStatus === 'connected' && (
        <span className="font-mono text-sm">{formatDuration(activeCall.duration)}</span>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full text-primary-foreground hover:bg-primary-foreground/20"
        onClick={toggleMute}
      >
        {activeCall.isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full text-primary-foreground hover:bg-destructive"
        onClick={endCall}
      >
        <PhoneOff className="h-4 w-4" />
      </Button>
    </div>
  );
}
