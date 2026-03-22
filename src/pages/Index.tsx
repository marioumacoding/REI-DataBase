import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Sidebar, { Filters } from "@/components/Sidebar";
import DataTable from "@/components/DataTable";
import Charts, { ChartFilter } from "@/components/Charts";
import DetailPanel from "@/components/DetailPanel";
import UploadSections from "@/components/UploadSections";
import { useProperties } from "@/hooks/useProperties";
import { Property } from "@/lib/types";
import { Loader2 } from "lucide-react";

const defaultFilters: Filters = {
  name: "",
  client: "",
  phone: "",
  address: "",
  state: "All",
  phoneStatus: "All",
  dateFrom: undefined,
  dateTo: undefined,
  showLastSeen: false,
  showWrongFlag: false,
  showMailing: false,
  showCreated: false,
  showExtraPhones: false,
  showExtraEmails: false,
};

const Index = () => {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [chartFilter, setChartFilter] = useState<ChartFilter | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const { data, isLoading } = useProperties({
    page,
    pageSize,
    filters: {
      first_name: filters.name,
      last_name: filters.name,
      client_name: filters.client,
      address: filters.address,
      state: filters.state,
      phone_1: filters.phone,
    },
  });
  const properties = data?.data ?? [];
  const total = data?.total ?? 0;
  const queryClient = useQueryClient();

  const chartFilteredData = useMemo(() => {
    let result = [...properties];
    if (filters.name) {
      const q = filters.name.toLowerCase();
      result = result.filter((r) => r.first_name?.toLowerCase().includes(q) || r.last_name?.toLowerCase().includes(q));
    }
    if (filters.client) {
      const q = filters.client.toLowerCase();
      result = result.filter((r) => r.client_name?.toLowerCase().includes(q));
    }
    if (filters.phone) {
      const q = filters.phone;
      result = result.filter((r) => r.phone_1?.includes(q) || r.phone_2?.includes(q) || r.phone_3?.includes(q));
    }
    if (filters.address) {
      const q = filters.address.toLowerCase();
      result = result.filter((r) => r.address?.toLowerCase().includes(q));
    }
    if (filters.state !== "All") result = result.filter((r) => r.state === filters.state);
    if (filters.phoneStatus === "Has Phone") result = result.filter((r) => r.phone_1);
    if (filters.phoneStatus === "No Phone") result = result.filter((r) => !r.phone_1);
    if (filters.phoneStatus === "Has Wrong Number") result = result.filter((r) => r.wrong_1 === true);
    if (filters.phoneStatus === "No Wrong Numbers") result = result.filter((r) => r.wrong_1 !== true);
    if (filters.dateFrom) {
      result = result.filter((r) => r.created_at && new Date(r.created_at) >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((r) => r.created_at && new Date(r.created_at) <= to);
    }
    if (chartFilter) {
      if (chartFilter.type === "state") result = result.filter((r) => r.state === chartFilter.value);
      if (chartFilter.type === "client") result = result.filter((r) => r.client_name === chartFilter.value);
      if (chartFilter.type === "phone") {
        if (chartFilter.value === "Valid Phones") result = result.filter((r) => r.phone_1 && !r.wrong_1 && !r.wrong_2 && !r.wrong_3);
        if (chartFilter.value === "No Phone") result = result.filter((r) => !r.phone_1);
        if (chartFilter.value === "Wrong Numbers") result = result.filter((r) => r.wrong_1 || r.wrong_2 || r.wrong_3);
      }
    }
    return result;
  }, [properties, filters, chartFilter]);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar filters={filters} onFiltersChange={setFilters} onRefresh={() => queryClient.invalidateQueries()} />

      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-card/50 backdrop-blur-sm shrink-0">
          <div>
            <h1 className="text-base font-bold text-foreground tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Properties
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <UploadSections />
            <span className="text-[10px] text-muted-foreground px-2 py-1 rounded-md bg-muted/50">
              {isLoading ? "Loading..." : `${properties.length} records`}
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : (
            <>
              <Charts
                data={properties}
                filteredData={chartFilteredData}
                chartFilter={chartFilter}
                onChartFilter={setChartFilter}
              />
              <DataTable
                data={properties}
                filters={filters}
                chartFilter={chartFilter}
                onSelectRow={setSelectedProperty}
                selectedId={selectedProperty?.id}
              />
              <div className="flex items-center justify-center gap-4 mt-4">
                <button
                  className="px-3 py-1 rounded bg-muted text-xs"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Prev
                </button>
                <span className="text-xs">Page {page + 1} of {Math.max(1, Math.ceil(total / pageSize))}</span>
                <button
                  className="px-3 py-1 rounded bg-muted text-xs"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={properties.length < pageSize}
                >
                  Next
                </button>
                <select
                  className="px-3 py-1 rounded bg-muted text-xs"
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
                >
                  {[25, 50, 100, 200].map((n) => (
                    <option key={n} value={n}>{n} per page</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      </main>

      {selectedProperty && (
        <div className="fixed inset-0 z-40 bg-background/50 backdrop-blur-sm" onClick={() => setSelectedProperty(null)} />
      )}
      <DetailPanel property={selectedProperty} onClose={() => setSelectedProperty(null)} />
    </div>
  );
};

export default Index;
