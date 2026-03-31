import { createContext, useContext, type ReactNode } from "react";
import { useGoogleSheetsData, type SheetsData } from "@/hooks/useGoogleSheetsData";

const SheetsDataContext = createContext<SheetsData | null>(null);

export function SheetsDataProvider({ children }: { children: ReactNode }) {
  const data = useGoogleSheetsData();
  return (
    <SheetsDataContext.Provider value={data}>
      {children}
    </SheetsDataContext.Provider>
  );
}

export function useSheetsData(): SheetsData {
  const ctx = useContext(SheetsDataContext);
  if (!ctx) throw new Error("useSheetsData must be used within SheetsDataProvider");
  return ctx;
}
