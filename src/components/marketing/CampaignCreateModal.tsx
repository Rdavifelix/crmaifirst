import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

import {
  CAMPAIGN_OBJECTIVES,
  OPTIMIZATION_GOALS,
  BID_STRATEGIES,
} from '@/lib/marketing-constants';
import { useCreateCampaign } from '@/hooks/useMarketing';

interface CampaignCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
}

export function CampaignCreateModal({
  open,
  onOpenChange,
  accountId,
}: CampaignCreateModalProps) {
  const createCampaign = useCreateCampaign();

  const [name, setName] = useState('');
  const [objective, setObjective] = useState(CAMPAIGN_OBJECTIVES[0].value);
  const [dailyBudget, setDailyBudget] = useState('');
  const [ageMin, setAgeMin] = useState('18');
  const [ageMax, setAgeMax] = useState('65');
  const [countries, setCountries] = useState('BR');
  const [interests, setInterests] = useState('');
  const [optimizationGoal, setOptimizationGoal] = useState(OPTIMIZATION_GOALS[0].value);
  const [bidStrategy, setBidStrategy] = useState(BID_STRATEGIES[0].value);

  const resetForm = () => {
    setName('');
    setObjective(CAMPAIGN_OBJECTIVES[0].value);
    setDailyBudget('');
    setAgeMin('18');
    setAgeMax('65');
    setCountries('BR');
    setInterests('');
    setOptimizationGoal(OPTIMIZATION_GOALS[0].value);
    setBidStrategy(BID_STRATEGIES[0].value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const budgetCents = Math.round(parseFloat(dailyBudget) * 100);

    const countriesList = countries
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);

    const interestsList = interests
      .split(',')
      .map((i) => i.trim())
      .filter(Boolean)
      .map((name) => ({ id: '', name }));

    await createCampaign.mutateAsync({
      account_id: accountId,
      name,
      objective,
      daily_budget: budgetCents,
      adsets: [
        {
          name: `${name} - Conjunto 1`,
          daily_budget: budgetCents,
          optimization_goal: optimizationGoal,
          bid_strategy: bidStrategy,
          billing_event: 'IMPRESSIONS',
          targeting: {
            age_min: parseInt(ageMin, 10),
            age_max: parseInt(ageMax, 10),
            geo_locations: { countries: countriesList },
            interests: interestsList.length > 0 ? interestsList : undefined,
          },
          ads: [],
        },
      ],
    });

    resetForm();
    onOpenChange(false);
  };

  const isValid = name.trim() && dailyBudget && parseFloat(dailyBudget) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Campanha</DialogTitle>
          <DialogDescription>
            Preencha os dados para criar uma nova campanha na Meta Ads.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="campaign-name">Nome da campanha</Label>
            <Input
              id="campaign-name"
              placeholder="Ex: Webinario IA - Fevereiro"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Objetivo */}
          <div className="space-y-2">
            <Label>Objetivo</Label>
            <Select value={objective} onValueChange={setObjective}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o objetivo" />
              </SelectTrigger>
              <SelectContent>
                {CAMPAIGN_OBJECTIVES.map((obj) => (
                  <SelectItem key={obj.value} value={obj.value}>
                    {obj.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Orcamento diario */}
          <div className="space-y-2">
            <Label htmlFor="daily-budget">Orcamento diario (R$)</Label>
            <Input
              id="daily-budget"
              type="number"
              min="1"
              step="0.01"
              placeholder="100.00"
              value={dailyBudget}
              onChange={(e) => setDailyBudget(e.target.value)}
              required
            />
          </div>

          {/* Otimizacao */}
          <div className="space-y-2">
            <Label>Meta de otimizacao</Label>
            <Select value={optimizationGoal} onValueChange={setOptimizationGoal}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {OPTIMIZATION_GOALS.map((g) => (
                  <SelectItem key={g.value} value={g.value}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Estrategia de lance */}
          <div className="space-y-2">
            <Label>Estrategia de lance</Label>
            <Select value={bidStrategy} onValueChange={setBidStrategy}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {BID_STRATEGIES.map((b) => (
                  <SelectItem key={b.value} value={b.value}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Segmentacao */}
          <div className="space-y-4 rounded-lg border border-border/60 p-4">
            <p className="text-sm font-semibold text-foreground">Segmentacao</p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="age-min">Idade minima</Label>
                <Input
                  id="age-min"
                  type="number"
                  min="13"
                  max="65"
                  value={ageMin}
                  onChange={(e) => setAgeMin(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age-max">Idade maxima</Label>
                <Input
                  id="age-max"
                  type="number"
                  min="13"
                  max="65"
                  value={ageMax}
                  onChange={(e) => setAgeMax(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="countries">Paises (codigos separados por virgula)</Label>
              <Input
                id="countries"
                placeholder="BR, PT, US"
                value={countries}
                onChange={(e) => setCountries(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="interests">Interesses (separados por virgula)</Label>
              <Input
                id="interests"
                placeholder="Empreendedorismo, Inteligencia Artificial, Marketing Digital"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!isValid || createCampaign.isPending}
            >
              {createCampaign.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Campanha'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
