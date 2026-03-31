import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Link,
  Shield,
  RefreshCw,
  Check,
  X,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import {
  useMarketingAccount,
  useSaveMarketingAccount,
  useSyncCampaigns,
} from "@/hooks/useMarketing";

export function MarketingSettings() {
  const { data: account, isLoading: isLoadingAccount } = useMarketingAccount();
  const saveAccount = useSaveMarketingAccount();
  const syncCampaigns = useSyncCampaigns();

  const [showToken, setShowToken] = useState(false);
  const [form, setForm] = useState({
    account_id: "",
    access_token: "",
    page_id: "",
    page_name: "",
    pixel_id: "",
  });

  // Populate form when account is loaded
  useEffect(() => {
    if (account) {
      setForm({
        account_id: account.account_id || "",
        access_token: account.access_token || "",
        page_id: account.page_id || "",
        page_name: account.page_name || "",
        pixel_id: account.pixel_id || "",
      });
    }
  }, [account]);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!form.account_id || !form.access_token) return;

    saveAccount.mutate({
      account_id: form.account_id,
      access_token: form.access_token,
      page_id: form.page_id || null,
      page_name: form.page_name || null,
      pixel_id: form.pixel_id || null,
      status: "active",
    });
  };

  const handleSync = () => {
    if (account?.account_id) {
      syncCampaigns.mutate(account.account_id);
    }
  };

  const formatLastSync = (dateStr: string | null) => {
    if (!dateStr) return "Nunca sincronizado";
    const date = new Date(dateStr);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isFormValid = form.account_id.trim() !== "" && form.access_token.trim() !== "";

  return (
    <div className="space-y-6">
      {/* Current Account Status */}
      {isLoadingAccount ? (
        <Card>
          <CardContent className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : account ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Status da Conta
            </CardTitle>
            <CardDescription>
              Informacoes da conta Meta Ads conectada
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {account.status === "active" ? (
                  <Badge className="bg-green-500 hover:bg-green-600">
                    <Check className="h-3 w-3 mr-1" />
                    Conectado
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <X className="h-3 w-3 mr-1" />
                    Expirado
                  </Badge>
                )}
                <div>
                  <p className="text-sm font-medium">
                    {account.account_name || `Conta ${account.account_id}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ultima sincronizacao: {formatLastSync(account.last_synced_at)}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={syncCampaigns.isPending}
              >
                {syncCampaigns.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Sincronizar agora
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Connection Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Conexao Meta Ads
          </CardTitle>
          <CardDescription>
            Conecte sua conta Meta Ads para gerenciar campanhas, conjuntos de
            anuncios e criativos diretamente pelo CRM.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Account ID */}
          <div className="space-y-1.5">
            <Label htmlFor="meta-account-id">Account ID</Label>
            <Input
              id="meta-account-id"
              placeholder="Ex: act_3104134859737272"
              value={form.account_id}
              onChange={(e) => handleChange("account_id", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              ID da conta de anuncios do Meta (comeca com act_)
            </p>
          </div>

          {/* Access Token */}
          <div className="space-y-1.5">
            <Label htmlFor="meta-access-token">Access Token</Label>
            <div className="relative">
              <Input
                id="meta-access-token"
                type={showToken ? "text" : "password"}
                placeholder="Cole seu token de acesso aqui"
                value={form.access_token}
                onChange={(e) => handleChange("access_token", e.target.value)}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Token de acesso da API do Meta. Gere em developers.facebook.com
            </p>
          </div>

          {/* Page ID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="meta-page-id">Page ID (opcional)</Label>
              <Input
                id="meta-page-id"
                placeholder="Ex: 102720472685368"
                value={form.page_id}
                onChange={(e) => handleChange("page_id", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                ID da pagina do Facebook usada nos anuncios
              </p>
            </div>

            {/* Page Name */}
            <div className="space-y-1.5">
              <Label htmlFor="meta-page-name">Nome da Pagina (opcional)</Label>
              <Input
                id="meta-page-name"
                placeholder="Ex: frankcosta"
                value={form.page_name}
                onChange={(e) => handleChange("page_name", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Nome de exibicao da pagina
              </p>
            </div>
          </div>

          {/* Pixel ID */}
          <div className="space-y-1.5">
            <Label htmlFor="meta-pixel-id">Pixel ID (opcional)</Label>
            <Input
              id="meta-pixel-id"
              placeholder="Ex: 123456789012345"
              value={form.pixel_id}
              onChange={(e) => handleChange("pixel_id", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              ID do pixel do Meta para rastreamento de conversoes
            </p>
          </div>

          {/* Save Button */}
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={!isFormValid || saveAccount.isPending}
          >
            {saveAccount.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            {account ? "Atualizar Conta" : "Conectar Conta"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
