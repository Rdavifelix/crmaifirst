import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WavoipSettings } from "@/components/settings/WavoipSettings";
import { PlaybookManager } from "@/components/settings/PlaybookManager";
import { WhatsAppSetup } from "@/components/whatsapp/WhatsAppSetup";
import { GeneralSettings } from "@/components/settings/GeneralSettings";
import { MarketingSettings } from "@/components/marketing/MarketingSettings";
import { IntegrationSettings } from "@/components/settings/IntegrationSettings";
import { AIAgentSettings } from "@/components/settings/AIAgentSettings";
import { PipelineSettings } from "@/components/settings/PipelineSettings";
import { Phone, Settings, BookOpen, MessageCircle, Megaphone, KeyRound, Bot, GitBranch } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Definições</h1>
        <p className="text-muted-foreground">
          Faça a gestão das definições do sistema
        </p>
      </div>

      <Tabs defaultValue="wavoip" className="w-full">
        <TabsList>
          <TabsTrigger value="wavoip" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            WaVoIP (Chamadas)
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="playbooks" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Playbooks
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="marketing" className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            Marketing
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Funil
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            Integrações
          </TabsTrigger>
          <TabsTrigger value="ai-agent" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Agente IA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="wavoip" className="mt-6">
          <WavoipSettings />
        </TabsContent>

        <TabsContent value="whatsapp" className="mt-6">
          <WhatsAppSetup />
        </TabsContent>

        <TabsContent value="playbooks" className="mt-6">
          <PlaybookManager />
        </TabsContent>

        <TabsContent value="general" className="mt-6">
          <GeneralSettings />
        </TabsContent>

        <TabsContent value="marketing" className="mt-6">
          <MarketingSettings />
        </TabsContent>

        <TabsContent value="pipeline" className="mt-6">
          <PipelineSettings />
        </TabsContent>

        <TabsContent value="integrations" className="mt-6">
          <IntegrationSettings />
        </TabsContent>

        <TabsContent value="ai-agent" className="mt-6">
          <AIAgentSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
