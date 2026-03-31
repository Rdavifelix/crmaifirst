import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useDateRange, DateRangePreset } from "@/hooks/useDateRange";

const presets: { label: string; value: DateRangePreset }[] = [
  { label: "Hoje",           value: "today" },
  { label: "Essa semana",    value: "week"  },
  { label: "Mês atual",      value: "mtd"   },
  { label: "Últimos 3 meses",value: "3m"    },
];

export function GlobalDateRangePicker() {
  const { range, preset, setPreset, setRange } = useDateRange();

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {presets.map((p) => (
        <Button
          key={p.value}
          variant={preset === p.value ? "default" : "outline"}
          size="sm"
          onClick={() => setPreset(p.value)}
          className="h-7 text-xs px-3"
          style={
            preset === p.value
              ? { background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }
              : { borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }
          }
        >
          {p.label}
        </Button>
      ))}

      {/* Custom calendar picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn("h-7 text-xs px-3 gap-2")}
            style={{
              borderColor: preset === "custom" ? "hsl(var(--primary))" : "hsl(var(--border))",
              color: preset === "custom" ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
            }}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            {preset === "custom" && range.from && range.to
              ? `${format(range.from, "dd/MM/yy", { locale: ptBR })} – ${format(range.to, "dd/MM/yy", { locale: ptBR })}`
              : "Calendário"}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          align="end"
          style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
        >
          <Calendar
            mode="range"
            selected={{ from: range.from, to: range.to }}
            onSelect={(r) => {
              if (r?.from && r?.to) setRange({ from: r.from, to: r.to });
              else if (r?.from) setRange({ from: r.from, to: r.from });
            }}
            numberOfMonths={2}
            locale={ptBR}
            className="pointer-events-auto p-3"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
