import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Property } from "@/lib/types";

const PAGE_SIZE = 1000;
const PARALLEL_PAGES = 10;

async function fetchAllPages(table: string): Promise<any[]> {
  const { count, error: countError } = await supabase
    .from(table as any)
    .select("*", { count: "exact", head: true });
  if (countError) throw countError;

  const total = count ?? 0;
  if (total === 0) return [];

  const numPages = Math.ceil(total / PAGE_SIZE);
  const all: any[] = [];

  for (let batch = 0; batch < numPages; batch += PARALLEL_PAGES) {
    const batchSize = Math.min(PARALLEL_PAGES, numPages - batch);
    const results = await Promise.all(
      Array.from({ length: batchSize }, (_, i) => {
        const from = (batch + i) * PAGE_SIZE;
        return supabase
          .from(table as any)
          .select("*")
          .order("id", { ascending: true })
          .range(from, from + PAGE_SIZE - 1);
      })
    );
    for (const { data, error } of results) {
      if (error) throw error;
      all.push(...(data ?? []));
    }
  }

  return all;
}

export const useProperties = () => {
  return useQuery({
    queryKey: ["properties"],
    queryFn: async (): Promise<Property[]> => {
      const all = await fetchAllPages("properties_view");
      console.log("[useProperties] total rows fetched:", all.length);
      return all.map((row: any) => ({
        ...row,
        id: Number(row.id),
        created_at: row.created_at ?? "",
      }));
    },
  });
};
