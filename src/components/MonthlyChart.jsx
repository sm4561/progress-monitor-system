import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, CartesianGrid, YAxis } from "recharts";

// Accept 'data' prop.
export default function MonthlyChart({ data = [] }) {
  const displayData = data.length > 0 ? data : [{ week: "No Data", progress: 0 }];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={displayData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.5} />
        <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--text-muted)" }} dy={10}/>
        {/* Add YAxis to see values better if needed */}
        {/* <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--text-muted)" }} /> */}
        <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: "var(--card-bg)", borderRadius: "12px", border: "1px solid var(--border-color)" }}/>
        <Bar dataKey="progress" fill="#10b981" radius={[6, 6, 6, 6]} barSize={30} />
      </BarChart>
    </ResponsiveContainer>
  );
}