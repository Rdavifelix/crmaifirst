import { useState, createContext, useContext, ReactNode } from "react";
import { subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay, subMonths } from "date-fns";

export type DateRange = {
  from: Date;
  to: Date;
};

export type DateRangePreset = "today" | "week" | "mtd" | "3m" | "custom";

interface DateRangeContextType {
  range: DateRange;
  preset: DateRangePreset;
  setRange: (range: DateRange) => void;
  setPreset: (preset: DateRangePreset, range?: DateRange) => void;
}

const DateRangeContext = createContext<DateRangeContextType | null>(null);

/** Returns the first Monday of the current month */
function firstMondayOfMonth(now: Date): Date {
  const first = startOfMonth(now);
  const day = first.getDay(); // 0=Sun,1=Mon,...
  const diff = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
  const d = new Date(first);
  d.setDate(first.getDate() + diff);
  return d;
}

/** Returns the last Friday of the current week (Mon–Fri) starting from given Monday */
function fridayOfWeek(monday: Date): Date {
  const d = new Date(monday);
  d.setDate(monday.getDate() + 4); // Mon+4 = Fri
  return d;
}

function rangeForPreset(p: DateRangePreset): DateRange {
  const now = new Date();
  switch (p) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "week": {
      // Monday–Friday of the current calendar week
      const mon = startOfWeek(now, { weekStartsOn: 1 });
      const fri = fridayOfWeek(mon);
      return { from: mon, to: fri };
    }
    case "mtd": {
      // From first Monday of the month to last Friday of the current week (or today)
      const mon = firstMondayOfMonth(now);
      const weekMon = startOfWeek(now, { weekStartsOn: 1 });
      const fri = fridayOfWeek(weekMon);
      // If today is before the first Monday, fallback to full month
      const from = mon > now ? startOfMonth(now) : mon;
      const to = fri > now ? now : fri;
      return { from, to };
    }
    case "3m":
      return { from: subMonths(now, 3), to: now };
    case "custom":
    default:
      return { from: startOfMonth(now), to: endOfMonth(now) };
  }
}

export function DateRangeProvider({ children }: { children: ReactNode }) {
  const [preset, setPresetState] = useState<DateRangePreset>("mtd");
  const [range, setRangeState] = useState<DateRange>(() => rangeForPreset("mtd"));

  const setRange = (range: DateRange) => {
    setRangeState(range);
    setPresetState("custom");
  };

  const setPreset = (p: DateRangePreset, customRange?: DateRange) => {
    setPresetState(p);
    if (p === "custom" && customRange) {
      setRangeState(customRange);
    } else {
      setRangeState(rangeForPreset(p));
    }
  };

  return (
    <DateRangeContext.Provider value={{ range, preset, setRange, setPreset }}>
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange() {
  const ctx = useContext(DateRangeContext);
  if (!ctx) throw new Error("useDateRange must be used within DateRangeProvider");
  return ctx;
}
