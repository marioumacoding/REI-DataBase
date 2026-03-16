import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Property } from "@/lib/types";
import { MapPin, Phone, Building, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface ChartFilter {
  type: "state" | "client" | "phone";
  value: string;
}

interface ChartsProps {
  data: Property[];
  filteredData: Property[];
  chartFilter: ChartFilter | null;
  onChartFilter: (filter: ChartFilter | null) => void;
}

const COLORS = [
  "hsl(0, 72%, 51%)",
  "hsl(0, 50%, 38%)",
  "hsl(220, 12%, 40%)",
  "hsl(220, 12%, 55%)",
  "hsl(220, 12%, 30%)",
  "hsl(0, 72%, 65%)",
  "hsl(0, 40%, 28%)",
  "hsl(220, 12%, 50%)",
];

const ACTIVE_COLOR = "hsl(0, 72%, 51%)";
const INACTIVE_COLOR = "hsl(220, 12%, 20%)";

const ChartCard = ({ title, icon: Icon, active, onClear, children }: { title: string; icon: any; active?: string; onClear?: () => void; children: React.ReactNode }) => (
  <div className={`bg-card border rounded-xl p-5 animate-fade-in transition-colors ${active ? 'border-primary/40' : 'border-border'}`}>
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          {title}
        </h3>
      </div>
      {active && (
        <Badge
          variant="outline"
          className="text-[10px] border-primary/30 text-primary bg-primary/5 cursor-pointer hover:bg-primary/10 gap-1 pr-1"
          onClick={onClear}
        >
          {active} <X className="w-3 h-3" />
        </Badge>
      )}
    </div>
    {children}
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs font-semibold text-foreground">{label || payload[0]?.name}</p>
      <p className="text-xs text-primary font-mono">{payload[0]?.value}</p>
    </div>
  );
};

const Charts = ({ data, filteredData, chartFilter, onChartFilter }: ChartsProps) => {
  // Use filtered data for charts that are NOT the active filter type
  // The active filter's chart uses full data so user can see what they selected
  const stateSource = (chartFilter?.type === "state" ? data : filteredData) || [];
  const phoneSource = (chartFilter?.type === "phone" ? data : filteredData) || [];
  const clientSource = (chartFilter?.type === "client" ? data : filteredData) || [];

  const stateData = useMemo(() => {
    const counts: Record<string, number> = {};
    stateSource.forEach((p) => { counts[p.state] = (counts[p.state] || 0) + 1; });
    return Object.entries(counts).map(([state, count]) => ({ state, count })).sort((a, b) => b.count - a.count);
  }, [stateSource]);

  const phoneData = useMemo(() => {
    let hasPhone = 0, noPhone = 0, wrongNum = 0;
    phoneSource.forEach((p) => {
      if (p.wrong_1 || p.wrong_2 || p.wrong_3) wrongNum++;
      else if (p.phone_1) hasPhone++;
      else noPhone++;
    });
    return [
      { name: "Valid Phones", value: hasPhone },
      { name: "No Phone", value: noPhone },
      { name: "Wrong Numbers", value: wrongNum },
    ].filter((d) => d.value > 0);
  }, [phoneSource]);

  const clientData = useMemo(() => {
    const counts: Record<string, number> = {};
    clientSource.forEach((p) => { counts[p.client_name] = (counts[p.client_name] || 0) + 1; });
    return Object.entries(counts).map(([client, count]) => ({ client, count })).sort((a, b) => b.count - a.count);
  }, [clientSource]);

  const handleStateClick = (d: any) => {
    if (!d?.activePayload?.[0]) return;
    const state = d.activePayload[0].payload.state;
    onChartFilter(chartFilter?.type === "state" && chartFilter.value === state ? null : { type: "state", value: state });
  };

  const handleClientClick = (d: any) => {
    if (!d?.activePayload?.[0]) return;
    const client = d.activePayload[0].payload.client;
    onChartFilter(chartFilter?.type === "client" && chartFilter.value === client ? null : { type: "client", value: client });
  };

  const handlePhoneClick = (_: any, index: number) => {
    const name = phoneData[index]?.name;
    if (!name) return;
    onChartFilter(chartFilter?.type === "phone" && chartFilter.value === name ? null : { type: "phone", value: name });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <ChartCard
        title="By State"
        icon={MapPin}
        active={chartFilter?.type === "state" ? chartFilter.value : undefined}
        onClear={() => onChartFilter(null)}
      >
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stateData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} onClick={handleStateClick} style={{ cursor: 'pointer' }}>
              <XAxis dataKey="state" tick={{ fontSize: 10, fill: 'hsl(220, 8%, 48%)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(220, 8%, 48%)' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(220, 12%, 12%)' }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={32}>
                {stateData.map((entry) => (
                  <Cell
                    key={entry.state}
                    fill={!chartFilter || chartFilter.type !== "state" || chartFilter.value === entry.state ? ACTIVE_COLOR : INACTIVE_COLOR}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard
        title="Phone Status"
        icon={Phone}
        active={chartFilter?.type === "phone" ? chartFilter.value : undefined}
        onClear={() => onChartFilter(null)}
      >
        <div className="h-52 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={phoneData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                dataKey="value"
                stroke="hsl(220, 15%, 8%)"
                strokeWidth={2}
                onClick={handlePhoneClick}
                style={{ cursor: 'pointer' }}
              >
                {phoneData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={!chartFilter || chartFilter.type !== "phone" || chartFilter.value === entry.name
                      ? COLORS[i % COLORS.length]
                      : INACTIVE_COLOR}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '11px', cursor: 'pointer' }}
                formatter={(value) => <span style={{ color: 'hsl(220, 10%, 75%)' }}>{value}</span>}
                onClick={(e: any) => {
                  const name = e.value;
                  onChartFilter(chartFilter?.type === "phone" && chartFilter.value === name ? null : { type: "phone", value: name });
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard
        title="By Client"
        icon={Building}
        active={chartFilter?.type === "client" ? chartFilter.value : undefined}
        onClear={() => onChartFilter(null)}
      >
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={clientData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }} onClick={handleClientClick} style={{ cursor: 'pointer' }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(220, 8%, 48%)' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="client" tick={{ fontSize: 10, fill: 'hsl(220, 8%, 48%)' }} axisLine={false} tickLine={false} width={100} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(220, 12%, 12%)' }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={20}>
                {clientData.map((entry) => (
                  <Cell
                    key={entry.client}
                    fill={!chartFilter || chartFilter.type !== "client" || chartFilter.value === entry.client ? "hsl(0, 50%, 38%)" : INACTIVE_COLOR}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
};

export default Charts;
