import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { LogOut } from "lucide-react";
import { format } from "date-fns";
import logo from "@/assets/logo.png";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Building,
  RefreshCw,
  User,
  Phone,
  MapPin,
  SlidersHorizontal,
  Search,
  Calendar as CalendarIcon,
  AlertTriangle,
  Mail,
  PhoneCall,
  X,
  BarChart3,
  Eye,
  CalendarRange,
  Filter,
  Columns3,
  Plus,
  Trash2,
} from "lucide-react";
import { US_STATES } from "@/lib/types";
import { useStats } from "@/hooks/useStats";
import { cn } from "@/lib/utils";

export interface Filters {
  name: string;
  client: string;
  phone: string;
  address: string;
  state: string;
  phoneStatus: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  showLastSeen: boolean;
  showWrongFlag: boolean;
  showMailing: boolean;
  showCreated: boolean;
  showExtraPhones: boolean;
  showExtraEmails: boolean;
}

interface SidebarProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  onRefresh: () => void;
}

/* ─── Stat Card ─── */
const StatCard = ({ icon: Icon, label, value, accent = false }: { icon: any; label: string; value: number; accent?: boolean }) => (
  <div className={cn(
    "rounded-lg p-2.5 transition-all duration-200 group/stat cursor-default",
    accent
      ? "bg-primary/8 border border-primary/15 hover:border-primary/30"
      : "bg-muted/40 border border-border/50 hover:border-border"
  )}>
    <div className="flex items-center gap-1.5 mb-0.5">
      <Icon className={cn("w-3 h-3", accent ? "text-primary/70" : "text-muted-foreground/60")} />
      <span className="text-[10px] font-medium text-muted-foreground tracking-wide uppercase">{label}</span>
    </div>
    <span className={cn("text-base font-bold", accent ? "text-primary" : "text-foreground")}>{value.toLocaleString()}</span>
  </div>
);

/* ─── Filter Row (Airtable-style condition row) ─── */
const FilterRow = ({ icon: Icon, placeholder, value, onChange, onRemove }: {
  icon: any; placeholder: string; value: string; onChange: (v: string) => void; onRemove?: () => void;
}) => (
  <div className="flex items-center gap-1.5 group/row">
    <div className="flex items-center justify-center w-6 h-7 shrink-0">
      <Icon className="w-3.5 h-3.5 text-muted-foreground/60 group-focus-within/row:text-primary transition-colors" />
    </div>
    <div className="relative flex-1">
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 text-xs bg-transparent border-0 border-b border-border/40 rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary/50 placeholder:text-muted-foreground/40 transition-colors"
      />
    </div>
    {value && (
      <button
        onClick={() => onChange("")}
        className="flex items-center justify-center w-5 h-5 rounded-md text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-all shrink-0"
      >
        <X className="w-3 h-3" />
      </button>
    )}
  </div>
);

