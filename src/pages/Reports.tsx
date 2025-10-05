import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";

export default function Reports() {
  const spendingTrends = [
    { month: "Jan", groceries: 500, dining: 250, transport: 180 },
    { month: "Feb", groceries: 580, dining: 280, transport: 200 },
    { month: "Mar", groceries: 620, dining: 310, transport: 190 },
    { month: "Apr", groceries: 590, dining: 295, transport: 210 },
    { month: "May", groceries: 610, dining: 320, transport: 220 },
    { month: "Jun", groceries: 600, dining: 300, transport: 200 },
  ];

  const categoryBreakdown = [
    { name: "Housing", value: 1500, color: "hsl(160 84% 39%)" },
    { name: "Groceries", value: 600, color: "hsl(160 84% 49%)" },
    { name: "Transport", value: 400, color: "hsl(160 84% 59%)" },
    { name: "Dining", value: 300, color: "hsl(160 84% 69%)" },
    { name: "Utilities", value: 250, color: "hsl(160 84% 79%)" },
    { name: "Other", value: 200, color: "hsl(220 16% 40%)" },
  ];

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <div>
        <h1 className="text-4xl font-bold mb-2">Reports & Analytics</h1>
        <p className="text-muted-foreground">Insights into your spending patterns</p>
      </div>

      <div className="glass-card p-8 rounded-2xl animate-fade-in-up">
        <h2 className="text-2xl font-bold mb-6">Spending Trends</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={spendingTrends}>
            <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "12px",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="groceries"
              stroke="hsl(160 84% 39%)"
              strokeWidth={3}
              dot={{ fill: "hsl(160 84% 39%)", r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="dining"
              stroke="hsl(160 84% 59%)"
              strokeWidth={3}
              dot={{ fill: "hsl(160 84% 59%)", r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="transport"
              stroke="hsl(160 84% 79%)"
              strokeWidth={3}
              dot={{ fill: "hsl(160 84% 79%)", r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="glass-card p-8 rounded-2xl animate-fade-in-up">
        <h2 className="text-2xl font-bold mb-6">Category Breakdown</h2>
        <div className="flex flex-col md:flex-row items-center gap-8">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryBreakdown}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {categoryBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          
          <div className="space-y-3 w-full md:w-auto">
            {categoryBreakdown.map((category) => (
              <div key={category.name} className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span className="text-sm flex-1">{category.name}</span>
                <span className="font-semibold">${category.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
