import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SellersList } from "@/components/sellers/SellersList";
import { WhatsAppSetup } from "@/components/whatsapp/WhatsAppSetup";
import { Users, Smartphone } from "lucide-react";

export default function SellersPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Equipa de Vendas</h1>
        <p className="text-muted-foreground">
          Faça a gestão da sua equipa e configure o WhatsApp
        </p>
      </div>

      <Tabs defaultValue="team" className="w-full">
        <TabsList>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Equipa
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Meu WhatsApp
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="team" className="mt-6">
          <SellersList />
        </TabsContent>
        
        <TabsContent value="whatsapp" className="mt-6">
          <WhatsAppSetup />
        </TabsContent>
      </Tabs>
    </div>
  );
}
