import React, { useState, useRef, useEffect } from "react";
import { Sliders, TrendingUp, DollarSign, ShieldAlert, CheckCircle, Info } from "lucide-react";
import { CashForecastItem } from "../types";
import { formatCurrency } from "./MetricCards";

interface Props {
  baselineForecast: CashForecastItem[];
}

export default function CashForecaster({ baselineForecast }: Props) {
  // Interactive Scenarios States
  const [salesGrowth, setSalesGrowth] = useState<number>(0); // -20% to +20%
  const [arSpeed, setArSpeed] = useState<number>(0); // -15 days to +15 days (DSO effect)
  const [opexCut, setOpexCut] = useState<number>(0); // -10% to +15% (Opex savings)

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const height = 260;
  const padding = { top: 30, right: 40, bottom: 40, left: 60 };

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

  // Compute Adjusted Scenario Data
  const scenarioForecast = baselineForecast.map((item, idx) => {
    // 1. Sales Growth affects Cash In (e.g. 70% of Cash In is immediate sales cash receipts, affected by salesGrowth)
    const salesImpact = item.cashIn * 0.7 * (salesGrowth / 100);

    // 2. AR Collection Speed (DSO effect): positive value means slower collection, negative means faster collections
    // Slower collections shifts 10% of cash in to the next month, faster pulls 10% forward
    let arImpact = 0;
    if (arSpeed < 0) {
      // Faster collection: pull 12% cash-in forward
      arImpact = item.cashIn * 0.12 * Math.abs(arSpeed / 15);
    } else if (arSpeed > 0) {
      // Slower collection: push 12% cash-in out
      arImpact = -item.cashIn * 0.12 * (arSpeed / 15);
    }

    // 3. Opex Cuts affect Cash Out (80% of cash out is opex/purchases, reduced by opexCut percentage)
    const opexImpact = -item.cashOut * 0.8 * (opexCut / 100);

    const adjustedCashIn = Math.max(100000, item.cashIn + salesImpact + arImpact);
    const adjustedCashOut = Math.max(100000, item.cashOut + opexImpact);
    const adjustedNetFlow = adjustedCashIn - adjustedCashOut;

    return {
      period: item.period,
      cashIn: adjustedCashIn,
      cashOut: adjustedCashOut,
      netFlow: adjustedNetFlow,
    };
  });

  // Re-calculate the cash balance chain
  let currentBalance = baselineForecast[0].balance; // Starting point
  const recalculatedScenario = scenarioForecast.map((item, idx) => {
    if (idx > 0) {
      currentBalance = currentBalance + item.netFlow;
    }
    return {
      ...item,
      balance: currentBalance,
    };
  });

  // Calculate coordinates for SVG
  const allBalances = [
    ...baselineForecast.map((d) => d.balance),
    ...recalculatedScenario.map((d) => d.balance),
  ];
  const maxVal = Math.max(...allBalances) * 1.05;
  const minVal = Math.min(...allBalances) * 0.95;
  const valRange = maxVal - minVal;

  const getX = (index: number) => {
    return padding.left + (index / (baselineForecast.length - 1)) * (width - padding.left - padding.right);
  };

  const getY = (val: number) => {
    const scaleY = (height - padding.top - padding.bottom) / valRange;
    return height - padding.bottom - (val - minVal) * scaleY;
  };

  // SVG Line paths
  const baselinePath = baselineForecast
    .map((d, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(d.balance)}`)
    .join(" ");

  const scenarioPath = recalculatedScenario
    .map((d, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(d.balance)}`)
    .join(" ");

  // Calculations for KPI summaries
  const endingBaselineCash = baselineForecast[baselineForecast.length - 1].balance;
  const endingScenarioCash = recalculatedScenario[recalculatedScenario.length - 1].balance;
  const difference = endingScenarioCash - endingBaselineCash;

  // Monthly burn rate helper (approx average Cash Out in forecast)
  const avgMonthlyOutflow = baselineForecast.reduce((sum, item) => sum + item.cashOut, 0) / baselineForecast.length;
  const scenarioRunway = (endingScenarioCash / avgMonthlyOutflow).toFixed(1);
  const baselineRunway = (endingBaselineCash / avgMonthlyOutflow).toFixed(1);

  return (
    <div id="cash-forecaster-panel" className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-slate-100 text-slate-800 border border-slate-200">
              <TrendingUp className="w-4 h-4" />
            </span>
            <h3 className="font-display font-bold text-lg text-slate-900">6-Month Cash Flow & Runway Forecasting</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Simulate cash liquidity curves by testing different commercial and collections scenarios.
          </p>
        </div>

        {/* Dynamic Warning/Safety Notice */}
        <div className="flex items-center gap-2">
          {parseFloat(scenarioRunway) < 4.0 ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold font-sans">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              <span>Liquidity Warning: Low Cash Runway</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold font-sans">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Liquidity Forecast: Healthy Reserves</span>
            </div>
          )}
        </div>
      </div>

      {/* Grid: Charts + Sliders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Scenario Controls */}
        <div className="lg:col-span-4 bg-slate-50 border border-slate-200/60 rounded-xl p-5 space-y-6">
          <div className="flex items-center gap-1.5 border-b border-slate-200/80 pb-3">
            <Sliders className="w-4 h-4 text-slate-800" />
            <h4 className="font-display font-semibold text-sm text-slate-900">Scenario Variables</h4>
          </div>

          {/* Slider 1: Sales Growth */}
          <div>
            <div className="flex justify-between text-xs font-sans mb-1.5 font-medium">
              <span className="text-slate-600">Net Sales growth rate</span>
              <span className={`font-mono font-bold ${salesGrowth > 0 ? "text-emerald-700" : salesGrowth < 0 ? "text-rose-700" : "text-slate-500"}`}>
                {salesGrowth > 0 ? `+${salesGrowth}%` : `${salesGrowth}%`}
              </span>
            </div>
            <input
              type="range"
              min="-20"
              max="20"
              value={salesGrowth}
              onChange={(e) => setSalesGrowth(parseInt(e.target.value))}
              className="w-full accent-slate-900 bg-slate-200 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-medium font-sans mt-1">
              <span>Recession (-20%)</span>
              <span>Baseline</span>
              <span>Expansive (+20%)</span>
            </div>
          </div>

          {/* Slider 2: AR Speed */}
          <div>
            <div className="flex justify-between text-xs font-sans mb-1.5 font-medium">
              <span className="text-slate-600">AR Collection cycle (DSO)</span>
              <span className={`font-mono font-bold ${arSpeed < 0 ? "text-emerald-700" : arSpeed > 0 ? "text-rose-700" : "text-slate-500"}`}>
                {arSpeed === 0 ? "No Change" : arSpeed < 0 ? `Fast-track (${Math.abs(arSpeed)} days)` : `Delayed (+${arSpeed} days)`}
              </span>
            </div>
            <input
              type="range"
              min="-15"
              max="15"
              value={arSpeed}
              onChange={(e) => setArSpeed(parseInt(e.target.value))}
              className="w-full accent-slate-900 bg-slate-200 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-medium font-sans mt-1">
              <span>Collect Fast (-15d)</span>
              <span>Standard</span>
              <span>Late Payments (+15d)</span>
            </div>
          </div>

          {/* Slider 3: OPEX Reduction */}
          <div>
            <div className="flex justify-between text-xs font-sans mb-1.5 font-medium">
              <span className="text-slate-600">OPEX expense scaling</span>
              <span className={`font-mono font-bold ${opexCut > 0 ? "text-emerald-700" : opexCut < 0 ? "text-rose-700" : "text-slate-500"}`}>
                {opexCut > 0 ? `Reduced OPEX (${opexCut}%)` : opexCut < 0 ? `Increased OPEX (${Math.abs(opexCut)}%)` : "No Change"}
              </span>
            </div>
            <input
              type="range"
              min="-10"
              max="15"
              value={opexCut}
              onChange={(e) => setOpexCut(parseInt(e.target.value))}
              className="w-full accent-slate-900 bg-slate-200 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-medium font-sans mt-1">
              <span>Expansion (+10%)</span>
              <span>Baseline</span>
              <span>Optimization (-15%)</span>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="pt-4 border-t border-slate-200 space-y-2 text-xs font-sans">
            <div className="flex justify-between font-medium">
              <span className="text-slate-500">Baseline Dec Cash</span>
              <span className="text-slate-700 font-mono">{formatCurrency(endingBaselineCash)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-slate-500">Scenario Dec Cash</span>
              <span className="text-slate-900 font-mono font-bold">{formatCurrency(endingScenarioCash)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <span className="text-slate-500 font-medium">Net Scenario Delta</span>
              <span className={`font-mono font-bold ${difference >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                {difference >= 0 ? `+${formatCurrency(difference)}` : `-${formatCurrency(Math.abs(difference))}`}
              </span>
            </div>
          </div>
        </div>

        {/* Chart View */}
        <div className="lg:col-span-8 flex flex-col justify-between" ref={containerRef}>
          <div className="flex justify-between items-center mb-3">
            <div className="flex gap-4 text-xs font-sans">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-slate-400 inline-block rounded-full"></span>
                <span className="text-slate-500 font-medium">Baseline Cash Flow</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 border-t-2 border-dashed border-blue-600 inline-block"></span>
                <span className="text-slate-800 font-bold">Scenario Forecast</span>
              </div>
            </div>

            <div className="text-xs font-sans flex gap-3 text-slate-500">
              <span>Avg Burn: <strong className="text-slate-800 font-mono">{formatCurrency(avgMonthlyOutflow)}</strong>/mo</span>
            </div>
          </div>

          {/* Custom SVG Line Chart */}
          <div className="relative bg-slate-50/50 border border-slate-150 rounded-xl p-2">
            <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
              <defs>
                <linearGradient id="baselineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="scenarioGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
                const val = maxVal - p * valRange;
                const currY = padding.top + p * (height - padding.top - padding.bottom);
                return (
                  <g key={idx}>
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

              {/* X-Axis labels */}
              {baselineForecast.map((d, i) => {
                const currX = getX(i);
                return (
                  <text
                    key={i}
                    x={currX}
                    y={height - padding.bottom + 20}
                    fill="#64748b"
                    fontSize="10"
                    fontWeight="semibold"
                    textAnchor="middle"
                    fontFamily="sans-serif"
                  >
                    {d.period}
                  </text>
                );
              })}

              {/* Shaded Area Fills */}
              <path
                d={`${baselinePath} L ${getX(baselineForecast.length - 1)} ${height - padding.bottom} L ${getX(0)} ${height - padding.bottom} Z`}
                fill="url(#baselineGrad)"
              />
              <path
                d={`${scenarioPath} L ${getX(recalculatedScenario.length - 1)} ${height - padding.bottom} L ${getX(0)} ${height - padding.bottom} Z`}
                fill="url(#scenarioGrad)"
              />

              {/* Chart Lines */}
              <path
                d={baselinePath}
                fill="none"
                stroke="#94a3b8"
                strokeWidth="2"
                strokeOpacity="0.8"
              />
              <path
                d={scenarioPath}
                fill="none"
                stroke="#2563eb"
                strokeWidth="3"
                strokeDasharray="4,4"
              />

              {/* Interactive Dots & Hover Guides */}
              {baselineForecast.map((d, i) => {
                const currX = getX(i);
                const baselineY = getY(d.balance);
                const scenarioY = getY(recalculatedScenario[i].balance);

                const isHovered = hoveredIndex === i;

                return (
                  <g key={i}>
                    {isHovered && (
                      <line
                        x1={currX}
                        y1={padding.top}
                        x2={currX}
                        y2={height - padding.bottom}
                        stroke="#94a3b8"
                        strokeWidth="1"
                        strokeDasharray="2,2"
                      />
                    )}

                    {/* Baseline Dot */}
                    <circle
                      cx={currX}
                      cy={baselineY}
                      r={isHovered ? 6 : 4}
                      fill="#ffffff"
                      stroke="#94a3b8"
                      strokeWidth="2.5"
                    />

                    {/* Scenario Dot */}
                    <circle
                      cx={currX}
                      cy={scenarioY}
                      r={isHovered ? 7 : 5}
                      fill="#ffffff"
                      stroke="#2563eb"
                      strokeWidth="2.5"
                    />

                    {/* Full Height Hover trigger bar */}
                    <rect
                      x={currX - (width / baselineForecast.length) / 2}
                      y={0}
                      width={width / baselineForecast.length}
                      height={height}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredIndex(i)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Custom Interactive Tooltip */}
            {hoveredIndex !== null && (
              <div
                className="absolute top-2 bg-slate-900 text-slate-100 rounded-lg p-3 text-xs shadow-md border border-slate-800 pointer-events-none space-y-1.5"
                style={{
                  left: `${Math.min(width - 190, Math.max(70, getX(hoveredIndex) - 90))}px`,
                }}
              >
                <div className="font-display font-bold text-white pb-1 border-b border-slate-800">
                  {baselineForecast[hoveredIndex].period} Forecast
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">Baseline Cash:</span>
                  <span className="font-mono text-slate-300 font-medium">
                    {formatCurrency(baselineForecast[hoveredIndex].balance)}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">Scenario Cash:</span>
                  <span className="font-mono text-blue-400 font-bold">
                    {formatCurrency(recalculatedScenario[hoveredIndex].balance)}
                  </span>
                </div>
                <div className="flex justify-between gap-4 pt-1 border-t border-slate-800">
                  <span className="text-slate-400">Monthly In/Out:</span>
                  <span className="font-mono text-slate-300">
                    +{formatCurrency(recalculatedScenario[hoveredIndex].cashIn)} / -{formatCurrency(recalculatedScenario[hoveredIndex].cashOut)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Runway Overview Cards */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Baseline Runway</p>
                <p className="text-lg font-display font-bold text-slate-800 mt-0.5">{baselineRunway} Months</p>
              </div>
              <span className="w-1.5 h-6 bg-slate-300 rounded-full"></span>
            </div>

            <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-[10px] text-blue-700 uppercase tracking-wider font-semibold">Scenario Runway</p>
                <p className="text-lg font-display font-bold text-blue-700 mt-0.5">{scenarioRunway} Months</p>
              </div>
              <span className={`w-1.5 h-6 rounded-full ${parseFloat(scenarioRunway) >= 6.0 ? "bg-emerald-500" : parseFloat(scenarioRunway) >= 4.0 ? "bg-amber-500" : "bg-rose-500"}`}></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
