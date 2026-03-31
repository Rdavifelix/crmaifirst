import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  LeadRow, MetaAdveronixRow, LeadsGhlRow, GhlLeadsTabRow,
  parseLeadRows, parseMetaRows, parseGhlRows, parseGhlLeadsTab,
} from "@/config/sheets";

const POLL_INTERVAL = 30 * 1000;

export interface SheetsData {
  leads: LeadRow[];
  metaAdveronix: MetaAdveronixRow[];
  leadsGhl: LeadsGhlRow[];
  ghlLeadsTab: GhlLeadsTabRow[];
  lastUpdated: Date | null;
  isLoading: boolean;
}

export function useGoogleSheetsData(): SheetsData {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [metaAdveronix, setMetaAdveronix] = useState<MetaAdveronixRow[]>([]);
  const [leadsGhl, setLeadsGhl] = useState<LeadsGhlRow[]>([]);
  const [ghlLeadsTab, setGhlLeadsTab] = useState<GhlLeadsTabRow[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const hasData = useRef(false);

  const fetchData = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets-data");

      if (error) {
        console.error("Edge function error:", error);
        return;
      }

      if (data?.rateLimited) {
        console.warn("Google Sheets rate limit hit — keeping existing data");
        return;
      }

      if (data?.error) {
        console.error("API error:", data.error);
        return;
      }

      const newLeads = parseLeadRows(data.leads || []);
      const newMeta = parseMetaRows(data.meta || []);
      const newGhl = parseGhlRows(data.ghl || []);
      const newGhlLeadsTab = parseGhlLeadsTab(data.ghlLeads || []);

      const allEmpty = newLeads.length === 0 && newMeta.length === 0 && newGhl.length === 0;
      if (allEmpty && hasData.current) {
        console.warn("Received all-empty response — keeping existing data");
        return;
      }

      setLeads(newLeads);
      setMetaAdveronix(newMeta);
      setLeadsGhl(newGhl);
      setGhlLeadsTab(newGhlLeadsTab);
      setLastUpdated(new Date());

      if (!hasData.current && (newLeads.length > 0 || newMeta.length > 0 || newGhl.length > 0)) {
        hasData.current = true;
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { leads, metaAdveronix, leadsGhl, ghlLeadsTab, lastUpdated, isLoading };
}
