import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface NetWorthCircleProps {
  netWorth: number;
  target: number;
}

export function NetWorthCircle({ netWorth, target }: NetWorthCircleProps) {
  const percentage = Math.min((netWorth / target) * 100, 100);
  const data = [
    { name: "Current", value: percentage },
    { name: "Remaining", value: 100 - percentage },
  ];

  const COLORS = ["hsl(160 84% 39%)", "hsl(220 16% 22%)"];

  return (
    <div className="glass-card p-8 rounded-2xl animate-scale-in relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-emerald-subtle opacity-20"></div>
      <div className="relative">
        <h2 className="text-lg font-semibold mb-6 text-center">Net Worth</h2>
        <div className="relative">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={100}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-4xl font-bold bg-gradient-emerald bg-clip-text text-transparent">
              ${(netWorth / 1000).toFixed(1)}k
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {percentage.toFixed(0)}% of goal
            </p>
          </div>
        </div>
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">Target</p>
          <p className="text-lg font-semibold">${(target / 1000).toFixed(0)}k</p>
        </div>
      </div>
    </div>
  );
}
