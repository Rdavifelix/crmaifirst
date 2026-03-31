import { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, User, Building2, Bell, Palette, Save, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface CompanySettings {
  id?: string;
  company_name: string;
  company_phone: string;
  company_email: string;
  company_address: string;
  company_nif: string;
  timezone: string;
  language: string;
  theme: string;
  notifications_email: boolean;
  notifications_sound: boolean;
  notifications_new_lead: boolean;
  notifications_new_message: boolean;
}

const defaultSettings: CompanySettings = {
  company_name: "",
  company_phone: "",
  company_email: "",
  company_address: "",
  company_nif: "",
  timezone: "Europe/Lisbon",
  language: "pt",
  theme: "system",
  notifications_email: true,
  notifications_sound: true,
  notifications_new_lead: true,
  notifications_new_message: true,
};

export function GeneralSettings() {
  const { user } = useAuth();
  const { setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [settings, setSettings] = useState<CompanySettings>(defaultSettings);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("user_id", user!.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        setFullName(profileData.full_name || "");
        setProfileId(profileData.id);

        // Load company settings
        const { data: settingsData } = await supabase
          .from("company_settings")
          .select("*")
          .eq("owner_id", profileData.id)
          .single();

        if (settingsData) {
          setLogoUrl(settingsData.company_logo_url || null);
          setSettings({
            id: settingsData.id,
            company_name: settingsData.company_name || "",
            company_phone: settingsData.company_phone || "",
            company_email: settingsData.company_email || "",
            company_address: settingsData.company_address || "",
            company_nif: settingsData.company_nif || "",
            timezone: settingsData.timezone || "Europe/Lisbon",
            language: settingsData.language || "pt",
            theme: settingsData.theme || "system",
            notifications_email: settingsData.notifications_email ?? true,
            notifications_sound: settingsData.notifications_sound ?? true,
            notifications_new_lead: settingsData.notifications_new_lead ?? true,
            notifications_new_message: settingsData.notifications_new_message ?? true,
          });
          // Apply saved theme
          if (settingsData.theme) setTheme(settingsData.theme);
        }
      }
    } catch {
      // Settings load failed
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profileId) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor selecione um ficheiro de imagem");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem não pode exceder 2MB");
      return;
    }

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${profileId}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("company-logos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("company-logos")
        .getPublicUrl(filePath);

      // Save URL to company_settings
      const payload = { owner_id: profileId, company_logo_url: publicUrl };
      if (settings.id) {
        await supabase.from("company_settings").update({ company_logo_url: publicUrl }).eq("id", settings.id);
      } else {
        const { data } = await supabase.from("company_settings").insert(payload).select().single();
        if (data) setSettings((s) => ({ ...s, id: data.id }));
      }

      setLogoUrl(publicUrl + "?t=" + Date.now());
      toast.success("Logótipo carregado com sucesso!");
    } catch {
      toast.error("Erro ao carregar logótipo");
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveLogo = async () => {
    if (!profileId || !settings.id) return;
    setUploadingLogo(true);
    try {
      // List and remove files in the folder
      const { data: files } = await supabase.storage.from("company-logos").list(profileId);
      if (files && files.length > 0) {
        await supabase.storage.from("company-logos").remove(files.map((f) => `${profileId}/${f.name}`));
      }
      await supabase.from("company_settings").update({ company_logo_url: null }).eq("id", settings.id);
      setLogoUrl(null);
      toast.success("Logótipo removido!");
    } catch {
      toast.error("Erro ao remover logótipo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", profile.id);
    setSavingProfile(false);
    if (error) {
      toast.error("Erro ao guardar perfil");
    } else {
      toast.success("Perfil actualizado!");
    }
  };

  const handleSaveCompany = async () => {
    if (!profileId) return;
    setSavingCompany(true);
    const payload = {
      owner_id: profileId,
      company_name: settings.company_name || null,
      company_phone: settings.company_phone || null,
      company_email: settings.company_email || null,
      company_address: settings.company_address || null,
      company_nif: settings.company_nif || null,
      timezone: settings.timezone,
      language: settings.language,
      theme: settings.theme,
    };

    let error;
    if (settings.id) {
      ({ error } = await supabase
        .from("company_settings")
        .update(payload)
        .eq("id", settings.id));
    } else {
      const { data, error: insertError } = await supabase
        .from("company_settings")
        .insert(payload)
        .select()
        .single();
      error = insertError;
      if (data) setSettings((s) => ({ ...s, id: data.id }));
    }

    setSavingCompany(false);
    if (error) {
      toast.error("Erro ao guardar dados da empresa");
    } else {
      toast.success("Dados da empresa actualizados!");
    }
  };

  const handleSaveNotifications = async () => {
    if (!profileId) return;
    setSavingNotifications(true);
    const payload = {
      owner_id: profileId,
      notifications_email: settings.notifications_email,
      notifications_sound: settings.notifications_sound,
      notifications_new_lead: settings.notifications_new_lead,
      notifications_new_message: settings.notifications_new_message,
    };

    let error;
    if (settings.id) {
      ({ error } = await supabase
        .from("company_settings")
        .update(payload)
        .eq("id", settings.id));
    } else {
      const { data, error: insertError } = await supabase
        .from("company_settings")
        .insert({ ...payload, timezone: settings.timezone, language: settings.language, theme: settings.theme })
        .select()
        .single();
      error = insertError;
      if (data) setSettings((s) => ({ ...s, id: data.id }));
    }

    setSavingNotifications(false);
    if (error) {
      toast.error("Erro ao guardar notificações");
    } else {
      toast.success("Notificações actualizadas!");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5" />
            Perfil do Utilizador
          </CardTitle>
          <CardDescription>Gerir os seus dados pessoais</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label>Nome completo</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="O seu nome"
            />
          </div>
          <Button onClick={handleSaveProfile} disabled={savingProfile} className="w-full">
            {savingProfile ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar Perfil
          </Button>
        </CardContent>
      </Card>

      {/* Company */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5" />
            Dados da Empresa
          </CardTitle>
          <CardDescription>Informações da sua empresa ou negócio</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Logo Upload */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 rounded-lg">
              <AvatarImage src={logoUrl || undefined} alt="Logo da empresa" className="object-cover" />
              <AvatarFallback className="rounded-lg bg-muted text-muted-foreground">
                <Building2 className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-2">
              <Label className="text-sm text-muted-foreground">Logótipo da empresa (máx. 2MB)</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                >
                  {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
                  Carregar
                </Button>
                {logoUrl && (
                  <Button variant="ghost" size="sm" onClick={handleRemoveLogo} disabled={uploadingLogo}>
                    <X className="h-4 w-4 mr-1" />
                    Remover
                  </Button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome da empresa</Label>
              <Input
                value={settings.company_name}
                onChange={(e) => setSettings((s) => ({ ...s, company_name: e.target.value }))}
                placeholder="Ex: Marca Digital"
              />
            </div>
            <div className="space-y-2">
              <Label>NIF</Label>
              <Input
                value={settings.company_nif}
                onChange={(e) => setSettings((s) => ({ ...s, company_nif: e.target.value }))}
                placeholder="Ex: 123456789"
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={settings.company_phone}
                onChange={(e) => setSettings((s) => ({ ...s, company_phone: e.target.value }))}
                placeholder="Ex: +351 912 345 678"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={settings.company_email}
                onChange={(e) => setSettings((s) => ({ ...s, company_email: e.target.value }))}
                placeholder="Ex: geral@empresa.pt"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Morada</Label>
            <Input
              value={settings.company_address}
              onChange={(e) => setSettings((s) => ({ ...s, company_address: e.target.value }))}
              placeholder="Ex: Rua da Empresa, 123, Lisboa"
            />
          </div>
          <Button onClick={handleSaveCompany} disabled={savingCompany} className="w-full">
            {savingCompany ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar Empresa
          </Button>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5" />
            Notificações
          </CardTitle>
          <CardDescription>Configure como pretende receber alertas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="flex-1">Notificações por email</Label>
            <Switch
              checked={settings.notifications_email}
              onCheckedChange={(v) => setSettings((s) => ({ ...s, notifications_email: v }))}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label className="flex-1">Sons de notificação</Label>
            <Switch
              checked={settings.notifications_sound}
              onCheckedChange={(v) => setSettings((s) => ({ ...s, notifications_sound: v }))}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label className="flex-1">Alerta de novo lead</Label>
            <Switch
              checked={settings.notifications_new_lead}
              onCheckedChange={(v) => setSettings((s) => ({ ...s, notifications_new_lead: v }))}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label className="flex-1">Alerta de nova mensagem</Label>
            <Switch
              checked={settings.notifications_new_message}
              onCheckedChange={(v) => setSettings((s) => ({ ...s, notifications_new_message: v }))}
            />
          </div>
          <Button onClick={handleSaveNotifications} disabled={savingNotifications} className="w-full mt-2">
            {savingNotifications ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar Notificações
          </Button>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Palette className="h-5 w-5" />
            Aparência
          </CardTitle>
          <CardDescription>Personalize a interface do sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tema</Label>
              <Select value={settings.theme} onValueChange={(v) => { setSettings((s) => ({ ...s, theme: v })); setTheme(v); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">Sistema</SelectItem>
                  <SelectItem value="light">Claro</SelectItem>
                  <SelectItem value="dark">Escuro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fuso horário</Label>
              <Select value={settings.timezone} onValueChange={(v) => setSettings((s) => ({ ...s, timezone: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Europe/Lisbon">Lisboa (WET)</SelectItem>
                  <SelectItem value="Europe/London">Londres (GMT)</SelectItem>
                  <SelectItem value="Europe/Madrid">Madrid (CET)</SelectItem>
                  <SelectItem value="America/Sao_Paulo">São Paulo (BRT)</SelectItem>
                  <SelectItem value="America/New_York">Nova Iorque (EST)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Idioma</Label>
            <Select value={settings.language} onValueChange={(v) => setSettings((s) => ({ ...s, language: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pt">Português</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSaveCompany} disabled={savingCompany} className="w-full">
            {savingCompany ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar Aparência
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
