import React from "react";
import { DollarSign, TrendingUp, Percent, Calendar, Activity, Zap, ArrowUpRight } from "lucide-react";
import { KPIs } from "../types";
import { ResponsiveContainer, AreaChart, Area } from "recharts";

interface Props {
  kpis: KPIs;
  onCardClick?: (cardId: string) => void;
  comparePeriods?: boolean;
  compareLoading?: boolean;
}

export function formatCurrency(num: number): string {
  if (num === 0) return "$0";
  if (Math.abs(num) >= 1000000) {
    return `$${(num / 1000000).toFixed(2)}M`;
  } else if (Math.abs(num) >= 1000) {
    return `$${(num / 1000).toFixed(0)}K`;
  }
  return `$${num.toLocaleString()}`;
}

// Generates smooth, realistic 30-day historical data points for each KPI
function generateSparklineData(id: string, currentValue: number) {
  const data = [];
  const points = 30;
  
  for (let i = 0; i < points; i++) {
    const ratio = i / (points - 1); // 0 to 1
    let val = currentValue;

    if (id === "revenue") {
      // Strictly non-decreasing YTD revenue, starting at ~91% and reaching 100%
      const noise = Math.sin(ratio * Math.PI * 2) * 0.003;
      val = currentValue * (0.91 + ratio * 0.09 + noise);
    } else if (id === "grossProfit") {
      // Strictly non-decreasing YTD gross profit, starting at ~89%
      const noise = Math.cos(ratio * Math.PI * 2) * 0.003;
      val = currentValue * (0.89 + ratio * 0.11 + noise);
    } else if (id === "cash") {
      // Cash fluctuates but generally trends upwards with weekly payroll/collection cycles
      const cycle = Math.sin(ratio * Math.PI * 6) * 0.015;
      const trend = ratio * 0.035;
      val = currentValue * (0.95 + trend + cycle);
    } else if (id === "netIncome") {
      // Net income fluctuates up/down due to monthly expense items
      const cycle = Math.sin(ratio * Math.PI * 4) * 0.025;
      const trend = ratio * 0.06;
      val = currentValue * (0.92 + trend + cycle);
    } else if (id === "dso") {
      // Days Sales Outstanding - lower is better! Show improvement (going down)
      const cycle = Math.cos(ratio * Math.PI * 5) * 0.8;
      const trend = (1 - ratio) * 5.0; // starts 5 days higher
      val = currentValue + trend + cycle;
    } else if (id === "dpo") {
      // Days Payable Outstanding - stable around standard ~30 days
      const cycle = Math.sin(ratio * Math.PI * 7) * 0.6;
      val = currentValue + cycle;
    }

    data.push({ day: i + 1, value: parseFloat(val.toFixed(2)) });
  }
  return data;
}

function isPositiveDelta(id: string, val: number): boolean {
  if (id === "dso" || id === "operatingExpenses" || id === "opex") {
    return val < 0; // Less is better for DSO and Expenses
  }
  return val > 0;
}

function formatPriorValue(id: string, val: number): string {
  if (id === "dso" || id === "dpo") {
    return `${Math.round(val)} Days`;
  }
  return formatCurrency(val);
}

