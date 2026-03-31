import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Loader2 } from 'lucide-react';
import { useCreateLead } from '@/hooks/useLeads';
import { toast } from 'sonner';

interface NewLeadModalProps {
  open: boolean;
  onClose: () => void;
}

const LEAD_SOURCES = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'site', label: 'Site' },
  { value: 'indicacao', label: 'Indicacao' },
  { value: 'outro', label: 'Outro' },
];

export function NewLeadModal({ open, onClose }: NewLeadModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [instagram, setInstagram] = useState('');
  const [source, setSource] = useState('');
  const [dealValue, setDealValue] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createLead = useCreateLead();

  const resetForm = () => {
    setName('');
    setPhone('');
    setEmail('');
    setInstagram('');
    setSource('');
    setDealValue('');
    setNotes('');
  };

  const handleSubmit = async () => {
    if (!phone.trim()) {
      toast.error('Telefone e obrigatorio');
      return;
    }

    setIsSubmitting(true);
    try {
      await createLead.mutateAsync({
        phone: phone.trim(),
        name: name.trim() || null,
        email: email.trim() || null,
        instagram_username: instagram.trim().replace(/^@/, '') || null,
        utm_source: source || null,
        deal_value: dealValue ? parseFloat(dealValue) : null,
        notes: notes.trim() || null,
        status: 'new',
      });

      toast.success('Lead criado com sucesso!');
      resetForm();
      onClose();
    } catch (err: any) {
      toast.error('Erro ao criar lead: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { resetForm(); onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Novo Lead
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          {/* Nome */}
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nome</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nome do lead"
            />
          </div>

          {/* Telefone */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Telefone *</Label>
            <Input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+244 9XX XXX XXX"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>

          {/* Instagram */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Instagram</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
              <Input
                value={instagram}
                onChange={e => setInstagram(e.target.value)}
                placeholder="username"
                className="pl-7"
              />
            </div>
          </div>

          {/* Origem */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Origem</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar..." />
              </SelectTrigger>
              <SelectContent>
                {LEAD_SOURCES.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Valor do negocio */}
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs text-muted-foreground">Valor do negocio</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">AOA</span>
              <Input
                type="number"
                value={dealValue}
                onChange={e => setDealValue(e.target.value)}
                placeholder="0"
                className="pl-12"
              />
            </div>
          </div>

          {/* Notas */}
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs text-muted-foreground">Notas</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Observacoes sobre o lead..."
              className="min-h-[80px]"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => { resetForm(); onClose(); }}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
            Criar Lead
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
