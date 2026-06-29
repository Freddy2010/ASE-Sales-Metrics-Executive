import React, { useState, useRef, useEffect } from "react";
import { TrendingUp, BarChart2, CheckCircle2, ChevronRight, HelpCircle } from "lucide-react";
import { SalesForecastItem } from "../types";
import { formatCurrency } from "./MetricCards";

interface Props {
  baselineSales: SalesForecastItem[];
}

export default function SalesForecaster({ baselineSales }: Props) {
  const [metricView, setMetricView] = useState<"revenue" | "gp">("revenue");
  const [scenarioModel, setScenarioModel] = useState<"conservative" | "baseline" | "optimistic">("baseline");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const height = 240;
  const padding = { top: 30, right: 30, bottom: 40, left: 60 };

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setWidth(Math.max(300, entry.contentRect.width));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute values based on selected scenario model
  const adjustedSales = baselineSales.map((item) => {
    let multiplier = 1.0;
    if (scenarioModel === "conservative") multiplier = 0.85;
    if (scenarioModel === "optimistic") multiplier = 1.15;

    // Actual revenue is left untouched if positive. Only forecasts are affected.
    const isFuture = item.actualRevenue === 0;

    return {
      period: item.period,
      actualRevenue: item.actualRevenue,
      forecastRevenue: isFuture ? Math.floor(item.forecastRevenue * multiplier) : item.forecastRevenue,
      actualGP: item.actualGP,
      forecastGP: isFuture ? Math.floor(item.forecastGP * multiplier) : item.forecastGP,
    };
  });

  // Calculate coordinates
  const values = adjustedSales.flatMap((d) => [
    metricView === "revenue" ? d.actualRevenue : d.actualGP,
    metricView === "revenue" ? d.forecastRevenue : d.forecastGP,
  ]);

  const maxVal = Math.max(...values, 100000) * 1.05;
  const getX = (index: number) => {
    return padding.left + (index / (adjustedSales.length - 1)) * (width - padding.left - padding.right);
  };

  const getY = (val: number) => {
    const scaleY = (height - padding.top - padding.bottom) / maxVal;
    return height - padding.bottom - val * scaleY;
  };

  // SVG widths for bars
  const totalMonths = adjustedSales.length;
  const barGroupWidth = Math.min(40, (width - padding.left - padding.right) / totalMonths * 0.6);
  const singleBarWidth = barGroupWidth / 2 - 2;

  // Sums for side stats
  const totalActualRevenue = adjustedSales.reduce((sum, item) => sum + item.actualRevenue, 0);
  const totalForecastRevenue = adjustedSales.reduce((sum, item) => sum + (item.actualRevenue === 0 ? item.forecastRevenue : 0), 0);
  const totalActualGP = adjustedSales.reduce((sum, item) => sum + item.actualGP, 0);
  const totalForecastGP = adjustedSales.reduce((sum, item) => sum + (item.actualGP === 0 ? item.forecastGP : 0), 0);

  return (
    <div id="sales-forecaster-panel" className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-slate-100 text-slate-800 border border-slate-200">
              <BarChart2 className="w-4 h-4" />
            </span>
            <h3 className="font-display font-bold text-lg text-slate-900">YTD Sales & Performance Forecasting</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Compare realized transactional sales from NetSuite invoices against model targets and forward-looking pipelines.
          </p>
        </div>

        {/* Metric Toggles & Scenario Presets */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Revenue vs Gross Profit view toggle */}
          <div className="bg-slate-100 p-1 rounded-lg border border-slate-200 flex text-xs">
            <button
              onClick={() => setMetricView("revenue")}
              className={`px-3 py-1 rounded-md font-medium transition-all ${metricView === "revenue" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-500 hover:text-slate-800"}`}
            >
              Revenue
            </button>
            <button
              onClick={() => setMetricView("gp")}
              className={`px-3 py-1 rounded-md font-medium transition-all ${metricView === "gp" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-500 hover:text-slate-800"}`}
            >
              Gross Profit
            </button>
          </div>

          {/* Model toggle */}
          <div className="bg-slate-100 p-1 rounded-lg border border-slate-200 flex text-xs">
            {["conservative", "baseline", "optimistic"].map((model) => (
              <button
                key={model}
                onClick={() => setScenarioModel(model as any)}
                className={`px-2.5 py-1 rounded-md font-medium capitalize transition-all ${scenarioModel === model ? "bg-slate-900 text-white font-bold" : "text-slate-500 hover:text-slate-800"}`}
              >
                {model}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bento Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sales Performance Summary */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
            <h4 className="text-[11px] uppercase text-slate-500 font-bold tracking-wider mb-2">Realized Performance</h4>
            <div className="space-y-1">
              <p className="text-xl font-display font-bold text-slate-900">
                {metricView === "revenue" ? formatCurrency(totalActualRevenue) : formatCurrency(totalActualGP)}
              </p>
              <p className="text-[10px] text-emerald-700 font-semibold font-sans flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> NetSuite Invoice Actuals
              </p>
            </div>
          </div>

          <div className="bg-blue-50/40 border border-blue-100 p-4 rounded-xl">
            <h4 className="text-[11px] uppercase text-blue-800 font-bold tracking-wider mb-2">Forward Backlog & Pipeline</h4>
            <div className="space-y-1">
              <p className="text-xl font-display font-bold text-blue-700">
                {metricView === "revenue" ? formatCurrency(totalForecastRevenue) : formatCurrency(totalForecastGP)}
              </p>
              <p className="text-[10px] text-blue-600 font-semibold font-sans flex items-center gap-1">
                <ChevronRight className="w-3 h-3 text-blue-500" /> Projected {scenarioModel} forecast
              </p>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 flex items-start gap-1 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
            <HelpCircle className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
            <span>Actuals are populated directly from closed NetSuite Accounting Periods. Pipelines represent Open Sales Orders and Estimations.</span>
          </div>
        </div>

        {/* Main Double-Bar Chart */}
        <div className="lg:col-span-9" ref={containerRef}>
          <div className="bg-slate-50/50 border border-slate-150 rounded-xl p-3 relative">
            <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
              {/* Grid Y lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
                const val = maxVal - p * maxVal;
                const currY = padding.top + p * (height - padding.top - padding.bottom);
                return (
                  <g key={i}>
                    <line
                      x1={padding.left}
                      y1={currY}
                      x2={width - padding.right}
                      y2={currY}
                      stroke="#e2e8f0"
                      strokeDasharray="2,4"
                    />
                    <text
                      x={padding.left - 8}
                      y={currY + 4}
                      fill="#94a3b8"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="end"
                    >
                      {formatCurrency(val)}
                    </text>
                  </g>
                );
              })}

              {/* Bars and labels */}
              {adjustedSales.map((d, i) => {
                const currX = getX(i);
                const actualVal = metricView === "revenue" ? d.actualRevenue : d.actualGP;
                const forecastVal = metricView === "revenue" ? d.forecastRevenue : d.forecastGP;

                const actY = getY(actualVal);
                const forY = getY(forecastVal);
                const baselineY = getY(0);

                const isFuture = d.actualRevenue === 0;

                return (
                  <g key={i}>
                    {/* Actual Bar (Emerald/Green fill) */}
                    {!isFuture && (
                      <rect
                        x={currX - singleBarWidth - 2}
                        y={actY}
                        width={singleBarWidth}
                        height={Math.max(0, baselineY - actY)}
                        fill="#059669"
                        rx="2"
                        opacity={hoveredIdx === i ? 1.0 : 0.85}
                      />
                    )}

                    {/* Forecast Bar (Blue outline/fill depending on status) */}
                    <rect
                      x={currX + 2}
                      y={forY}
                      width={singleBarWidth}
                      height={Math.max(0, baselineY - forY)}
                      fill={isFuture ? "#2563eb" : "#3b82f6"}
                      rx="2"
                      opacity={isFuture ? (hoveredIdx === i ? 0.95 : 0.8) : (hoveredIdx === i ? 0.45 : 0.3)}
                    />

                    {/* X Axis Labels */}
                    <text
                      x={currX}
                      y={height - padding.bottom + 18}
                      fill="#64748b"
                      fontSize="10"
                      fontWeight="semibold"
                      textAnchor="middle"
                    >
                      {d.period}
                    </text>

                    {/* Full group hover trigger */}
                    <rect
                      x={currX - barGroupWidth}
                      y={padding.top}
                      width={barGroupWidth * 2}
                      height={height - padding.bottom - padding.top}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredIdx(i)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Custom Bar Tooltip */}
            {hoveredIdx !== null && (
              <div
                className="absolute top-2 bg-slate-900 text-slate-100 rounded-lg p-3 text-xs shadow-md border border-slate-850 pointer-events-none space-y-1"
                style={{
                  left: `${Math.min(width - 170, Math.max(70, getX(hoveredIdx) - 80))}px`,
                }}
              >
                <div className="font-display font-bold text-white border-b border-slate-800 pb-1 mb-1">
                  {adjustedSales[hoveredIdx].period} Breakdown
                </div>
                {adjustedSales[hoveredIdx].actualRevenue > 0 && (
                  <div className="flex justify-between gap-4">
                    <span className="text-emerald-400">Actual:</span>
                    <span className="font-mono font-medium text-white">
                      {formatCurrency(metricView === "revenue" ? adjustedSales[hoveredIdx].actualRevenue : adjustedSales[hoveredIdx].actualGP)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <span className="text-blue-400">{adjustedSales[hoveredIdx].actualRevenue > 0 ? "Target:" : "Projected Forecast:"}</span>
                  <span className="font-mono font-bold text-white">
                    {formatCurrency(metricView === "revenue" ? adjustedSales[hoveredIdx].forecastRevenue : adjustedSales[hoveredIdx].forecastGP)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Bar Chart Legend */}
          <div className="flex gap-4 justify-center text-[11px] text-slate-500 mt-2">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 bg-emerald-600 rounded-sm"></span>
              <span>NetSuite Closed Actuals</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 bg-blue-600 rounded-sm"></span>
              <span>Projected Pipeline ({scenarioModel})</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