/* ─── Date Range Picker (single popover, two calendars) ─── */
const DateRangePicker = ({
  dateFrom,
  dateTo,
  onFromChange,
  onToChange,
}: {
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  onFromChange: (d: Date | undefined) => void;
  onToChange: (d: Date | undefined) => void;
}) => {
  const [open, setOpen] = useState(false);
  const hasRange = dateFrom || dateTo;

  const label = useMemo(() => {
    if (dateFrom && dateTo) return `${format(dateFrom, "MMM d")} – ${format(dateTo, "MMM d, yyyy")}`;
    if (dateFrom) return `From ${format(dateFrom, "MMM d, yyyy")}`;
    if (dateTo) return `Until ${format(dateTo, "MMM d, yyyy")}`;
    return "Any date";
  }, [dateFrom, dateTo]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 w-full h-7 text-xs transition-colors",
            hasRange ? "text-foreground" : "text-muted-foreground/50"
          )}
        >
          <div className="flex items-center justify-center w-6 h-7 shrink-0">
            <CalendarRange className={cn("w-3.5 h-3.5", hasRange ? "text-primary/70" : "text-muted-foreground/60")} />
          </div>
          <span className={cn(
            "flex-1 text-left border-b pb-1 transition-colors",
            hasRange ? "border-primary/30" : "border-border/40",
            "hover:border-primary/50"
          )}>
            {label}
          </span>
          {hasRange && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFromChange(undefined);
                onToChange(undefined);
              }}
              className="flex items-center justify-center w-5 h-5 rounded-md text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-all shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 bg-card border-border shadow-xl"
        align="start"
        side="right"
        sideOffset={12}
      >
        <div className="p-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Date Range</span>
            {hasRange && (
              <button
                onClick={() => {
                  onFromChange(undefined);
                  onToChange(undefined);
                }}
                className="ml-auto text-[10px] text-muted-foreground hover:text-primary transition-colors"
              >
                Reset
              </button>
            )}
          </div>
          <div className="flex gap-4">
            <div>
              <span className="text-[10px] text-muted-foreground block mb-1.5 font-medium">From</span>
              <Calendar
                mode="single"
                selected={dateFrom}
                onSelect={(d) => onFromChange(d)}
                initialFocus
                className="p-0 pointer-events-auto"
                disabled={dateTo ? (date) => date > dateTo : undefined}
              />
            </div>
            <Separator orientation="vertical" className="h-auto bg-border/50" />
            <div>
              <span className="text-[10px] text-muted-foreground block mb-1.5 font-medium">To</span>
              <Calendar
                mode="single"
                selected={dateTo}
                onSelect={(d) => onToChange(d)}
                className="p-0 pointer-events-auto"
                disabled={dateFrom ? (date) => date < dateFrom : undefined}
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

/* ─── Section Toggle ─── */
const SectionToggle = ({ icon: Icon, title, count, open, onToggle }: {
  icon: any; title: string; count?: number; open: boolean; onToggle: () => void;
}) => (
  <button
    onClick={onToggle}
    className="flex items-center gap-2 w-full py-2 group/sec"
  >
    <Icon className="w-3.5 h-3.5 text-muted-foreground/60 group-hover/sec:text-primary transition-colors" />
    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest group-hover/sec:text-foreground transition-colors">
      {title}
    </span>
    {count !== undefined && count > 0 && (
      <span className="ml-auto text-[9px] font-bold text-primary bg-primary/10 rounded-full w-4 h-4 flex items-center justify-center">
        {count}
      </span>
    )}
    <svg
      className={cn(
        "w-3 h-3 text-muted-foreground/40 transition-transform duration-200 ml-auto",
        open && "rotate-90"
      )}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  </button>
);

/* ─── Column Toggle Row ─── */
const ColumnToggle = ({ icon: Icon, label, checked, onToggle }: {
  icon: any; label: string; checked: boolean; onToggle: (v: boolean) => void;
}) => (
  <label className="flex items-center gap-2.5 py-1 px-1 rounded-md cursor-pointer hover:bg-muted/30 transition-colors group/col">
    <Checkbox
      checked={checked}
      onCheckedChange={(v) => onToggle(!!v)}
      className="border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary h-3.5 w-3.5 rounded-[3px]"
    />
    <Icon className="w-3 h-3 text-muted-foreground/50 group-hover/col:text-muted-foreground transition-colors" />
    <span className="text-[11px] text-muted-foreground group-hover/col:text-foreground transition-colors">{label}</span>
  </label>
);

/* ─── Logout Button ─── */
const LogoutButton = () => {
  const { signOut } = useAuth();
  return (
    <Button
      onClick={signOut}
      variant="ghost"
      size="sm"
      className="w-full h-7 text-[11px] text-muted-foreground/60 hover:text-destructive hover:bg-destructive/5 gap-1.5"
    >
      <LogOut className="w-3 h-3" /> Sign Out
    </Button>
  );
};

