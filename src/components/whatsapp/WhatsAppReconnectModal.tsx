import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useWhatsAppInstance, useGetQRCode, useCheckStatus, useCreateInstance } from '@/hooks/useWhatsAppInstance';
import { Loader2, QrCode, RefreshCw, CheckCircle2, AlertTriangle, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WhatsAppReconnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WhatsAppReconnectModal({ open, onOpenChange }: WhatsAppReconnectModalProps) {
  const { data: instance, isLoading: instanceLoading, refetch } = useWhatsAppInstance();
  const { mutate: getQRCode, isPending: qrLoading } = useGetQRCode();
  const { mutate: checkStatus, isPending: statusLoading } = useCheckStatus();
  const { mutate: createInstance, isPending: createLoading } = useCreateInstance();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pollInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Polling enquanto conectando
  useEffect(() => {
    if (open && instance?.status === 'connecting') {
      const interval = setInterval(() => {
        checkStatus();
        refetch();
      }, 3000);
      setPollingInterval(interval);
      return () => clearInterval(interval);
    } else if (pollInterval) {
      clearInterval(pollInterval);
      setPollingInterval(null);
    }
  }, [open, instance?.status]);

  // Fecha modal quando conectar
  useEffect(() => {
    if (instance?.status === 'connected' && open) {
      setTimeout(() => onOpenChange(false), 1500);
    }
  }, [instance?.status, open]);

  // Atualiza QR code do instance
  useEffect(() => {
    if (instance?.qr_code_base64) {
      setQrCode(instance.qr_code_base64);
    }
  }, [instance?.qr_code_base64]);

  const handleGetQRCode = () => {
    getQRCode(undefined, {
      onSuccess: (data) => {
        if (data.qrcode) {
          setQrCode(data.qrcode);
        }
      },
    });
  };

  const handleCreateInstance = () => {
    createInstance(undefined, {
      onSuccess: () => {
        refetch();
      },
    });
  };

  const getStatusBadge = () => {
    switch (instance?.status) {
      case 'connected':
        return (
          <Badge className="bg-green-500 gap-1">
            <CheckCircle2 className="h-3 w-3" /> Conectado
          </Badge>
        );
      case 'connecting':
        return (
          <Badge className="bg-yellow-500 gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Conectando
          </Badge>
        );
      case 'banned':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" /> Banido
          </Badge>
        );
      default:
        return (
          <Badge variant="destructive" className="gap-1 animate-pulse">
            <AlertTriangle className="h-3 w-3" /> Desconectado
          </Badge>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Reconectar WhatsApp
          </DialogTitle>
          <DialogDescription>
            Escaneie o QR Code com seu WhatsApp para reconectar
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            {getStatusBadge()}
          </div>

          {/* Loading State */}
          {instanceLoading && (
            <Skeleton className="w-64 h-64 rounded-lg" />
          )}

          {/* Connected State */}
          {instance?.status === 'connected' && (
            <div className="flex flex-col items-center gap-4 p-8 bg-green-500/10 rounded-lg border border-green-500/20">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <p className="text-lg font-medium text-green-600">WhatsApp Conectado!</p>
              {instance.phone_number && (
                <p className="text-sm text-muted-foreground">{instance.phone_number}</p>
              )}
            </div>
          )}

          {/* No Instance - Create */}
          {!instanceLoading && !instance?.instance_id && (
            <div className="flex flex-col items-center gap-4 p-8">
              <Smartphone className="h-16 w-16 text-muted-foreground" />
              <p className="text-center text-muted-foreground">
                Nenhuma instância configurada
              </p>
              <Button onClick={handleCreateInstance} disabled={createLoading}>
                {createLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar Instância'
                )}
              </Button>
            </div>
          )}

          {/* QR Code Display */}
          {!instanceLoading && instance?.instance_id && instance.status !== 'connected' && (
            <>
              {qrCode ? (
                <div className="relative">
                  <div className="p-4 bg-white rounded-lg shadow-lg">
                    <img
                      src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                      alt="QR Code WhatsApp"
                      className="w-56 h-56"
                    />
                  </div>
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    Abra o WhatsApp {'>'} Aparelhos conectados {'>'} Conectar
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 p-8 border-2 border-dashed rounded-lg">
                  <QrCode className="h-16 w-16 text-muted-foreground" />
                  <p className="text-center text-muted-foreground">
                    Clique para gerar o QR Code
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleGetQRCode}
                  disabled={qrLoading}
                  variant={qrCode ? 'outline' : 'default'}
                >
                  {qrLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <QrCode className="h-4 w-4 mr-2" />
                      {qrCode ? 'Novo QR Code' : 'Gerar QR Code'}
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => checkStatus()}
                  disabled={statusLoading}
                >
                  {statusLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
