import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, CartesianGrid } from "recharts";

export default function WeeklyChart({ data = [] }) {
  const displayData = data.length > 0 ? data : [
    { day: "Mon", score: 0 }, { day: "Tue", score: 0 }, { day: "Wed", score: 0 },
    { day: "Thu", score: 0 }, { day: "Fri", score: 0 }, { day: "Sat", score: 0 }, { day: "Sun", score: 0 }
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={displayData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
        {/* Subtle Grid Lines */}
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.5} />
        
        <XAxis 
          dataKey="day" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 12, fill: "var(--text-muted)" }} 
          dy={10}
          interval={0} // Forces every single label (Mon, Tue...) to appear
        />
        
        <Tooltip 
          cursor={{ fill: 'transparent' }}
          contentStyle={{ 
            backgroundColor: "var(--card-bg)", 
            borderRadius: "12px", 
            border: "1px solid var(--border-color)",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
          }}
        />
        
        <Bar 
          dataKey="score" 
          fill="#3b82f6" // Professional Blue
          radius={[6, 6, 6, 6]} 
          barSize={20} 
        />
      </BarChart>
    </ResponsiveContainer>
  );
}