/* ═══════════════ MAIN SIDEBAR ═══════════════ */
const Sidebar = ({ filters, onFiltersChange, onRefresh }: SidebarProps) => {
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(true);

  const { data: stats } = useStats();

  const update = (key: keyof Filters, value: string | boolean | Date | undefined) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const activeFilterCount = useMemo(() =>
    [filters.name, filters.client, filters.phone, filters.address].filter(Boolean).length
    + (filters.state !== "All" ? 1 : 0)
    + (filters.phoneStatus !== "All" ? 1 : 0)
    + (filters.dateFrom ? 1 : 0)
    + (filters.dateTo ? 1 : 0),
    [filters]
  );

  const activeColumnCount = useMemo(() =>
    [filters.showLastSeen, filters.showWrongFlag, filters.showMailing, filters.showCreated, filters.showExtraPhones, filters.showExtraEmails].filter(Boolean).length,
    [filters]
  );

  const clearFilters = () => {
    onFiltersChange({
      ...filters,
      name: "", client: "", phone: "", address: "", state: "All", phoneStatus: "All", dateFrom: undefined, dateTo: undefined,
    });
  };

  const activeFilterTags = useMemo(() => {
    const tags: { label: string; key: keyof Filters; resetValue: string | undefined }[] = [];
    if (filters.name) tags.push({ label: `Name: ${filters.name}`, key: "name", resetValue: "" });
    if (filters.client) tags.push({ label: `Client: ${filters.client}`, key: "client", resetValue: "" });
    if (filters.phone) tags.push({ label: `Phone: ${filters.phone}`, key: "phone", resetValue: "" });
    if (filters.address) tags.push({ label: `Addr: ${filters.address}`, key: "address", resetValue: "" });
    if (filters.state !== "All") tags.push({ label: `State: ${filters.state}`, key: "state", resetValue: "All" });
    if (filters.phoneStatus !== "All") tags.push({ label: filters.phoneStatus, key: "phoneStatus", resetValue: "All" });
    if (filters.dateFrom) tags.push({ label: `From: ${format(filters.dateFrom, "MM/dd")}`, key: "dateFrom", resetValue: undefined });
    if (filters.dateTo) tags.push({ label: `To: ${format(filters.dateTo, "MM/dd")}`, key: "dateTo", resetValue: undefined });
    return tags;
  }, [filters]);

  return (
    <aside className="w-[260px] min-h-screen bg-sidebar flex flex-col border-r border-sidebar-border">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-sidebar-border/50">
        <img src={logo} alt="REI Lead Pros" className="h-7 w-auto opacity-90" />
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 py-3 space-y-0.5">

          {/* ── FILTERS ── */}
          <SectionToggle
            icon={Filter}
            title="Filters"
            count={activeFilterCount}
            open={filtersOpen}
            onToggle={() => setFiltersOpen(!filtersOpen)}
          />

          {filtersOpen && (
            <div className="pl-1 space-y-1 pt-1 pb-2 animate-fade-in">
              <FilterRow icon={Search} placeholder="Name..." value={filters.name} onChange={(v) => update("name", v)} />
              <FilterRow icon={Building} placeholder="Client..." value={filters.client} onChange={(v) => update("client", v)} />
              <FilterRow icon={Phone} placeholder="Phone..." value={filters.phone} onChange={(v) => update("phone", v)} />
              <FilterRow icon={MapPin} placeholder="Address..." value={filters.address} onChange={(v) => update("address", v)} />

              {/* Dropdowns */}
              <div className="flex items-center gap-1.5 pt-1">
                <div className="flex items-center justify-center w-6 h-7 shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground/60" />
                </div>
                <Select value={filters.state} onValueChange={(v) => update("state", v)}>
                  <SelectTrigger className="h-7 text-xs bg-transparent border-0 border-b border-border/40 rounded-none px-0 focus:ring-0 shadow-none">
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border max-h-60">
                    <SelectItem value="All">All States</SelectItem>
                    {US_STATES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {filters.state !== "All" && (
                  <button
                    onClick={() => update("state", "All")}
                    className="flex items-center justify-center w-5 h-5 rounded-md text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-all shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <div className="flex items-center justify-center w-6 h-7 shrink-0">
                  <PhoneCall className="w-3.5 h-3.5 text-muted-foreground/60" />
                </div>
                <Select value={filters.phoneStatus} onValueChange={(v) => update("phoneStatus", v)}>
                  <SelectTrigger className="h-7 text-xs bg-transparent border-0 border-b border-border/40 rounded-none px-0 focus:ring-0 shadow-none">
                    <SelectValue placeholder="Phone Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {["All", "Has Phone", "No Phone", "Has Wrong Number", "No Wrong Numbers"].map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {filters.phoneStatus !== "All" && (
                  <button
                    onClick={() => update("phoneStatus", "All")}
                    className="flex items-center justify-center w-5 h-5 rounded-md text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-all shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Date Range */}
              <div className="pt-0.5">
                <DateRangePicker
                  dateFrom={filters.dateFrom}
                  dateTo={filters.dateTo}
                  onFromChange={(d) => update("dateFrom", d)}
                  onToChange={(d) => update("dateTo", d)}
                />
              </div>

              {/* Active Filter Tags */}
              {activeFilterTags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-2">
                  {activeFilterTags.map((tag) => (
                    <button
                      key={tag.key}
                      onClick={() => update(tag.key, tag.resetValue)}
                      className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-primary/8 text-primary/80 hover:bg-primary/15 hover:text-primary transition-all"
                    >
                      {tag.label}
                      <X className="w-2.5 h-2.5" />
                    </button>
                  ))}
                  {activeFilterTags.length > 1 && (
                    <button
                      onClick={clearFilters}
                      className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                    >
                      <Trash2 className="w-2.5 h-2.5" /> Clear all
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <Separator className="!my-2 bg-sidebar-border/50" />

          {/* ── COLUMNS ── */}
          <SectionToggle
            icon={Columns3}
            title="Fields"
            count={activeColumnCount}
            open={columnsOpen}
            onToggle={() => setColumnsOpen(!columnsOpen)}
          />

          {columnsOpen && (
            <div className="pl-1 space-y-0 pt-1 pb-2 animate-fade-in">
              <ColumnToggle icon={PhoneCall} label="Extra Phones (2 & 3)" checked={filters.showExtraPhones} onToggle={(v) => update("showExtraPhones", v)} />
              <ColumnToggle icon={AlertTriangle} label="Wrong Number Flags" checked={filters.showWrongFlag} onToggle={(v) => update("showWrongFlag", v)} />
              <ColumnToggle icon={CalendarIcon} label="Last Seen Dates" checked={filters.showLastSeen} onToggle={(v) => update("showLastSeen", v)} />
              <ColumnToggle icon={Mail} label="Extra Emails (2 & 3)" checked={filters.showExtraEmails} onToggle={(v) => update("showExtraEmails", v)} />
              <ColumnToggle icon={Mail} label="Mailing Address" checked={filters.showMailing} onToggle={(v) => update("showMailing", v)} />
              <ColumnToggle icon={CalendarIcon} label="Date Added" checked={filters.showCreated} onToggle={(v) => update("showCreated", v)} />
            </div>
          )}

          <Separator className="!my-2 bg-sidebar-border/50" />

          {/* ── STATS ── */}
          <SectionToggle
            icon={BarChart3}
            title="Overview"
            open={statsOpen}
            onToggle={() => setStatsOpen(!statsOpen)}
          />

          {statsOpen && (
            <div className="pt-1 pb-2 animate-fade-in">
              <div className="grid grid-cols-2 gap-1.5">
                <StatCard icon={Building} label="Properties" value={stats?.total_properties ?? 0} accent />
                <StatCard icon={Phone} label="Phones" value={stats?.total_phones ?? 0} />
                <StatCard icon={Mail} label="Emails" value={stats?.total_emails ?? 0} />
                <StatCard icon={User} label="Clients" value={stats?.total_clients ?? 0} />
              </div>
              <div className="mt-1.5">
                <StatCard icon={AlertTriangle} label="Wrong Numbers" value={stats?.wrong_numbers ?? 0} />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Bottom */}
      <div className="px-4 py-2.5 border-t border-sidebar-border/50 space-y-1">
        <Button
          onClick={onRefresh}
          variant="ghost"
          size="sm"
          className="w-full h-7 text-[11px] text-muted-foreground/60 hover:text-primary hover:bg-primary/5 gap-1.5"
        >
          <RefreshCw className="w-3 h-3" /> Refresh
        </Button>
        <LogoutButton />
      </div>
    </aside>
  );
};

export default Sidebar;
