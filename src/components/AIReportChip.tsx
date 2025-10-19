import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

interface Props {
  type: "success" | "warning" | "info";
  title: string;
  subtitle?: string;
}

export function AIReportChip({ type, title, subtitle }: Props) {
  const color =
    type === "warning"
      ? "bg-red-500/10 text-red-600 border-red-500/30"
      : type === "success"
      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
      : "bg-blue-500/10 text-blue-600 border-blue-500/30";

  const Icon = type === "warning" ? AlertTriangle : type === "success" ? CheckCircle2 : Info;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${color}`}>
      <Icon className="w-4 h-4" />
      <span className="text-xs font-semibold">{title}</span>
      {subtitle && <span className="text-[11px] opacity-75">• {subtitle}</span>}
    </div>
  );
}