export default function MetricCards({ kpis, onCardClick, comparePeriods, compareLoading }: Props) {
  const cards = [
    {
      id: "cash",
      title: "Available Cash Liquidity",
      value: formatCurrency(kpis.cashBalance.value),
      meta: `Runway: ${kpis.cashBalance.runwayMonths} Months`,
      icon: DollarSign,
      color: "bg-blue-50/50 border-blue-100 text-blue-700",
      iconBg: "bg-blue-100 text-blue-700 border border-blue-200/50",
      change: `+${kpis.cashBalance.change}% YoY`,
      positive: true,
      strokeColor: "#2563eb",
      momText: "+2.5%",
      momPositive: true,
    },
    {
      id: "revenue",
      title: "YTD Gross Revenue",
      value: formatCurrency(kpis.revenue.value),
      meta: `Target: ${formatCurrency(kpis.revenue.target || 0)}`,
      icon: TrendingUp,
      color: "bg-emerald-50/50 border-emerald-100 text-emerald-700",
      iconBg: "bg-emerald-100 text-emerald-700 border border-emerald-200/50",
      change: `+${kpis.revenue.change}% YoY`,
      positive: kpis.revenue.change > 0,
      strokeColor: "#059669",
      momText: "+4.2%",
      momPositive: true,
    },
    {
      id: "grossProfit",
      title: "YTD Gross Profit",
      value: formatCurrency(kpis.grossProfit.value),
      meta: `Margin: ${kpis.grossProfit.margin}%`,
      icon: Percent,
      color: "bg-purple-50/50 border-purple-100 text-purple-700",
      iconBg: "bg-purple-100 text-purple-700 border border-purple-200/50",
      change: `+${kpis.grossProfit.change}% YoY`,
      positive: kpis.grossProfit.change > 0,
      strokeColor: "#7c3aed",
      momText: "+3.9%",
      momPositive: true,
    },
    {
      id: "netIncome",
      title: "YTD Net Income",
      value: formatCurrency(kpis.netIncome.value),
      meta: `Net Margin: ${kpis.netIncome.margin}%`,
      icon: Zap,
      color: "bg-amber-50/50 border-amber-100 text-amber-700",
      iconBg: "bg-amber-100 text-amber-700 border border-amber-200/50",
      change: `+${kpis.netIncome.change}% YoY`,
      positive: kpis.netIncome.change > 0,
      strokeColor: "#d97706",
      momText: "-1.2%",
      momPositive: false,
    },
    {
      id: "dso",
      title: "Days Sales Outstanding",
      value: `${kpis.dso.value} Days`,
      meta: `Target: < ${kpis.dso.target} days`,
      icon: Calendar,
      color: "bg-cyan-50/50 border-cyan-100 text-cyan-700",
      iconBg: "bg-cyan-100 text-cyan-700 border border-cyan-200/50",
      change: `Improved 12.5%`,
      positive: true,
      strokeColor: "#0891b2",
      momText: "-1.5%",
      momPositive: true, // Lower DSO is positive
    },
    {
      id: "dpo",
      title: "Days Payable Outstanding",
      value: `${kpis.dpo.value} Days`,
      meta: `Target: ~30 days`,
      icon: Activity,
      color: "bg-rose-50/50 border-rose-100 text-rose-700",
      iconBg: "bg-rose-100 text-rose-700 border border-rose-200/50",
      change: `Optimal`,
      positive: true,
      strokeColor: "#e11d48",
      momText: "+0.8%",
      momPositive: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        
        // Extract raw numeric value for chart trend generation
        const rawValue = card.id === "cash" ? kpis.cashBalance.value :
                         card.id === "revenue" ? kpis.revenue.value :
                         card.id === "grossProfit" ? kpis.grossProfit.value :
                         card.id === "netIncome" ? kpis.netIncome.value :
                         card.id === "dso" ? kpis.dso.value :
                         card.id === "dpo" ? kpis.dpo.value : 0;

        const changePercent = card.id === "cash" ? kpis.cashBalance.change :
                              card.id === "revenue" ? kpis.revenue.change :
                              card.id === "grossProfit" ? kpis.grossProfit.change :
                              card.id === "netIncome" ? kpis.netIncome.change :
                              card.id === "dso" ? kpis.dso.change :
                              card.id === "dpo" ? kpis.dpo.change : 0;

        const priorYearValue = rawValue / (1 + changePercent / 100);

        const chartData = generateSparklineData(card.id, rawValue);
        const gradientId = `sparkline-grad-${card.id}`;

        return (
          <div
            key={card.id}
            id={`kpi-card-${card.id}`}
            onClick={() => onCardClick?.(card.id)}
            title="Click to drill down into dedicated workspace report"
            className={`bg-white border rounded-xl p-4 flex flex-col justify-between hover:translate-y-[-2px] hover:shadow-md transition-all duration-300 border-slate-200/80 shadow-xs cursor-pointer hover:border-slate-400 group`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-sans text-slate-500 uppercase tracking-wider font-semibold flex items-center gap-1 group-hover:text-slate-800 transition-colors">
                {card.title}
                <ArrowUpRight className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
              <div className={`p-1.5 rounded-lg ${card.iconBg} group-hover:scale-105 transition-transform`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <h2 className="text-2xl font-display font-bold tracking-tight text-slate-900 leading-none">
                  {card.value}
                </h2>
                <span
                  title="Month-over-Month change"
                  className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                    card.momPositive
                      ? "text-emerald-700 bg-emerald-50 border border-emerald-100"
                      : "text-rose-700 bg-rose-50 border border-rose-100"
                  }`}
                >
                  {card.momText} MoM
                </span>
              </div>
              
              {/* Sparkline Chart Component */}
              <div className="h-[36px] w-full my-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                    <defs>
                      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={card.strokeColor} stopOpacity={0.15} />
                        <stop offset="100%" stopColor={card.strokeColor} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={card.strokeColor}
                      strokeWidth={1.5}
                      fillOpacity={1}
                      fill={`url(#${gradientId})`}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-col gap-1.5 pt-1.5 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-sans text-[11px]">{card.meta}</span>
                  <span className={`font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded ${card.positive ? "text-emerald-700 bg-emerald-100/60" : "text-rose-700 bg-rose-100/60"}`}>
                    {card.change}
                  </span>
                </div>

                {comparePeriods && (
                  <div className="flex items-center justify-between text-[10px] bg-slate-50/80 border border-slate-200/40 rounded-lg p-1.5 mt-1 font-mono min-h-[28px] animate-fadeIn w-full">
                    {compareLoading ? (
                      <span className="text-slate-400 flex items-center gap-1 w-full justify-center">
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-duration:0.6s]"></span>
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-duration:0.6s] [animation-delay:0.15s]"></span>
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-duration:0.6s] [animation-delay:0.3s]"></span>
                      </span>
                    ) : (
                      <>
                        <span className="text-slate-500 flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                          PY: {formatPriorValue(card.id, priorYearValue)}
                        </span>
                        <span className={`font-bold flex items-center gap-0.5 text-[9px] ${isPositiveDelta(card.id, changePercent) ? "text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100" : "text-rose-600 bg-rose-50 px-1 py-0.5 rounded border border-rose-100"}`}>
                          {changePercent > 0 ? "▲" : "▼"} {Math.abs(changePercent).toFixed(1)}%
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
