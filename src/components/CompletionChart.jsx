import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

export default function CompletionChart({ percent, text }) {
  // percent = Visual size (number)
  // text = Actual text to show (string like "0.03%")
  
  const safePercent = percent || 0;
  
  const data = [
    { name: "Completed", value: safePercent },
    { name: "Remaining", value: 100 - safePercent },
  ];

  const COLORS = ["#22c55e", "#f3f4f6"]; 

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Centered Text */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        textAlign: "center"
      }}>
        <span style={{ 
          fontSize: "1.8rem", 
          fontWeight: "800", 
          color: "var(--text-color)" 
        }}>
          {text || "0%"}
        </span>
        <div style={{ 
          fontSize: "0.8rem", 
          color: "var(--text-muted)",
          marginTop: "-2px" 
        }}>
          Done
        </div>
      </div>
    </div>
  );
}