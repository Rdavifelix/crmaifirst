import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Brain, Mic, Phone, MessageCircle, Instagram, Video, Eye, EyeOff, Save, Trash2 } from "lucide-react";
import { useIntegrationKeys } from "@/hooks/useIntegrationKeys";

interface KeyField {
  service: string;
  key_name: string;
  label: string;
  description: string;
  placeholder: string;
  isTextarea?: boolean;
}

const INTEGRATION_SECTIONS: {
  title: string;
  description: string;
  icon: React.ReactNode;
  fields: KeyField[];
}[] = [
  {
    title: "OpenAI (IA)",
    description: "Chave de API para funcionalidades de inteligência artificial",
    icon: <Brain className="h-5 w-5" />,
    fields: [
      {
        service: "openai",
        key_name: "api_key",
        label: "API Key",
        description: "Usada em: Análise de leads, chamadas, entrevistas, marketing, dossier, Instagram, coach",
        placeholder: "sk-...",
      },
    ],
  },
  {
    title: "Anthropic (Agente IA)",
    description: "Chave de API para o Agente IA de Vendas (Claude)",
    icon: <Brain className="h-5 w-5" />,
    fields: [
      {
        service: "anthropic",
        key_name: "api_key",
        label: "API Key",
        description: "Usada pelo Agente IA de Vendas para responder leads via WhatsApp automaticamente",
        placeholder: "sk-ant-...",
      },
    ],
  },
  {
    title: "Soniox (Transcrição)",
    description: "Transcrição de áudio em tempo real",
    icon: <Mic className="h-5 w-5" />,
    fields: [
      {
        service: "soniox",
        key_name: "api_key",
        label: "API Key",
        description: "Usada para transcrição de chamadas telefónicas",
        placeholder: "soniox_...",
      },
    ],
  },
  {
    title: "WaVoIP (Telefonia)",
    description: "Token para chamadas VoIP",
    icon: <Phone className="h-5 w-5" />,
    fields: [
      {
        service: "wavoip",
        key_name: "token",
        label: "Token",
        description: "Token de autenticação WaVoIP",
        placeholder: "wv_...",
      },
    ],
  },
  {
    title: "UAZAPI (WhatsApp)",
    description: "Conexão com a API do WhatsApp",
    icon: <MessageCircle className="h-5 w-5" />,
    fields: [
      {
        service: "uazapi",
        key_name: "subdomain",
        label: "Subdomínio",
        description: "Seu subdomínio UAZAPI (ex: meudominio, sem .uazapi.com)",
        placeholder: "meudominio",
      },
      {
        service: "uazapi",
        key_name: "admin_token",
        label: "Admin Token",
        description: "Token de administrador para criar e gerenciar instâncias WhatsApp",
        placeholder: "seu-admin-token",
      },
    ],
  },
  {
    title: "RapidAPI (Instagram)",
    description: "Scraping de perfis Instagram",
    icon: <Instagram className="h-5 w-5" />,
    fields: [
      {
        service: "rapidapi",
        key_name: "api_key",
        label: "API Key",
        description: "Chave RapidAPI para enriquecimento de leads via Instagram",
        placeholder: "rapidapi_...",
      },
    ],
  },
  {
    title: "Google (Meet/Calendar)",
    description: "Integração com Google Meet para entrevistas",
    icon: <Video className="h-5 w-5" />,
    fields: [
      {
        service: "google",
        key_name: "service_account_json",
        label: "Service Account JSON",
        description: "JSON completo da service account do Google Cloud",
        placeholder: '{"type": "service_account", "project_id": "...", ...}',
        isTextarea: true,
      },
    ],
  },
];

function IntegrationField({
  field,
  currentValue,
  onSave,
  onDelete,
  isSaving,
}: {
  field: KeyField;
  currentValue: string | undefined;
  onSave: (value: string) => void;
  onDelete: () => void;
  isSaving: boolean;
}) {
  const [value, setValue] = useState(currentValue ?? "");
  const [showValue, setShowValue] = useState(false);
  const isConfigured = !!currentValue;
  const hasChanges = value !== (currentValue ?? "");

  const maskedValue = currentValue
    ? currentValue.length > 8
      ? currentValue.slice(0, 4) + "••••••••" + currentValue.slice(-4)
      : "••••••••"
    : "";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={`${field.service}-${field.key_name}`}>{field.label}</Label>
        <Badge variant={isConfigured ? "default" : "secondary"}>
          {isConfigured ? "Configurado" : "Não configurado"}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">{field.description}</p>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          {field.isTextarea ? (
            <Textarea
              id={`${field.service}-${field.key_name}`}
              value={showValue ? value : (isConfigured && !hasChanges ? maskedValue : value)}
              onChange={(e) => {
                setValue(e.target.value);
                if (!showValue) setShowValue(true);
              }}
              onFocus={() => {
                if (!showValue && isConfigured && !hasChanges) {
                  setValue(currentValue ?? "");
                  setShowValue(true);
                }
              }}
              placeholder={field.placeholder}
              rows={4}
              className="font-mono text-xs"
            />
          ) : (
            <Input
              id={`${field.service}-${field.key_name}`}
              type={showValue ? "text" : "password"}
              value={showValue ? value : (isConfigured && !hasChanges ? maskedValue : value)}
              onChange={(e) => {
                setValue(e.target.value);
                if (!showValue) setShowValue(true);
              }}
              onFocus={() => {
                if (!showValue && isConfigured && !hasChanges) {
                  setValue(currentValue ?? "");
                  setShowValue(true);
                }
              }}
              placeholder={field.placeholder}
              className="font-mono text-sm pr-10"
            />
          )}
          {!field.isTextarea && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => {
                if (!showValue && isConfigured && !hasChanges) {
                  setValue(currentValue ?? "");
                }
                setShowValue(!showValue);
              }}
            >
              {showValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          )}
        </div>
        <Button
          size="icon"
          onClick={() => onSave(value)}
          disabled={!value.trim() || isSaving || !hasChanges}
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        </Button>
        {isConfigured && (
          <Button
            size="icon"
            variant="destructive"
            onClick={onDelete}
            disabled={isSaving}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function IntegrationSettings() {
  const { keys, isLoading, upsertKey, deleteKey, getKeyValue } = useIntegrationKeys();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Chaves de Integração</h2>
        <p className="text-sm text-muted-foreground">
          Configure as chaves de API necessárias para cada serviço. As chaves são armazenadas de forma segura no banco de dados.
        </p>
      </div>

      {INTEGRATION_SECTIONS.map((section) => (
        <Card key={section.title}>
          <CardHeader>
            <div className="flex items-center gap-2">
              {section.icon}
              <div>
                <CardTitle className="text-lg">{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {section.fields.map((field) => (
              <IntegrationField
                key={`${field.service}-${field.key_name}`}
                field={field}
                currentValue={getKeyValue(field.service, field.key_name)}
                onSave={(value) =>
                  upsertKey.mutate({
                    service: field.service,
                    key_name: field.key_name,
                    key_value: value,
                    description: field.description,
                  })
                }
                onDelete={() =>
                  deleteKey.mutate({
                    service: field.service,
                    key_name: field.key_name,
                  })
                }
                isSaving={upsertKey.isPending || deleteKey.isPending}
              />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
