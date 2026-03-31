import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Megaphone,
  Image,
  RefreshCw,
  ToggleRight,
  BarChart3,
  Upload,
  HelpCircle,
} from 'lucide-react';
import type { CopilotAction } from '@/types/marketing';

interface Props {
  action: CopilotAction;
  onConfirm: () => void;
  onCancel: () => void;
}

const ACTION_CONFIG: Record<
  CopilotAction['type'],
  { label: string; icon: React.ElementType; color: string }
> = {
  create_campaign: {
    label: 'Criar Campanha',
    icon: Megaphone,
    color: 'text-blue-500',
  },
  generate_creative: {
    label: 'Gerar Criativo',
    icon: Image,
    color: 'text-purple-500',
  },
  sync_data: {
    label: 'Sincronizar Dados',
    icon: RefreshCw,
    color: 'text-cyan-500',
  },
  update_status: {
    label: 'Atualizar Status',
    icon: ToggleRight,
    color: 'text-orange-500',
  },
  show_metrics: {
    label: 'Exibir Metricas',
    icon: BarChart3,
    color: 'text-green-500',
  },
  upload_image: {
    label: 'Upload de Imagem',
    icon: Upload,
    color: 'text-pink-500',
  },
};

const STATUS_STYLES: Record<
  CopilotAction['status'],
  { label: string; className: string }
> = {
  pending: {
    label: 'Pendente',
    className: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30',
  },
  confirmed: {
    label: 'Confirmado',
    className: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  },
  executed: {
    label: 'Executado',
    className: 'bg-green-500/15 text-green-600 border-green-500/30',
  },
  failed: {
    label: 'Falhou',
    className: 'bg-red-500/15 text-red-600 border-red-500/30',
  },
};

export function CopilotActionCard({ action, onConfirm, onCancel }: Props) {
  const config = ACTION_CONFIG[action.type] || {
    label: action.type,
    icon: HelpCircle,
    color: 'text-muted-foreground',
  };
  const statusStyle = STATUS_STYLES[action.status];
  const Icon = config.icon;
  const isPending = action.status === 'pending';

  return (
    <Card className="p-3 mt-2 border-dashed">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-7 h-7 rounded-md flex items-center justify-center bg-muted/50',
              config.color,
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium">{config.label}</span>
        </div>
        <Badge
          variant="outline"
          className={cn('text-[10px] px-2 py-0.5', statusStyle.className)}
        >
          {statusStyle.label}
        </Badge>
      </div>

      {/* Description */}
      {action.description && (
        <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
          {action.description}
        </p>
      )}

      {/* Action buttons (only for pending) */}
      {isPending && (
        <div className="flex items-center gap-2">
          <Button size="sm" className="flex-1 h-8 text-xs" onClick={onConfirm}>
            Confirmar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-8 text-xs"
            onClick={onCancel}
          >
            Cancelar
          </Button>
        </div>
      )}
    </Card>
  );
}
