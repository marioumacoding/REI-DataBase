import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Property } from "@/lib/types";

export interface UsePropertiesOptions {
  page: number;
  pageSize: number;
  filters?: Partial<Pick<Property, "first_name" | "last_name" | "client_name" | "address" | "state" | "phone_1">>;
}

export const useProperties = ({ page, pageSize, filters }: UsePropertiesOptions) => {
  return useQuery({
    queryKey: ["properties", page, pageSize, filters],
    queryFn: async (): Promise<{ data: Property[]; total: number }> => {
      let query = supabase.from("properties_view" as any).select("*", { count: "exact" });
      // Apply filters server-side if provided
      if (filters) {
        if (filters.first_name) query = query.ilike("first_name", `%${filters.first_name}%`);
        if (filters.last_name) query = query.ilike("last_name", `%${filters.last_name}%`);
        if (filters.client_name) query = query.ilike("client_name", `%${filters.client_name}%`);
        if (filters.address) query = query.ilike("address", `%${filters.address}%`);
        if (filters.state && filters.state !== "All") query = query.eq("state", filters.state);
        if (filters.phone_1) query = query.ilike("phone_1", `%${filters.phone_1}%`);
      }
      const from = page * pageSize;
      const to = from + pageSize - 1;
      query = query.order("id", { ascending: true }).range(from, to);
      const { data, error, count } = await query;
      if (error) throw error;
      return {
        data: (data ?? []).map((row: any) => ({
          ...row,
          id: Number(row.id),
          created_at: row.created_at ?? "",
        })),
        total: count ?? 0,
      };
    },
    placeholderData: () => ({ data: [], total: 0 }),
  });
};
