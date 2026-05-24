"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface DataPoint {
  date: string;
  totalVolume: number;
  estimated1RM: number;
}

interface VolumeChartProps {
  data: DataPoint[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="glass rounded-xl px-4 py-3 border border-border/50 shadow-xl">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-lg font-bold text-chart-2">
          {payload[0].value.toLocaleString()} kg
        </p>
        <p className="text-xs text-muted-foreground">Total Volume</p>
      </div>
    );
  }
  return null;
}

export function VolumeChart({ data }: VolumeChartProps) {
  const maxVolume = Math.max(...data.map((d) => d.totalVolume));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={data}
        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
        barCategoryGap="35%"
      >
        <defs>
          <linearGradient id="volGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.68 0.19 200)" stopOpacity={1} />
            <stop offset="100%" stopColor="oklch(0.68 0.19 200)" stopOpacity={0.3} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="oklch(1 0 0 / 6%)"
          horizontal
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "oklch(0.55 0.01 260)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => {
            const d = new Date(value);
            return `${d.getMonth() + 1}/${d.getDate()}`;
          }}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "oklch(0.55 0.01 260)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: "oklch(1 0 0 / 4%)", radius: 6 }}
        />
        <Bar dataKey="totalVolume" radius={[6, 6, 0, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={
                entry.totalVolume === maxVolume
                  ? "oklch(0.72 0.19 142)"
                  : "url(#volGradient)"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
