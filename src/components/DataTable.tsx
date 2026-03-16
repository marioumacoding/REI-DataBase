import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Database, AlertTriangle, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Property } from "@/lib/types";
import { hasNoWrongNumbers, hasWrongNumber } from "@/lib/propertyUtils";
import { Filters } from "./Sidebar";
import { ChartFilter } from "./Charts";

interface DataTableProps {
  data: Property[];
  filters: Filters;
  chartFilter?: ChartFilter | null;
  onSelectRow: (property: Property) => void;
  selectedId?: number | null;
}

const PAGE_SIZES = [25, 50, 100];

const DataTable = ({ data, filters, chartFilter, onSelectRow, selectedId }: DataTableProps) => {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const filtered = useMemo(() => {
    let result = [...data];
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
    if (filters.phoneStatus === "Has Wrong Number") result = result.filter((r) => hasWrongNumber(r));
    if (filters.phoneStatus === "No Wrong Numbers") result = result.filter((r) => hasNoWrongNumbers(r));

    // Date range filter
    if (filters.dateFrom) {
      const from = filters.dateFrom;
      result = result.filter((r) => r.created_at && new Date(r.created_at) >= from);
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
  }, [data, filters, chartFilter]);

  // Reset page when filters change
  useMemo(() => { setPage(0); }, [filters, chartFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  // Column order: ID, First Name, Last Name,
  // [Mailing Addr, Mailing City, Mailing State, Mailing Zip],
  // Property Addr, Property City, Property State, Property Zip, Client,
  // Phone 1, Type 1, [Wrong 1], [Last Seen 1],
  // [Phone 2, Type 2, Wrong 2, Last Seen 2],
  // [Phone 3, Type 3, Wrong 3, Last Seen 3],
  // Email 1, [Email 2], [Email 3],
  // [Created]
  const columns = useMemo(() => {
    const cols: { key: keyof Property; label: string }[] = [
      { key: "id", label: "ID" },
      { key: "first_name", label: "First Name" },
      { key: "last_name", label: "Last Name" },
    ];

    // Mailing address (before property address, matching original header order)
    if (filters.showMailing) {
      cols.push(
        { key: "mailing_address", label: "Mailing Address" },
        { key: "mailing_city", label: "Mailing City" },
        { key: "mailing_state", label: "Mailing State" },
        { key: "mailing_zip", label: "Mailing Zip" },
      );
    }

    // Property address
    cols.push(
      { key: "address", label: "Property Address" },
      { key: "city", label: "Property City" },
      { key: "state", label: "Property State" },
      { key: "zipcode", label: "Property Zip" },
      { key: "client_name", label: "Client" },
    );

    // Phone 1 group
    cols.push({ key: "phone_1", label: "Phone 1" }, { key: "type_1", label: "Type 1" });
    if (filters.showWrongFlag) cols.push({ key: "wrong_1", label: "Wrong 1" });
    if (filters.showLastSeen) cols.push({ key: "last_seen_1", label: "Last Seen 1" });

    // Phone 2 group
    if (filters.showExtraPhones) {
      cols.push({ key: "phone_2", label: "Phone 2" }, { key: "type_2", label: "Type 2" });
      if (filters.showWrongFlag) cols.push({ key: "wrong_2", label: "Wrong 2" });
      if (filters.showLastSeen) cols.push({ key: "last_seen_2", label: "Last Seen 2" });

      // Phone 3 group
      cols.push({ key: "phone_3", label: "Phone 3" }, { key: "type_3", label: "Type 3" });
      if (filters.showWrongFlag) cols.push({ key: "wrong_3", label: "Wrong 3" });
      if (filters.showLastSeen) cols.push({ key: "last_seen_3", label: "Last Seen 3" });
    }

    // Emails
    cols.push({ key: "email_1", label: "Email 1" });
    if (filters.showExtraEmails) {
      cols.push({ key: "email_2", label: "Email 2" }, { key: "email_3", label: "Email 3" });
    }

    // Date added
    if (filters.showCreated) cols.push({ key: "created_at", label: "Date Added" });

    return cols;
  }, [filters]);

  const exportCSV = () => {
    const header = columns.map((c) => c.label).join(",");
    const rows = filtered.map((r) => columns.map((c) => { const v = r[c.key]; return v !== undefined && v !== null ? `"${v}"` : ""; }).join(","));
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    const clients = [...new Set(filtered.map((r) => r.client_name).filter(Boolean))];
    const date = new Date().toISOString().slice(0, 10);
    const stateFilter = chartFilter?.type === "state" ? `_${chartFilter.value}` : (filters.state !== "All" ? `_${filters.state}` : "");
    const clientPart = clients.length === 1 ? `_${clients[0].replace(/\s+/g, '-')}` : (chartFilter?.type === "client" ? `_${chartFilter.value.replace(/\s+/g, '-')}` : "");
    a.download = `rei_export${clientPart}${stateFilter}_${date}.csv`;
    a.click();
  };

  const fmtPhone = (p?: string) => {
    if (!p) return "";
    return p.length === 10 ? `(${p.slice(0, 3)}) ${p.slice(3, 6)}-${p.slice(6)}` : p;
  };

  return (
    <div className="animate-fade-in">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{filtered.length.toLocaleString()}</span>
            <span className="text-sm text-muted-foreground">records</span>
          </div>
          {(filters.name || filters.client || filters.phone || filters.address || filters.state !== "All" || filters.phoneStatus !== "All" || filters.dateFrom || filters.dateTo || chartFilter) && (
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/5">
              Filtered
            </Badge>
          )}
        </div>
        <Button
          onClick={exportCSV}
          size="sm"
          className="bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border h-8 text-xs gap-1.5 rounded-lg"
        >
          <Download className="w-3.5 h-3.5" /> Export
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <div className="overflow-x-auto overflow-y-auto h-[calc(100vh-340px)]">
          <Table className="min-w-max">
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border">
                {columns.map((col, i) => (
                  <TableHead
                    key={`${col.key}-${i}`}
                    className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap px-3 py-2.5 first:pl-4"
                  >
                    {col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => onSelectRow(row)}
                  className={`border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer group ${selectedId === row.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                >
                  {columns.map((col, i) => {
                    const val = row[col.key];
                    const isPhone = col.key.startsWith("phone_");
                    const isWrong = col.key.startsWith("wrong_");

                    if (isPhone) {
                      const formatted = fmtPhone(val as string);
                      return (
                        <TableCell key={`${col.key}-${i}`} className="text-xs whitespace-nowrap px-3 py-2.5 first:pl-4 font-mono text-foreground">
                          {formatted || <span className="text-muted-foreground/40">—</span>}
                        </TableCell>
                      );
                    }

                    if (isWrong) {
                      return (
                        <TableCell key={`${col.key}-${i}`} className="text-xs whitespace-nowrap px-3 py-2.5">
                          {val === true ? (
                            <span className="inline-flex items-center gap-1 text-primary">
                              <AlertTriangle className="w-3 h-3" /> Yes
                            </span>
                          ) : val === false ? (
                            <span className="inline-flex items-center gap-1 text-success">
                              <CheckCircle className="w-3 h-3" /> No
                            </span>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </TableCell>
                      );
                    }

                    if (col.key === "id") {
                      return (
                        <TableCell key={`${col.key}-${i}`} className="text-xs whitespace-nowrap px-3 py-2.5 first:pl-4 text-muted-foreground font-mono">
                          #{String(val)}
                        </TableCell>
                      );
                    }

                    if (col.key === "client_name") {
                      return (
                        <TableCell key={`${col.key}-${i}`} className="text-xs whitespace-nowrap px-3 py-2.5">
                          <Badge variant="outline" className="text-[10px] font-normal border-border text-secondary-foreground">
                            {String(val || "")}
                          </Badge>
                        </TableCell>
                      );
                    }

                    return (
                      <TableCell key={`${col.key}-${i}`} className="text-xs whitespace-nowrap px-3 py-2.5 first:pl-4 text-foreground">
                        {val !== undefined && val !== null && val !== "" ? String(val) : <span className="text-muted-foreground/40">—</span>}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2">
                      <Database className="w-8 h-8 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">No records match your filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="border-t border-border px-4 py-2.5 flex items-center justify-between bg-muted/10">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">Rows per page</span>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(0); }}>
              <SelectTrigger className="h-7 w-16 text-xs bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {PAGE_SIZES.map((s) => (
                  <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-muted-foreground">
              {filtered.length > 0 ? `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, filtered.length)} of ` : "0 of "}{filtered.length.toLocaleString()}
            </span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:!bg-primary/5 hover:!text-primary"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:!bg-primary/5 hover:!text-primary"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataTable;
