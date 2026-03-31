import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Phone, CheckCircle2, XCircle, RefreshCw, Wifi, WifiOff, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface WavoipDevice {
  id: string;
  name: string | null;
  phone_number: string | null;
  token: string;
  status: string | null;
  is_active: boolean | null;
  created_at: string;
}

function useWavoipDevices() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["wavoip-devices"],
    queryFn: async () => {
      // Get profile id
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user!.id)
        .single();

      if (!profile) return [];

      const { data, error } = await supabase
        .from("wavoip_devices")
        .select("*")
        .eq("profile_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as WavoipDevice[];
    },
    enabled: !!user,
  });
}

export function WavoipSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: devices, isLoading } = useWavoipDevices();
  const [tokenStatus, setTokenStatus] = useState<"checking" | "ok" | "missing">("checking");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDevice, setNewDevice] = useState({ name: "", token: "", phone_number: "" });
  const [testingConnection, setTestingConnection] = useState(false);

  // Check if WAVOIP_TOKEN secret is configured
  useEffect(() => {
    async function checkToken() {
      try {
        const { data, error } = await supabase.functions.invoke("get-wavoip-token");
        if (error || !data?.token) {
          setTokenStatus("missing");
        } else {
          setTokenStatus("ok");
        }
      } catch {
        setTokenStatus("missing");
      }
    }
    checkToken();
  }, []);

  const addDevice = useMutation({
    mutationFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user!.id)
        .single();

      if (!profile) throw new Error("Perfil não encontrado");

      const { error } = await supabase.from("wavoip_devices").insert({
        profile_id: profile.id,
        name: newDevice.name || "Meu Dispositivo",
        token: newDevice.token,
        phone_number: newDevice.phone_number || null,
        status: "inactive",
        is_active: true,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wavoip-devices"] });
      setShowAddForm(false);
      setNewDevice({ name: "", token: "", phone_number: "" });
      toast.success("Dispositivo adicionado com sucesso!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao adicionar dispositivo");
    },
  });

  const toggleDevice = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("wavoip_devices")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wavoip-devices"] });
      toast.success("Dispositivo atualizado!");
    },
  });

  const deleteDevice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("wavoip_devices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wavoip-devices"] });
      toast.success("Dispositivo removido!");
    },
  });

  const testConnection = async () => {
    setTestingConnection(true);
    try {
      const { Wavoip } = await import("@wavoip/wavoip-api");
      const { data } = await supabase.functions.invoke("get-wavoip-token");
      
      if (!data?.token) {
        toast.error("Token WaVoIP não configurado");
        return;
      }

      const wavoip = new Wavoip({ tokens: [data.token] });
      const devicesList = wavoip.devices;

      if (devicesList && devicesList.length > 0) {
        const readyDevice = devicesList.find((d: any) => d.status === "open");
        if (readyDevice) {
          toast.success(`Conectado! ${devicesList.length} dispositivo(s) encontrado(s) — Status: open`);
        } else {
          const statuses = devicesList.map((d: any) => d.status).join(", ");
          toast.warning(`${devicesList.length} dispositivo(s) — Status: ${statuses}`);
        }
      } else {
        toast.warning("Nenhum dispositivo encontrado na conta WaVoIP");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao testar conexão");
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Token Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Token Global WaVoIP
          </CardTitle>
          <CardDescription>
            Token de autenticação para conectar ao serviço de chamadas WaVoIP
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {tokenStatus === "checking" && (
                <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Verificando...</Badge>
              )}
              {tokenStatus === "ok" && (
                <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Configurado</Badge>
              )}
              {tokenStatus === "missing" && (
                <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Não configurado</Badge>
              )}
              <span className="text-sm text-muted-foreground">
                {tokenStatus === "ok"
                  ? "O token está ativo e pronto para uso"
                  : tokenStatus === "missing"
                  ? "Configure o secret WAVOIP_TOKEN no backend"
                  : "Verificando configuração..."}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={testConnection}
              disabled={testingConnection || tokenStatus !== "ok"}
            >
              {testingConnection ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Testar Conexão
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Devices List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Dispositivos
              </CardTitle>
              <CardDescription>
                Faça a gestão dos seus dispositivos WaVoIP para chamadas
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
              {showAddForm ? "Cancelar" : "+ Adicionar"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Form */}
          {showAddForm && (
            <div className="p-4 border rounded-lg space-y-3 bg-muted/50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="device-name">Nome do Dispositivo</Label>
                  <Input
                    id="device-name"
                    placeholder="Ex: Meu WhatsApp"
                    value={newDevice.name}
                    onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="device-token">Token WaVoIP</Label>
                  <Input
                    id="device-token"
                    placeholder="Cole o token aqui"
                    type="password"
                    value={newDevice.token}
                    onChange={(e) => setNewDevice({ ...newDevice, token: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="device-phone">Número (opcional)</Label>
                  <Input
                    id="device-phone"
                    placeholder="5511999999999"
                    value={newDevice.phone_number}
                    onChange={(e) => setNewDevice({ ...newDevice, phone_number: e.target.value })}
                  />
                </div>
              </div>
              <Button
                onClick={() => addDevice.mutate()}
                disabled={!newDevice.token || addDevice.isPending}
                className="w-full"
              >
                {addDevice.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Salvar Dispositivo
              </Button>
            </div>
          )}

          {/* Devices */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !devices || devices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Phone className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum dispositivo registado</p>
              <p className="text-xs mt-1">Adicione um dispositivo para fazer chamadas pelo WhatsApp</p>
            </div>
          ) : (
            <div className="space-y-3">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${device.is_active ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"}`}>
                      {device.is_active ? (
                        <Wifi className="h-4 w-4 text-green-600" />
                      ) : (
                        <WifiOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{device.name || "Dispositivo"}</p>
                      <p className="text-xs text-muted-foreground">
                        {device.phone_number || "Sem número"} · Token: ****{device.token.slice(-4)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={device.is_active ? "default" : "secondary"}>
                      {device.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleDevice.mutate({ id: device.id, is_active: !device.is_active })}
                    >
                      {device.is_active ? "Desativar" : "Ativar"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteDevice.mutate(device.id)}
                    >
                      Remover
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
