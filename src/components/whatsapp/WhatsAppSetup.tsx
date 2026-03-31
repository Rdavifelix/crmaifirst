import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Smartphone, QrCode, CheckCircle2, XCircle, RefreshCw, Link2, MessageSquarePlus, Save, List, Wifi, WifiOff, User } from "lucide-react";
import { useWhatsAppInstance, useCreateInstance, useGetQRCode, useCheckStatus, useManualConnect, useListUazapiInstances, useLinkUazapiInstance, type UazapiRemoteInstance } from "@/hooks/useWhatsAppInstance";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function WhatsAppSetup() {
  const { data: instance, isLoading, refetch } = useWhatsAppInstance();
  const createInstance = useCreateInstance();
  const getQRCode = useGetQRCode();
  const checkStatus = useCheckStatus();
  const manualConnect = useManualConnect();
  const listInstances = useListUazapiInstances();
  const linkInstance = useLinkUazapiInstance();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const [manualToken, setManualToken] = useState("");
  const [remoteInstances, setRemoteInstances] = useState<UazapiRemoteInstance[] | null>(null);
  const [showInstances, setShowInstances] = useState(false);

  // Poll for status while connecting
  useEffect(() => {
    if (polling && instance?.status === 'connecting') {
      const interval = setInterval(async () => {
        try {
          const result = await checkStatus.mutateAsync();
          await refetch(); // Force refetch to update UI
          if (result.connected) {
            setPolling(false);
            setQrCode(null);
            toast.success('WhatsApp conectado com sucesso!');
          }
        } catch {
          // Status check failed silently
        }
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [polling, instance?.status, refetch]);

  const handleCreateInstance = async () => {
    try {
      await createInstance.mutateAsync();
      toast.success('Instância criada! Gerando QR Code...');
      handleGetQRCode();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar instância');
    }
  };

  const handleGetQRCode = async () => {
    try {
      const result = await getQRCode.mutateAsync();
      if (result.connected) {
        toast.success('WhatsApp já está conectado!');
      } else if (result.qrcode) {
        setQrCode(result.qrcode);
        setPolling(true);
        toast.info('Escaneie o QR Code com seu WhatsApp');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao gerar QR Code');
    }
  };

  const handleRefreshStatus = async () => {
    try {
      const result = await checkStatus.mutateAsync();
      await refetch(); // Force refetch after status check
      if (result.connected) {
        toast.success('WhatsApp conectado!');
        setQrCode(null);
        setPolling(false);
      } else {
        toast.info(`Status: ${result.status}`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao verificar status');
    }
  };

  const handleListInstances = async () => {
    try {
      const result = await listInstances.mutateAsync();
      setRemoteInstances(result);
      setShowInstances(true);
      if (result.length === 0) {
        toast.info('Nenhuma instância encontrada no UAZAPI');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao listar instâncias');
    }
  };

  const handleSelectInstance = async (inst: UazapiRemoteInstance) => {
    const instanceToken = inst.token;
    const instanceId = inst.id;
    const instanceName = inst.name || inst.id;
    if (!instanceToken || !instanceId) {
      toast.error('Esta instância não tem token disponível');
      return;
    }
    try {
      const result = await linkInstance.mutateAsync({
        instance_id: instanceId,
        instance_token: instanceToken,
        instance_name: instanceName,
      });
      if (result.connected) {
        toast.success(`Instância "${instanceName}" conectada com sucesso!`);
      } else {
        toast.info(`Instância "${instanceName}" vinculada. Status: ${result.status}`);
      }
      setShowInstances(false);
      setRemoteInstances(null);
      await refetch();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao selecionar instância');
    }
  };

  const handleManualConnect = async () => {
    try {
      const result = await manualConnect.mutateAsync({ url: manualUrl, instance_token: manualToken });
      if (result.connected) {
        toast.success('WhatsApp conectado com sucesso!');
        setManualUrl("");
        setManualToken("");
      } else {
        toast.info('Credenciais salvas. WhatsApp não está conectado neste momento.');
      }
      await refetch();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao conectar manualmente');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getStatusBadge = () => {
    switch (instance?.status) {
      case 'connected':
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Conectado</Badge>;
      case 'connecting':
        return <Badge className="bg-yellow-500"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Conectando</Badge>;
      case 'banned':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Banido</Badge>;
      default:
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" /> Desconectado</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Smartphone className="h-6 w-6" />
            WhatsApp
          </CardTitle>
          <CardDescription>
            {instance?.status === 'connected' 
              ? `Conectado: ${instance.phone_number || 'Número não disponível'}`
              : 'Configure o seu WhatsApp para enviar mensagens'
            }
          </CardDescription>
          <div className="pt-2">
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {instance?.status === 'connected' ? (
            <div className="text-center space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  O seu WhatsApp está conectado e pronto para enviar mensagens.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleRefreshStatus} disabled={checkStatus.isPending} className="flex-1">
                  {checkStatus.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Verificar Status
                </Button>
                <Button variant="outline" onClick={handleListInstances} disabled={listInstances.isPending} className="flex-1">
                  {listInstances.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <List className="h-4 w-4 mr-2" />
                  )}
                  Trocar Instância
                </Button>
              </div>
              {showInstances && remoteInstances && (
                <InstanceList
                  instances={remoteInstances}
                  onSelect={handleSelectInstance}
                  onClose={() => { setShowInstances(false); setRemoteInstances(null); }}
                  selectingInstance={linkInstance.isPending}
                />
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* List existing instances */}
              <div className="space-y-3">
                <Button
                  variant="outline"
                  onClick={handleListInstances}
                  disabled={listInstances.isPending}
                  className="w-full"
                >
                  {listInstances.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <List className="h-4 w-4 mr-2" />
                  )}
                  Listar Instâncias Existentes
                </Button>

                {showInstances && remoteInstances && (
                  <InstanceList
                    instances={remoteInstances}
                    onSelect={handleSelectInstance}
                    onClose={() => { setShowInstances(false); setRemoteInstances(null); }}
                    selectingInstance={linkInstance.isPending}
                  />
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">ou conectar manualmente</span>
                </div>
              </div>

              {/* Manual Connection Form */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Link2 className="h-4 w-4" />
                  Conectar com credenciais UAZAPI
                </div>
                <Input
                  placeholder="URL (ex: https://profuturo.uazapi.com)"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                />
                <Input
                  placeholder="Token da instância"
                  type="password"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                />
                <Button
                  onClick={handleManualConnect}
                  disabled={manualConnect.isPending || !manualUrl || !manualToken}
                  className="w-full"
                >
                  {manualConnect.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Link2 className="h-4 w-4 mr-2" />
                  )}
                  Conectar Manualmente
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">ou criar nova</span>
                </div>
              </div>

              {/* QR Code Flow */}
              {!instance?.instance_id ? (
                <div className="text-center space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Crie uma instância nova e conecte via QR Code
                    </p>
                  </div>
                  <Button variant="outline" onClick={handleCreateInstance} disabled={createInstance.isPending} className="w-full">
                    {createInstance.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Smartphone className="h-4 w-4 mr-2" />
                    )}
                    Criar Instância WhatsApp
                  </Button>
                </div>
              ) : qrCode ? (
                <div className="text-center space-y-4">
                  <div className="p-4 bg-white rounded-lg">
                    <img 
                      src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`} 
                      alt="QR Code WhatsApp" 
                      className="mx-auto max-w-full"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Abra o WhatsApp no seu telemóvel → Definições → Dispositivos conectados → Conectar dispositivo
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleGetQRCode} disabled={getQRCode.isPending} className="flex-1">
                      {getQRCode.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                    <Button variant="outline" onClick={handleRefreshStatus} disabled={checkStatus.isPending} className="flex-1">
                      Verificar Conexão
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <Button variant="outline" onClick={handleGetQRCode} disabled={getQRCode.isPending} className="w-full">
                    {getQRCode.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <QrCode className="h-4 w-4 mr-2" />
                    )}
                    Gerar QR Code
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Welcome Message Settings */}
      {instance && (
        <WelcomeMessageSettings instanceId={instance.id} />
      )}
    </div>
  );
}

function InstanceList({ instances, onSelect, onClose, selectingInstance }: {
  instances: UazapiRemoteInstance[];
  onSelect: (inst: UazapiRemoteInstance) => void;
  onClose: () => void;
  selectingInstance?: boolean;
}) {
  if (instances.length === 0) {
    return (
      <div className="space-y-2">
        <div className="p-3 bg-muted rounded-lg text-center text-sm text-muted-foreground">
          Nenhuma instância encontrada
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="w-full text-muted-foreground">
          Fechar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground text-center">
        Clique numa instância para seleccioná-la
      </p>
      {instances.map((inst, idx) => {
        const name = inst.name || inst.id || `Instância ${idx + 1}`;
        const status = inst.status || 'unknown';
        const isConnected = status === 'connected' || status === 'open';
        const phone = inst.phone || inst.owner || inst._db_phone || '';
        const profileName = inst.profileName || '';
        const isLinked = inst._db_linked;

        return (
          <div
            key={inst.id || inst.name || idx}
            className={`p-3 rounded-lg border transition-colors ${
              isLinked
                ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                : 'bg-card hover:bg-accent cursor-pointer border-border'
            }`}
            onClick={() => !isLinked && !selectingInstance && onSelect(inst)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                {isConnected ? (
                  <Wifi className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <WifiOff className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{name}</p>
                  {(phone || profileName) && (
                    <p className="text-xs text-muted-foreground truncate">
                      {profileName && <><User className="h-3 w-3 inline mr-1" />{profileName} </>}
                      {phone && `· ${phone}`}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isLinked ? (
                  <Badge className="bg-green-500 text-xs">Vinculada</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    {isConnected ? 'Conectada' : status}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        );
      })}
      <Button variant="ghost" size="sm" onClick={onClose} className="w-full text-muted-foreground">
        Fechar lista
      </Button>
    </div>
  );
}

function WelcomeMessageSettings({ instanceId }: { instanceId: string }) {
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('whatsapp_instances')
        .select('auto_welcome_enabled, welcome_message')
        .eq('id', instanceId)
        .single();
      
      if (data) {
        setEnabled((data as any).auto_welcome_enabled ?? false);
        setMessage((data as any).welcome_message ?? '');
        setLoaded(true);
      }
    };
    load();
  }, [instanceId]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('whatsapp_instances')
      .update({
        auto_welcome_enabled: enabled,
        welcome_message: message,
      } as any)
      .eq('id', instanceId);

    setSaving(false);
    if (error) {
      toast.error('Erro ao guardar definições');
    } else {
      toast.success('Mensagem de boas-vindas actualizada!');
    }
  };

  if (!loaded) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquarePlus className="h-5 w-5" />
          Mensagem Automática de Boas-Vindas
        </CardTitle>
        <CardDescription>
          Envie automaticamente uma mensagem quando um lead entra em contacto pela primeira vez
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="auto-welcome" className="flex-1">
            Activar mensagem automática
          </Label>
          <Switch
            id="auto-welcome"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>

        {enabled && (
          <div className="space-y-2">
            <Label htmlFor="welcome-msg">Mensagem</Label>
            <Textarea
              id="welcome-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Olá! 👋 Obrigado por entrar em contacto..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Esta mensagem será enviada automaticamente na primeira interacção de cada lead.
            </p>
          </div>
        )}

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Guardar
        </Button>
      </CardContent>
    </Card>
  );
}
