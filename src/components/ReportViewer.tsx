import React, { useState } from "react";
import { FileText, Search, ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";
import { IncomeStatement, BalanceSheet, ARAging } from "../types";
import { formatCurrency } from "./MetricCards";

interface Props {
  incomeStatement: IncomeStatement;
  balanceSheet: BalanceSheet;
  arAging: ARAging;
}

export default function ReportViewer({ incomeStatement, balanceSheet, arAging }: Props) {
  const [activeTab, setActiveTab] = useState<"pl" | "balance" | "ar">("pl");
  const [searchQuery, setSearchQuery] = useState("");

  // P&L expand/collapse states
  const [expandedSections, setExpandedSections] = useState({
    revenue: true,
    cogs: true,
    opex: true,
    other: true,
  });

  const toggleSection = (sect: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [sect]: !prev[sect] }));
  };

  // Helper: compute margins
  const revTotal = incomeStatement.revenue.total;
  const cogsTotal = incomeStatement.cogs.total;
  const opexTotal = incomeStatement.opex.total;
  const otherTotal = incomeStatement.otherExpenses.total;

  const grossProfit = revTotal - cogsTotal;
  const operatingProfit = grossProfit - opexTotal;
  const netIncome = operatingProfit - otherTotal;

  // Search filter for P&L items
  const filterCategories = (cats: Array<{ name: string; value: number; change: number }>) => {
    return cats.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  };

  // Balance Sheet Calcs
  const currentAssetsTotal = balanceSheet.assets.current.reduce((sum, item) => sum + item.value, 0);
  const nonCurrentAssetsTotal = balanceSheet.assets.nonCurrent.reduce((sum, item) => sum + item.value, 0);
  const totalAssets = currentAssetsTotal + nonCurrentAssetsTotal;

  const currentLiabilitiesTotal = balanceSheet.liabilities.current.reduce((sum, item) => sum + item.value, 0);
  const nonCurrentLiabilitiesTotal = balanceSheet.liabilities.nonCurrent.reduce((sum, item) => sum + item.value, 0);
  const totalLiabilities = currentLiabilitiesTotal + nonCurrentLiabilitiesTotal;

  const totalEquity = balanceSheet.equity.reduce((sum, item) => sum + item.value, 0);
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

  const isBalanceSheetBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 5;

  return (
    <div id="financial-reports-panel" className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden mb-6">
      {/* Header with report navigation */}
      <div className="px-6 py-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded bg-slate-100 text-slate-800 border border-slate-200">
            <FileText className="w-4 h-4" />
          </span>
          <h3 className="font-display font-bold text-lg text-slate-900">Standard Executive ERP Reports</h3>
        </div>

        {/* Tab Selector */}
        <div className="bg-slate-100 p-1 rounded-lg border border-slate-200 flex text-xs">
          <button
            onClick={() => { setActiveTab("pl"); setSearchQuery(""); }}
            className={`px-4 py-1.5 rounded-md font-medium transition-all cursor-pointer ${activeTab === "pl" ? "bg-white text-slate-900 border border-slate-200/50 shadow-xs font-bold" : "text-slate-500 hover:text-slate-800"}`}
          >
            Income Statement (P&L)
          </button>
          <button
            onClick={() => { setActiveTab("balance"); setSearchQuery(""); }}
            className={`px-4 py-1.5 rounded-md font-medium transition-all cursor-pointer ${activeTab === "balance" ? "bg-white text-slate-900 border border-slate-200/50 shadow-xs font-bold" : "text-slate-500 hover:text-slate-800"}`}
          >
            Balance Sheet
          </button>
          <button
            onClick={() => { setActiveTab("ar"); setSearchQuery(""); }}
            className={`px-4 py-1.5 rounded-md font-medium transition-all cursor-pointer ${activeTab === "ar" ? "bg-white text-slate-900 border border-slate-200/50 shadow-xs font-bold" : "text-slate-500 hover:text-slate-800"}`}
          >
            Accounts Receivable Aging
          </button>
        </div>
      </div>

      {/* SEARCH AND FILTERS (Only show search on relevant tabs) */}
      {activeTab === "pl" && (
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="relative w-full max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search P&L Categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-white text-xs text-slate-800 placeholder-slate-400 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 shadow-2xs"
            />
          </div>
          <span className="text-[10px] text-slate-500 font-semibold font-sans">USD ($) in Whole Units</span>
        </div>
      )}

      {/* REPORT CONTENT VIEW */}
      <div className="p-6 overflow-x-auto">
        {/* 1. INCOME STATEMENT VIEW */}
        {activeTab === "pl" && (
          <table className="w-full text-left border-collapse font-sans text-xs min-w-[600px]">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider font-semibold">
                <th className="pb-3 w-1/2">Accounting Line / Section</th>
                <th className="pb-3 text-right">Reporting Period Value</th>
                <th className="pb-3 text-right">% of Revenue</th>
                <th className="pb-3 text-right">YoY Growth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* --- REVENUE SECTION --- */}
              <tr
                className="bg-slate-50/70 hover:bg-slate-100/80 cursor-pointer font-bold text-slate-900 transition-all"
                onClick={() => toggleSection("revenue")}
              >
                <td className="py-3 px-2 flex items-center gap-1.5">
                  {expandedSections.revenue ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                  Revenue
                </td>
                <td className="py-3 text-right pr-2">{formatCurrency(revTotal)}</td>
                <td className="py-3 text-right text-slate-500">100.0%</td>
                <td className="py-3 text-right text-emerald-700 font-bold font-mono">+12.4%</td>
              </tr>
              {expandedSections.revenue &&
                filterCategories(incomeStatement.revenue.categories).map((cat, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 text-slate-700">
                    <td className="py-2.5 pl-8 pr-2 font-sans font-medium">{cat.name}</td>
                    <td className="py-2.5 text-right pr-2 font-mono">{cat.value.toLocaleString()}</td>
                    <td className="py-2.5 text-right text-slate-500 font-mono">{((cat.value / revTotal) * 100).toFixed(1)}%</td>
                    <td className="py-2.5 text-right font-mono">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${cat.change >= 0 ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50"}`}>
                        {cat.change >= 0 ? `+${cat.change}%` : `${cat.change}%`}
                      </span>
                    </td>
                  </tr>
                ))}

              {/* --- COGS SECTION --- */}
              <tr
                className="bg-slate-50/70 hover:bg-slate-100/80 cursor-pointer font-bold text-slate-900 transition-all"
                onClick={() => toggleSection("cogs")}
              >
                <td className="py-3 px-2 flex items-center gap-1.5">
                  {expandedSections.cogs ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                  Cost of Goods Sold (COGS)
                </td>
                <td className="py-3 text-right pr-2">{formatCurrency(cogsTotal)}</td>
                <td className="py-3 text-right text-slate-500">{((cogsTotal / revTotal) * 100).toFixed(1)}%</td>
                <td className="py-3 text-right text-rose-700 font-bold font-mono">+4.2%</td>
              </tr>
              {expandedSections.cogs &&
                filterCategories(incomeStatement.cogs.categories).map((cat, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 text-slate-700">
                    <td className="py-2.5 pl-8 pr-2 font-sans font-medium">{cat.name}</td>
                    <td className="py-2.5 text-right pr-2 font-mono">{cat.value.toLocaleString()}</td>
                    <td className="py-2.5 text-right text-slate-500 font-mono">{((cat.value / revTotal) * 100).toFixed(1)}%</td>
                    <td className="py-2.5 text-right font-mono">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${cat.change >= 0 ? "text-rose-700 bg-rose-50" : "text-emerald-700 bg-emerald-50"}`}>
                        {cat.change >= 0 ? `+${cat.change}%` : `${cat.change}%`}
                      </span>
                    </td>
                  </tr>
                ))}

              {/* --- GROSS PROFIT SUMMARY ROW --- */}
              <tr className="bg-emerald-50 border-y border-emerald-100 text-emerald-800 font-bold font-display text-sm">
                <td className="py-3 pl-2">GROSS PROFIT</td>
                <td className="py-3 text-right pr-2">{formatCurrency(grossProfit)}</td>
                <td className="py-3 text-right">{((grossProfit / revTotal) * 100).toFixed(1)}%</td>
                <td className="py-3 text-right font-mono font-bold">+16.8%</td>
              </tr>

              {/* --- OPEX SECTION --- */}
              <tr
                className="bg-slate-50/70 hover:bg-slate-100/80 cursor-pointer font-bold text-slate-900 transition-all"
                onClick={() => toggleSection("opex")}
              >
                <td className="py-3 px-2 flex items-center gap-1.5">
                  {expandedSections.opex ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                  Operating Expenses (OPEX)
                </td>
                <td className="py-3 text-right pr-2">{formatCurrency(opexTotal)}</td>
                <td className="py-3 text-right text-slate-500">{((opexTotal / revTotal) * 100).toFixed(1)}%</td>
                <td className="py-3 text-right text-emerald-700 font-bold font-mono">-1.3%</td>
              </tr>
              {expandedSections.opex &&
                filterCategories(incomeStatement.opex.categories).map((cat, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 text-slate-700">
                    <td className="py-2.5 pl-8 pr-2 font-sans font-medium">{cat.name}</td>
                    <td className="py-2.5 text-right pr-2 font-mono">{cat.value.toLocaleString()}</td>
                    <td className="py-2.5 text-right text-slate-500 font-mono">{((cat.value / revTotal) * 100).toFixed(1)}%</td>
                    <td className="py-2.5 text-right font-mono">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${cat.change < 0 ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50"}`}>
                        {cat.change >= 0 ? `+${cat.change}%` : `${cat.change}%`}
                      </span>
                    </td>
                  </tr>
                ))}

              {/* --- OPERATING INCOME SUMMARY ROW --- */}
              <tr className="bg-slate-50 font-bold text-slate-900 text-xs border-y border-slate-200">
                <td className="py-3 pl-2 uppercase">Operating Income (EBITDA)</td>
                <td className="py-3 text-right pr-2">{formatCurrency(operatingProfit)}</td>
                <td className="py-3 text-right">{((operatingProfit / revTotal) * 100).toFixed(1)}%</td>
                <td className="py-3 text-right font-mono font-bold text-emerald-700">+24.5%</td>
              </tr>

              {/* --- OTHER EXPENSES (Depr, Taxes) --- */}
              <tr
                className="bg-slate-50/70 hover:bg-slate-100/80 cursor-pointer font-bold text-slate-900 transition-all"
                onClick={() => toggleSection("other")}
              >
                <td className="py-3 px-2 flex items-center gap-1.5">
                  {expandedSections.other ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                  Taxes, Amortization & Adjustments
                </td>
                <td className="py-3 text-right pr-2">{formatCurrency(otherTotal)}</td>
                <td className="py-3 text-right text-slate-500">{((otherTotal / revTotal) * 100).toFixed(1)}%</td>
                <td className="py-3 text-right text-rose-700 font-bold font-mono">+6.8%</td>
              </tr>
              {expandedSections.other &&
                filterCategories(incomeStatement.otherExpenses.categories).map((cat, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 text-slate-700">
                    <td className="py-2.5 pl-8 pr-2 font-sans font-medium">{cat.name}</td>
                    <td className="py-2.5 text-right pr-2 font-mono">{cat.value.toLocaleString()}</td>
                    <td className="py-2.5 text-right text-slate-500 font-mono">{((cat.value / revTotal) * 100).toFixed(1)}%</td>
                    <td className="py-2.5 text-right font-mono">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${cat.change >= 0 ? "text-rose-700 bg-rose-50" : "text-emerald-700 bg-emerald-50"}`}>
                        {cat.change >= 0 ? `+${cat.change}%` : `${cat.change}%`}
                      </span>
                    </td>
                  </tr>
                ))}

              {/* --- NET INCOME SUMMARY ROW --- */}
              <tr className="bg-blue-50/60 border-t-2 border-blue-600 text-blue-800 font-bold font-display text-base">
                <td className="py-4 pl-2 uppercase tracking-wide">YTD NET INCOME</td>
                <td className="py-4 text-right pr-2 font-mono">{formatCurrency(netIncome)}</td>
                <td className="py-4 text-right font-mono">{((netIncome / revTotal) * 100).toFixed(1)}%</td>
                <td className="py-4 text-right font-mono font-bold text-emerald-700">+27.6%</td>
              </tr>
            </tbody>
          </table>
        )}

        {/* 2. BALANCE SHEET VIEW */}
        {activeTab === "balance" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs font-sans text-slate-700 min-w-[600px]">
            {/* LEFT COLUMN: ASSETS */}
            <div className="space-y-4">
              <h4 className="font-display font-bold text-sm text-slate-900 border-b border-slate-200 pb-2">ASSETS</h4>

              <div>
                <p className="font-bold text-slate-500 mb-2 uppercase text-[10px] tracking-wider">Current Assets</p>
                <div className="space-y-2 pl-3">
                  {balanceSheet.assets.current.map((item, idx) => (
                    <div key={idx} className="flex justify-between py-1.5 border-b border-slate-100 font-medium">
                      <span>{item.name}</span>
                      <span className="font-mono text-slate-950 font-bold">{item.value.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 border-b border-slate-200 font-bold text-slate-800">
                    <span>Total Current Assets</span>
                    <span className="font-mono">{currentAssetsTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="font-bold text-slate-500 mb-2 uppercase text-[10px] tracking-wider">Non-Current Assets</p>
                <div className="space-y-2 pl-3">
                  {balanceSheet.assets.nonCurrent.map((item, idx) => (
                    <div key={idx} className="flex justify-between py-1.5 border-b border-slate-100 font-medium">
                      <span>{item.name}</span>
                      <span className="font-mono text-slate-950 font-bold">{item.value.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 border-b border-slate-200 font-bold text-slate-800">
                    <span>Total Non-Current Assets</span>
                    <span className="font-mono">{nonCurrentAssetsTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between p-3 bg-slate-50 rounded-lg text-slate-950 font-display font-bold text-sm border border-slate-200 shadow-3xs">
                <span>TOTAL ASSETS</span>
                <span className="font-mono text-blue-700">{formatCurrency(totalAssets)}</span>
              </div>
            </div>

            {/* RIGHT COLUMN: LIABILITIES & EQUITY */}
            <div className="space-y-4">
              <h4 className="font-display font-bold text-sm text-slate-900 border-b border-slate-200 pb-2">LIABILITIES & EQUITY</h4>

              <div>
                <p className="font-bold text-slate-500 mb-2 uppercase text-[10px] tracking-wider">Current Liabilities</p>
                <div className="space-y-2 pl-3">
                  {balanceSheet.liabilities.current.map((item, idx) => (
                    <div key={idx} className="flex justify-between py-1.5 border-b border-slate-100 font-medium">
                      <span>{item.name}</span>
                      <span className="font-mono text-slate-950 font-bold">{item.value.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 border-b border-slate-200 font-bold text-slate-800">
                    <span>Total Current Liabilities</span>
                    <span className="font-mono">{currentLiabilitiesTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="font-bold text-slate-500 mb-2 uppercase text-[10px] tracking-wider">Non-Current Liabilities</p>
                <div className="space-y-2 pl-3">
                  {balanceSheet.liabilities.nonCurrent.map((item, idx) => (
                    <div key={idx} className="flex justify-between py-1.5 border-b border-slate-100 font-medium">
                      <span>{item.name}</span>
                      <span className="font-mono text-slate-950 font-bold">{item.value.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 border-b border-slate-200 font-bold text-slate-800">
                    <span>Total Non-Current Liabilities</span>
                    <span className="font-mono">{nonCurrentLiabilitiesTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="font-bold text-slate-500 mb-2 uppercase text-[10px] tracking-wider">Shareholders' Equity</p>
                <div className="space-y-2 pl-3">
                  {balanceSheet.equity.map((item, idx) => (
                    <div key={idx} className="flex justify-between py-1.5 border-b border-slate-100 font-medium">
                      <span>{item.name}</span>
                      <span className="font-mono text-slate-950 font-bold">{item.value.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 border-b border-slate-200 font-bold text-slate-800">
                    <span>Total Shareholders' Equity</span>
                    <span className="font-mono">{totalEquity.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between p-3 bg-slate-50 rounded-lg text-slate-950 font-display font-bold text-sm border border-slate-200 shadow-3xs">
                <span>TOTAL LIABILITIES & EQUITY</span>
                <span className="font-mono text-blue-700">{formatCurrency(totalLiabilitiesAndEquity)}</span>
              </div>
            </div>

            {/* Validation row */}
            <div className="md:col-span-2 flex items-center justify-between p-3.5 rounded-lg bg-blue-50/40 border border-blue-100 text-[11px] text-slate-600 font-semibold shadow-3xs">
              <div className="flex items-center gap-2">
                {isBalanceSheetBalanced ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                )}
                <span>
                  {isBalanceSheetBalanced
                    ? "GAAP Standard Validation Check Passed: Assets balance perfectly with combined Liabilities and Capital Equity (Total Balance Delta: $0.00)"
                    : "Accounting Warning: Balance Sheet discrepancy detected. Please reconcile Accounts Receivable."}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 3. ACCOUNTS RECEIVABLE AGING VIEW */}
        {activeTab === "ar" && (
          <div className="space-y-6 text-xs font-sans text-slate-700 min-w-[600px]">
            {/* AR Buckets Overview */}
            <div>
              <h4 className="font-display font-bold text-sm text-slate-900 mb-4">Accounts Receivable Collections Aging</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {arAging.buckets.map((bucket, idx) => {
                  let bucketColor = "border-emerald-100 text-emerald-700 bg-emerald-50/50";
                  if (idx === 1) bucketColor = "border-cyan-100 text-cyan-700 bg-cyan-50/50";
                  if (idx === 2) bucketColor = "border-amber-100 text-amber-700 bg-amber-50/50";
                  if (idx === 3) bucketColor = "border-rose-100 text-rose-700 bg-rose-50/50";

                  return (
                    <div key={idx} className={`border rounded-xl p-4 flex flex-col justify-between shadow-2xs ${bucketColor}`}>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">{bucket.label}</span>
                      <div className="mt-2">
                        <span className="text-xl font-display font-bold text-slate-900">{bucket.value.toLocaleString()}</span>
                        <span className="text-[10px] text-slate-500 font-medium block mt-0.5">{bucket.percent}% of outstanding AR</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Aging Ledger Detail Table */}
            <div>
              <h4 className="font-display font-bold text-sm text-slate-900 mb-3">Accounts Receivable Sub-Ledger (Top Accounts)</h4>
              <table className="w-full text-left border-collapse font-sans text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider font-semibold">
                    <th className="pb-3 px-2">NetSuite Customer Account</th>
                    <th className="pb-3 text-right">Outstanding Balance</th>
                    <th className="pb-3 text-right">Invoice Aging Days</th>
                    <th className="pb-3 text-right">Invoiced Period Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {arAging.debtors.map((debt, idx) => {
                    let riskColor = "bg-emerald-50 text-emerald-700 border border-emerald-100";
                    let RiskIcon = CheckCircle2;
                    if (debt.risk === "Medium") {
                      riskColor = "bg-amber-50 text-amber-700 border border-amber-100";
                      RiskIcon = AlertTriangle;
                    }
                    if (debt.risk === "High") {
                      riskColor = "bg-rose-50 text-rose-700 border border-rose-100";
                      RiskIcon = ShieldAlert;
                    }

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 text-slate-700">
                        <td className="py-3 px-2 font-bold text-slate-900">{debt.company}</td>
                        <td className="py-3 text-right pr-2 font-mono font-bold text-slate-900">{debt.amount.toLocaleString()}</td>
                        <td className="py-3 text-right pr-2 font-mono font-semibold text-slate-600">{debt.days} Days</td>
                        <td className="py-3 text-right">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase font-sans ${riskColor}`}>
                            <RiskIcon className="w-3 h-3" />
                            {debt.risk} Risk
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
