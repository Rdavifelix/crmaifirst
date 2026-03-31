import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useSellers, Seller } from "@/hooks/useSellers";
import { Users, Phone, MessageSquare, CheckCircle2, XCircle, Loader2 } from "lucide-react";

function SellerCard({ seller }: { seller: Seller }) {
  const getInitials = (name: string | null) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getStatusBadge = () => {
    switch (seller.whatsapp_status) {
      case 'connected':
        return <Badge className="bg-green-500 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" /> Online</Badge>;
      case 'connecting':
        return <Badge className="bg-yellow-500 text-xs"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Conectando</Badge>;
      case 'banned':
        return <Badge variant="destructive" className="text-xs"><XCircle className="h-3 w-3 mr-1" /> Banido</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs"><XCircle className="h-3 w-3 mr-1" /> Offline</Badge>;
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={seller.avatar_url || undefined} />
            <AvatarFallback>{getInitials(seller.full_name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-medium truncate">{seller.full_name || 'Sem nome'}</h3>
              {getStatusBadge()}
            </div>
            {seller.whatsapp_phone && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <Phone className="h-3 w-3" />
                {seller.whatsapp_phone}
              </p>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {seller.leads_count} leads
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SellersList() {
  const { data: sellers, isLoading, error } = useSellers();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-3 w-[150px]" />
                  <Skeleton className="h-3 w-[100px]" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
           <p className="text-destructive">Erro ao carregar comerciais</p>
        </CardContent>
      </Card>
    );
  }

  if (!sellers || sellers.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum comercial registado</p>
          <p className="text-sm text-muted-foreground mt-1">
            Adicione utilizadores com a role "seller" para vê-los aqui
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Equipa de Vendas ({sellers.length})
        </h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sellers.map((seller) => (
          <SellerCard key={seller.id} seller={seller} />
        ))}
      </div>
    </div>
  );
}
