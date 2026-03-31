import { cn } from '@/lib/utils';
import { Bot, User } from 'lucide-react';
import { CopilotActionCard } from './CopilotActionCard';
import type { CopilotMessage, CopilotAction } from '@/types/marketing';

interface Props {
  message: CopilotMessage;
  onConfirmAction?: (action: CopilotAction) => void;
}

function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'agora';
  if (diffMin < 60) return `${diffMin}min atras`;
  if (diffHour < 24) return `${diffHour}h atras`;
  if (diffDay < 7) return `${diffDay}d atras`;
  return new Date(timestamp).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
}

export function CopilotMessageBubble({ message, onConfirmAction }: Props) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn('flex gap-2 mb-3', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {/* Avatar */}
      <div
        className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground',
        )}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>

      {/* Content */}
      <div
        className={cn('flex flex-col max-w-[80%]', isUser ? 'items-end' : 'items-start')}
      >
        <div
          className={cn(
            'px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap',
            isUser
              ? 'bg-primary text-primary-foreground rounded-br-md'
              : 'bg-muted text-foreground rounded-bl-md',
          )}
        >
          {message.content}
        </div>

        {/* Inline action card */}
        {message.action && (
          <CopilotActionCard
            action={message.action}
            onConfirm={() => onConfirmAction?.(message.action!)}
            onCancel={() => {}}
          />
        )}

        {/* Timestamp */}
        <span className="text-[10px] text-muted-foreground mt-1 px-1">
          {formatRelativeTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}
