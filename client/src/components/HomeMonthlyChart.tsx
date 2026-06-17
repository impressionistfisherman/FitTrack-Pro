import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const volumeKey = "볼륨(kg)";

export function HomeMonthlyChart({ stats }: { stats: any[] }) {
  const chartData = stats.slice(-6).map((item) => ({
    month: item.month,
    운동횟수: item.count,
    [volumeKey]: Math.round(item.totalVolume),
  }));

  return (
    <ResponsiveContainer width="100%" height={150}>
      <BarChart data={chartData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="month" stroke="var(--color-muted-foreground)" style={{ fontSize: "12px" }} />
        <YAxis yAxisId="count" stroke="var(--color-muted-foreground)" style={{ fontSize: "12px" }} />
        <YAxis
          yAxisId="volume"
          orientation="right"
          width={48}
          stroke="var(--color-blue-400)"
          style={{ fontSize: "12px" }}
          tickFormatter={(value) => Number(value).toLocaleString()}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
          }}
          labelStyle={{ color: "var(--color-foreground)" }}
          formatter={(value, name, item) => {
            const numericValue = Number(value) || 0;
            const isVolume = name === "볼륨" || item.dataKey === volumeKey;
            return isVolume
              ? [`${numericValue.toLocaleString()}kg`, "볼륨"]
              : [`${numericValue.toLocaleString()}회`, "운동횟수"];
          }}
        />
        <Legend />
        <Bar yAxisId="count" dataKey="운동횟수" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
        <Bar yAxisId="volume" dataKey={volumeKey} name="볼륨" fill="var(--color-blue-400)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
