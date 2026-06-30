import React from "react";
import { DollarSign, TrendingUp, Percent, Calendar, Activity, Zap, ArrowUpRight } from "lucide-react";
import { KPIs } from "../types";

interface Props {
  kpis: KPIs;
  onCardClick?: (cardId: string) => void;
  comparePeriods?: boolean;
  compareLoading?: boolean;
}

export function formatCurrency(num: number): string {
  if (num === null || num === undefined || isNaN(num)) return "$0";
  if (num === 0) return "$0";
  if (Math.abs(num) >= 1000000) {
    return `$${(num / 1000000).toFixed(2)}M`;
  } else if (Math.abs(num) >= 1000) {
    return `$${(num / 1000).toFixed(0)}K`;
  }
  return `$${num.toLocaleString()}`;
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
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        
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
              </div>

              <div className="flex flex-col gap-1.5 pt-1.5 border-t border-slate-100 mt-2">
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
