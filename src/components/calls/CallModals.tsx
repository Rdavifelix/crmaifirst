import { ActiveCallModal } from './ActiveCallModal';
import { IncomingCallModal } from './IncomingCallModal';
import { CallEndedModal } from './CallEndedModal';
import { ActiveCallIndicator } from './ActiveCallIndicator';
import { PlaybookSelectModal } from './PlaybookSelectModal';
import { useCallContext } from '@/contexts/CallContext';

export function CallModals() {
  const { showPlaybookSelect, activePlaybooks, confirmCallWithPlaybook, cancelPlaybookSelect } = useCallContext();

  return (
    <>
      <PlaybookSelectModal
        open={showPlaybookSelect}
        playbooks={activePlaybooks}
        onSelect={confirmCallWithPlaybook}
        onCancel={cancelPlaybookSelect}
      />
      <IncomingCallModal />
      <ActiveCallModal />
      <CallEndedModal />
      <ActiveCallIndicator />
    </>
  );
}
