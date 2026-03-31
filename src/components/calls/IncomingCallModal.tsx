import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, User } from 'lucide-react';
import { useCallContext } from '@/contexts/CallContext';

export function IncomingCallModal() {
  const { incomingOffer, showIncomingModal, answerCall, rejectCall } = useCallContext();

  if (!showIncomingModal || !incomingOffer) return null;

  return (
    <Dialog open={showIncomingModal} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <div className="flex flex-col items-center gap-6 py-4">
          {/* Animated avatar */}
          <div className="relative">
            <div className="absolute inset-0 w-20 h-20 rounded-full bg-green-500/20 animate-ping" />
            <div className="relative w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center animate-bounce">
              <User className="h-10 w-10 text-primary" />
            </div>
          </div>

          {/* Info */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Chamada recebida</p>
            <h3 className="text-lg font-semibold">
              {incomingOffer.peerName || incomingOffer.peerPhone}
            </h3>
            {incomingOffer.peerName && (
              <p className="text-sm text-muted-foreground">{incomingOffer.peerPhone}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-8">
            <Button
              variant="destructive"
              size="icon"
              className="h-16 w-16 rounded-full"
              onClick={rejectCall}
            >
              <PhoneOff className="h-7 w-7" />
            </Button>

            <Button
              size="icon"
              className="h-16 w-16 rounded-full bg-green-600 hover:bg-green-700"
              onClick={answerCall}
            >
              <Phone className="h-7 w-7" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
