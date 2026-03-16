import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Stats {
  total_properties: number;
  total_phones: number;
  total_emails: number;
  total_clients: number;
  wrong_numbers: number;
}

export const useStats = () =>
  useQuery({
    queryKey: ["stats"],
    queryFn: async (): Promise<Stats> => {
      const [
        { count: total_properties },
        { count: total_phones },
        { count: total_emails },
        { data: wrongRows },
        { data: clientRows },
      ] = await Promise.all([
        supabase.from("properties_view" as any).select("*", { count: "exact", head: true }),
        supabase.from("properties_view" as any).select("*", { count: "exact", head: true }).not("phone_1", "is", null),
        supabase.from("properties_view" as any).select("*", { count: "exact", head: true }).not("email_1", "is", null),
        supabase.from("properties_view" as any).select("phone_1,phone_2,phone_3,wrong_1,wrong_2,wrong_3").or("wrong_1.eq.true,wrong_2.eq.true,wrong_3.eq.true"),
        supabase.from("properties_view" as any).select("client_name"),
      ]);

      const wrongSet = new Set<string>();
      for (const r of (wrongRows ?? []) as any[]) {
        if (r.wrong_1 && r.phone_1) wrongSet.add(r.phone_1);
        if (r.wrong_2 && r.phone_2) wrongSet.add(r.phone_2);
        if (r.wrong_3 && r.phone_3) wrongSet.add(r.phone_3);
      }
      const wrong_numbers = wrongSet.size;
      const total_clients = new Set((clientRows ?? []).map((r: any) => r.client_name).filter(Boolean)).size;
      console.log("[useStats]", { total_properties, total_phones, total_emails, wrong_numbers, total_clients });

      return {
        total_properties: total_properties ?? 0,
        total_phones: total_phones ?? 0,
        total_emails: total_emails ?? 0,
        total_clients,
        wrong_numbers,
      };
    },
    staleTime: 30_000,
  });
