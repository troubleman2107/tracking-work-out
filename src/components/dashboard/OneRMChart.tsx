"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface DataPoint {
  date: string;
  estimated1RM: number;
  totalVolume: number;
}

interface OneRMChartProps {
  data: DataPoint[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="glass rounded-xl px-4 py-3 border border-border/50 shadow-xl">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-lg font-bold text-primary">
          {payload[0].value} kg
        </p>
        <p className="text-xs text-muted-foreground">Estimated 1RM</p>
      </div>
    );
  }
  return null;
}

export function OneRMChart({ data }: OneRMChartProps) {
  const maxRM = Math.max(...data.map((d) => d.estimated1RM));
  const minRM = Math.min(...data.map((d) => d.estimated1RM));
  const padding = (maxRM - minRM) * 0.2 || 10;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart
        data={data}
        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
      >
        <defs>
          <linearGradient id="rmGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="oklch(0.72 0.19 142)" />
            <stop offset="100%" stopColor="oklch(0.68 0.19 200)" />
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
          domain={[minRM - padding, maxRM + padding]}
          tickFormatter={(v) => `${v}`}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "oklch(1 0 0 / 10%)" }} />
        <Line
          type="monotone"
          dataKey="estimated1RM"
          stroke="url(#rmGradient)"
          strokeWidth={2.5}
          dot={{
            r: 4,
            fill: "oklch(0.72 0.19 142)",
            strokeWidth: 2,
            stroke: "oklch(0.08 0.005 260)",
          }}
          activeDot={{
            r: 6,
            fill: "oklch(0.72 0.19 142)",
            stroke: "oklch(0.08 0.005 260)",
            strokeWidth: 2,
          }}
        />
        {data.length > 1 && (
          <ReferenceLine
            y={maxRM}
            stroke="oklch(0.72 0.19 142 / 30%)"
            strokeDasharray="4 4"
            label={{
              value: `PR: ${maxRM}kg`,
              fontSize: 10,
              fill: "oklch(0.72 0.19 142)",
              position: "insideTopRight",
            }}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
