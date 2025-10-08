import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface NetWorthCircleProps {
  netWorth: number;
  target: number;
}

interface NetWorthCircleEditableProps extends NetWorthCircleProps {
  editingTarget: boolean;
  setEditingTarget: (v: boolean) => void;
  targetInput: string;
  setTargetInput: (v: string) => void;
  setNetWorthTarget: (v: number) => void;
}

export function NetWorthCircle({ netWorth, target, editingTarget, setEditingTarget, targetInput, setTargetInput, setNetWorthTarget }: NetWorthCircleEditableProps) {
  const percentage = Math.min((netWorth / target) * 100, 100);
  const data = [
    { name: "Current", value: percentage },
    { name: "Remaining", value: 100 - percentage },
  ];

  const COLORS = ["hsl(158 64% 20%)", "hsl(220 16% 22%)"];

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
            <p className="text-4xl font-bold text-white [text-shadow:_1px_1px_0_#000,_-1px_1px_0_#000,_1px_-1px_0_#000,_-1px_-1px_0_#000]">
              {netWorth >= 1000 ? `$${(netWorth / 1000).toFixed(1)}k` : `$${netWorth}`}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {percentage.toFixed(0)}% of goal
            </p>
          </div>
        </div>
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">Target</p>
          {editingTarget ? (
            <div className="flex items-center justify-center gap-2 mt-1">
              <input
                type="number"
                min={0}
                value={targetInput}
                onChange={e => setTargetInput(e.target.value)}
                className="w-24 px-2 py-1 rounded border focus:outline-none focus:ring"
              />
              <button
                className="text-xs text-green-600 font-bold px-2 py-1 rounded hover:bg-green-100"
                onClick={() => {
                  const val = Number(targetInput);
                  if (!isNaN(val) && val > 0) {
                    setNetWorthTarget(val);
                    localStorage.setItem('netWorthTarget', val.toString());
                    setEditingTarget(false);
                  }
                }}
              >Save</button>
              <button
                className="text-xs text-muted-foreground px-2 py-1 rounded hover:bg-gray-100"
                onClick={() => setEditingTarget(false)}
              >Cancel</button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <p className="text-lg font-semibold">
                {target >= 1000 ? `$${(target / 1000).toFixed(0)}k` : `$${target}`}
              </p>
              <button
                className="ml-2 text-xs text-accent underline hover:no-underline"
                onClick={() => setEditingTarget(true)}
                title="Edit Target"
              >Edit</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
