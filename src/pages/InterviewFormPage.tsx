import { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Upload, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { isValidAngolanPhone, formatPhoneInput, toE164AO } from '@/lib/phone-utils';

export default function InterviewFormPage() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !photoFile) {
      toast({ title: 'Por favor, envie a foto com nome e assinatura', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload photo
      const ext = photoFile.name.split('.').pop();
      const filePath = `${token}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('candidate-photos')
        .upload(filePath, photoFile);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('candidate-photos')
        .getPublicUrl(filePath);

      // Update candidate record
      const { error: updateError } = await supabase
        .from('candidates' as any)
        .update({
          name: formData.name,
          email: formData.email,
          phone: toE164AO(formData.phone) || formData.phone,
          position: formData.position || undefined,
          photo_url: urlData.publicUrl,
        })
        .eq('token', token);

      if (updateError) throw updateError;

      // Trigger AI analysis
      await supabase.functions.invoke('analyze-candidate-photo', {
        body: { token, photo_url: urlData.publicUrl },
      });

      setSubmitted(true);
    } catch (err: any) {
      console.error('Submit error:', err);
      toast({ title: 'Erro ao enviar', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4">
            <CheckCircle className="h-16 w-16 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Cadastro Enviado!</h2>
            <p className="text-muted-foreground">
              Seus dados foram recebidos com sucesso. Entraremos em contato em breve para agendar sua entrevista.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Cadastro de Entrevista</CardTitle>
          <CardDescription>
            Preencha seus dados e envie uma foto com seu nome e assinatura
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo *</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Seu nome completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="seu@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                required
                value={formData.phone}
                onChange={e => setFormData(prev => ({ ...prev, phone: formatPhoneInput(e.target.value) }))}
                placeholder="923 999 999"
                maxLength={16}
              />
              {formData.phone && !isValidAngolanPhone(formData.phone) && (
                <p className="text-xs text-destructive">Formato: 9XX XXX XXX</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Vaga Pretendida</Label>
              <Input
                id="position"
                value={formData.position}
                onChange={e => setFormData(prev => ({ ...prev, position: e.target.value }))}
                placeholder="Ex: Comercial, Analista..."
              />
            </div>

            <div className="space-y-2">
              <Label>Foto com Nome e Assinatura *</Label>
              <p className="text-xs text-muted-foreground">
                Tire uma foto ou faça upload de uma imagem mostrando seu nome escrito à mão e sua assinatura.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoChange}
              />
              {photoPreview ? (
                <div
                  className="relative rounded-lg overflow-hidden border border-border cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <img src={photoPreview} alt="Preview" className="w-full h-48 object-cover" />
                  <div className="absolute inset-0 bg-foreground/10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Camera className="h-8 w-8 text-primary-foreground" />
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-48 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  <Upload className="h-8 w-8" />
                  <span className="text-sm">Clique para tirar foto ou enviar</span>
                </button>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting || !photoFile}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Cadastro'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
