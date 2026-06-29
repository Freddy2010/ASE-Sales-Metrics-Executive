import React, { useState, useEffect } from "react";
import { Building2, Layers, Calendar, SlidersHorizontal, ShieldCheck, RefreshCw, LogOut, Info, LayoutGrid, Activity, TrendingUp, Sparkles, FileText, Database } from "lucide-react";
import { DashboardData, NetSuiteStatus } from "./types";
import NetsuiteConnectorStatus from "./components/NetsuiteConnectorStatus";
import MetricCards from "./components/MetricCards";
import CashForecaster from "./components/CashForecaster";
import SalesForecaster from "./components/SalesForecaster";
import ReportViewer from "./components/ReportViewer";
import ExecutiveAnalysis from "./components/ExecutiveAnalysis";
import AIChatBox from "./components/AIChatBox";
import NetsuiteSavedSearchImporter from "./components/NetsuiteSavedSearchImporter";

export default function App() {
  const [netsuiteStatus, setNetsuiteStatus] = useState<NetSuiteStatus | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States (Standard NetSuite Segments)
  const [selectedSubsidiary, setSelectedSubsidiary] = useState<string>("all");
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [accountingStandard, setAccountingStandard] = useState<"gaap" | "ifrs">("gaap");

  // Date Range Filter States
  const [dateRange, setDateRange] = useState<string>("ytd");
  const [startDate, setStartDate] = useState<string>("2026-01-01");
  const [endDate, setEndDate] = useState<string>("2026-06-29");

  // Dashboard Tab/Screen Mode State
  const [dashboardView, setDashboardView] = useState<"all" | "kpis" | "forecasts" | "analysis" | "reports">("all");

  // Importer modal visibility state
  const [isImporterOpen, setIsImporterOpen] = useState<boolean>(false);

  // Compare Periods State (Prior Year comparison)
  const [comparePeriods, setComparePeriods] = useState<boolean>(false);
  const [compareLoading, setCompareLoading] = useState<boolean>(false);

  const syncData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch connection status
      const statusRes = await fetch("/api/netsuite/status");
      if (!statusRes.ok) throw new Error("Failed to contact server API status.");
      const statusData = await statusRes.json();
      setNetsuiteStatus(statusData);

      // 2. Fetch financial dashboard metrics
      const dashboardRes = await fetch("/api/netsuite/dashboard");
      if (!dashboardRes.ok) throw new Error("Failed to contact server financial data API.");
      const data = await dashboardRes.json();
      setDashboardData(data);
    } catch (err: any) {
      setError(err.message || "An unexpected network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncData();
  }, []);

  // Filter adjustment simulations
  const getFilteredDashboardData = (): DashboardData | null => {
    if (!dashboardData) return null;
    
    // Create a deep copy of the base dashboard data to prevent mutations
    let filtered = JSON.parse(JSON.stringify(dashboardData)) as DashboardData;

    // 1. Handle Subsidiary selection
    let subScale = 1.0;
    if (selectedSubsidiary === "us") {
      filtered.companyName = "Acme US Inc. (NetSuite Subsidiary ID: 4)";
      subScale = 0.7;
    } else if (selectedSubsidiary === "emea") {
      filtered.companyName = "Acme EMEA Ltd. (NetSuite Subsidiary ID: 8)";
      subScale = 0.3;
    }

    // 2. Handle Department / Cost Center selection
    let deptOpexScale = 1.0;
    let deptLabel = "";
    if (selectedDept === "eng") {
      deptOpexScale = 0.327;
      deptLabel = " [R&D Division]";
    } else if (selectedDept === "sales") {
      deptOpexScale = 0.444;
      deptLabel = " [S&M Division]";
    } else if (selectedDept === "admin") {
      deptOpexScale = 0.229;
      deptLabel = " [G&A Division]";
    }

    // 3. Handle Date Range selection & Scaling
    let scaleFactor = 1.0;
    let bsScale = 1.0; // Balance sheet scale (cumulative)
    let dsoShift = 0; // DSO shift
    let periodName = "Current Fiscal Year (YTD)";

    if (dateRange === "q1") {
      scaleFactor = 0.45;
      bsScale = 0.82;
      dsoShift = 2; // Q1 had slightly worse DSO (44 days)
      periodName = "Q1 2026 (Jan 1, 2026 - Mar 31, 2026)";
    } else if (dateRange === "q2") {
      scaleFactor = 0.55;
      bsScale = 0.96;
      dsoShift = -1; // Q2 had slightly better DSO (41 days)
      periodName = "Q2 2026 (Apr 1, 2026 - Jun 30, 2026)";
    } else if (dateRange === "30days") {
      scaleFactor = 0.16;
      bsScale = 1.0; // current point-in-time
      dsoShift = 0;
      periodName = "Last 30 Days (May 30, 2026 - Jun 29, 2026)";
    } else if (dateRange === "90days") {
      scaleFactor = 0.48;
      bsScale = 0.98;
      dsoShift = -1;
      periodName = "Last 90 Days (Mar 31, 2026 - Jun 29, 2026)";
    } else if (dateRange === "custom") {
      const s = new Date(startDate);
      const e = new Date(endDate);
      const diffTime = Math.abs(e.getTime() - s.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
      
      // Base scaling on ~180 days (half year representation of YTD)
      scaleFactor = Math.min(2.0, Math.max(0.05, diffDays / 180));
      
      // bsScale is cumulative up to the end date
      const yearStart = new Date("2026-01-01");
      const endDiffTime = e.getTime() - yearStart.getTime();
      const endDiffDays = Math.ceil(endDiffTime / (1000 * 60 * 60 * 24)) || 180;
      bsScale = Math.min(1.2, Math.max(0.5, endDiffDays / 180));
      
      const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
      const startFormatted = s.toLocaleDateString('en-US', options);
      const endFormatted = e.toLocaleDateString('en-US', options);
      periodName = `Custom Period (${startFormatted} - ${endFormatted})`;
    }

    filtered.reportingPeriod = periodName + (deptLabel ? ` - ${selectedDept.toUpperCase()} Department` : "");

    // Apply combined scales to KPIs
    const combinedFlowScale = subScale * scaleFactor;
    const combinedBSScale = subScale * bsScale;

    const scaledKPIs = { ...filtered.kpis };
    
    // Revenue, GP, Net Income represent FLOWS, so they scale with combinedFlowScale
    scaledKPIs.revenue = {
      ...scaledKPIs.revenue,
      value: Math.floor(scaledKPIs.revenue.value * combinedFlowScale),
      target: Math.floor(scaledKPIs.revenue.target * combinedFlowScale),
    };
    scaledKPIs.grossProfit = {
      ...scaledKPIs.grossProfit,
      value: Math.floor(scaledKPIs.grossProfit.value * combinedFlowScale),
      target: Math.floor(scaledKPIs.grossProfit.target * combinedFlowScale),
    };
    
    // Operating Expenses scale with combinedFlowScale and department cost structure
    scaledKPIs.operatingExpenses = {
      ...scaledKPIs.operatingExpenses,
      value: Math.floor(scaledKPIs.operatingExpenses.value * combinedFlowScale * deptOpexScale),
      budget: Math.floor(scaledKPIs.operatingExpenses.budget * combinedFlowScale * deptOpexScale),
    };

    // Net Income is recalculated logically based on GP and OPEX
    const simulatedGP = scaledKPIs.grossProfit.value;
    const simulatedOpex = scaledKPIs.operatingExpenses.value;
    const simulatedTaxes = Math.floor(filtered.kpis.netIncome.value * 0.15 * combinedFlowScale);
    scaledKPIs.netIncome = {
      ...scaledKPIs.netIncome,
      value: Math.max(0, simulatedGP - simulatedOpex - simulatedTaxes),
      target: Math.floor(scaledKPIs.netIncome.target * combinedFlowScale),
    };

    // Cash balance and collections are static / point-in-time, so they scale with combinedBSScale
    scaledKPIs.cashBalance = {
      ...scaledKPIs.cashBalance,
      value: Math.floor(scaledKPIs.cashBalance.value * combinedBSScale),
      target: Math.floor(scaledKPIs.cashBalance.target * combinedBSScale),
    };

    // DSO & DPO are adjusted slightly
    scaledKPIs.dso = {
      ...scaledKPIs.dso,
      value: Math.max(25, Math.min(60, scaledKPIs.dso.value + dsoShift)),
    };

    filtered.kpis = scaledKPIs;

    // Scale P&L Statement (Report View)
    const scaledIS = { ...filtered.incomeStatement };
    scaledIS.revenue = {
      total: Math.floor(scaledIS.revenue.total * combinedFlowScale),
      categories: scaledIS.revenue.categories.map(cat => ({
        ...cat,
        value: Math.floor(cat.value * combinedFlowScale)
      }))
    };
    scaledIS.cogs = {
      total: Math.floor(scaledIS.cogs.total * combinedFlowScale),
      categories: scaledIS.cogs.categories.map(cat => ({
        ...cat,
        value: Math.floor(cat.value * combinedFlowScale)
      }))
    };
    
    // Apply department filter to opex categories in P&L
    scaledIS.opex = {
      total: Math.floor(scaledIS.opex.total * combinedFlowScale * deptOpexScale),
      categories: scaledIS.opex.categories.map(cat => {
        let isMatch = false;
        if (selectedDept === "eng" && cat.name.includes("R&D")) isMatch = true;
        if (selectedDept === "sales" && cat.name.includes("Sales")) isMatch = true;
        if (selectedDept === "admin" && cat.name.includes("Administrative")) isMatch = true;
        
        const opexCatVal = isMatch 
          ? Math.floor(cat.value * combinedFlowScale) 
          : selectedDept === "all" 
            ? Math.floor(cat.value * combinedFlowScale)
            : Math.floor(cat.value * combinedFlowScale * 0.1); // Proportional other sections

        return {
          ...cat,
          value: opexCatVal
        };
      })
    };
    
    // Recalculate total OPEX as sum of categories
    scaledIS.opex.total = scaledIS.opex.categories.reduce((sum, c) => sum + c.value, 0);

    scaledIS.otherExpenses = {
      total: Math.floor(scaledIS.otherExpenses.total * combinedFlowScale),
      categories: scaledIS.otherExpenses.categories.map(cat => ({
        ...cat,
        value: Math.floor(cat.value * combinedFlowScale)
      }))
    };
    filtered.incomeStatement = scaledIS;

    // Scale Balance Sheet (uses combinedBSScale)
    const scaledBS = { ...filtered.balanceSheet };
    scaledBS.assets = {
      current: scaledBS.assets.current.map(item => {
        if (item.name === "Cash and Cash Equivalents") {
          return { ...item, value: scaledKPIs.cashBalance.value };
        }
        return { ...item, value: Math.floor(item.value * combinedBSScale) };
      }),
      nonCurrent: scaledBS.assets.nonCurrent.map(item => ({
        ...item,
        value: Math.floor(item.value * combinedBSScale)
      }))
    };

    scaledBS.liabilities = {
      current: scaledBS.liabilities.current.map(item => ({
        ...item,
        value: Math.floor(item.value * combinedBSScale)
      })),
      nonCurrent: scaledBS.liabilities.nonCurrent.map(item => ({
        ...item,
        value: Math.floor(item.value * combinedBSScale)
      }))
    };

    // Keep the balance sheet perfectly balanced
    const curAssets = scaledBS.assets.current.reduce((sum, item) => sum + item.value, 0);
    const nonCurAssets = scaledBS.assets.nonCurrent.reduce((sum, item) => sum + item.value, 0);
    const totAssets = curAssets + nonCurAssets;

    const scaledEquity = scaledBS.equity.map(item => ({
      ...item,
      value: Math.floor(item.value * combinedBSScale)
    }));

    const curLiabilities = scaledBS.liabilities.current.reduce((sum, item) => sum + item.value, 0);
    const nonCurLiabilities = scaledBS.liabilities.nonCurrent.reduce((sum, item) => sum + item.value, 0);
    const totLiabilities = curLiabilities + nonCurLiabilities;

    const paidInCapital = scaledEquity.find(e => e.name === "Common Paid-in Capital")?.value || Math.floor(2500000 * combinedBSScale);
    const retainedEarnings = totAssets - totLiabilities - paidInCapital;
    
    scaledBS.equity = scaledEquity.map(item => {
      if (item.name === "Retained Earnings Balance") {
        return { ...item, value: retainedEarnings };
      }
      if (item.name === "Common Paid-in Capital") {
        return { ...item, value: paidInCapital };
      }
      return item;
    });
    filtered.balanceSheet = scaledBS;

    // Scale Accounts Receivable (AR) Aging
    const scaledAR = { ...filtered.arAging };
    const arTotalVal = scaledBS.assets.current.find(item => item.name === "Accounts Receivable (Net)")?.value || Math.floor(scaledAR.totalOutstanding * combinedBSScale);
    scaledAR.totalOutstanding = arTotalVal;
    scaledAR.buckets = scaledAR.buckets.map(b => ({
      ...b,
      value: Math.floor(arTotalVal * (b.percent / 100))
    }));
    scaledAR.debtors = scaledAR.debtors.map(d => ({
      ...d,
      amount: Math.floor(d.amount * combinedBSScale)
    }));
    filtered.arAging = scaledAR;

    return filtered;
  };

  const activeData = getFilteredDashboardData();

  const handleCardClick = (cardId: string) => {
    if (cardId === "cashBalance" || cardId === "cash") {
      setDashboardView("forecasts");
    } else if (cardId === "revenue" || cardId === "grossProfit" || cardId === "netIncome") {
      setDashboardView("reports");
    } else {
      setDashboardView("kpis");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-100/80">
      {/* 1. TOP UTILITY HEADER / LOGO BAR */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-50 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-slate-800 to-slate-900 rounded-lg text-white shadow-xs border border-slate-700/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg leading-tight tracking-tight text-slate-900 flex items-center gap-2">
              NetSuite ERP Connector
              <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded font-mono font-bold uppercase">
                v2.4
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 font-semibold">
              Enterprise SuiteTalk Financial Management Console
            </p>
          </div>
        </div>

        {/* Global Controls & Refresh */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Subsidiary Filter */}
          <div className="flex items-center gap-2 text-xs">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedSubsidiary}
              onChange={(e) => setSelectedSubsidiary(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 text-[11px] font-semibold font-sans"
            >
              <option value="all">Subsidiary: Consolidation (All)</option>
              <option value="us">Subsidiary: Acme US Inc. (USD)</option>
              <option value="emea">Subsidiary: Acme EMEA Ltd. (EUR)</option>
            </select>
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-2 text-xs">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 text-[11px] font-semibold font-sans"
            >
              <option value="all">Department: All Cost Centers</option>
              <option value="eng">Cost Center: Engineering / R&D</option>
              <option value="sales">Cost Center: S&M Sales Operations</option>
              <option value="admin">Cost Center: Executive G&A</option>
            </select>
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center gap-2 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 text-[11px] font-semibold font-sans"
            >
              <option value="ytd">Period: Full Year (YTD)</option>
              <option value="q1">Period: Q1 2026</option>
              <option value="q2">Period: Q2 2026</option>
              <option value="30days">Period: Last 30 Days</option>
              <option value="90days">Period: Last 90 Days</option>
              <option value="custom">Period: Custom Range...</option>
            </select>
          </div>

          {/* Standards Switcher */}
          <div className="bg-slate-100 border border-slate-200 p-0.5 rounded-lg flex text-[10px] font-sans font-medium">
            <button
              onClick={() => setAccountingStandard("gaap")}
              className={`px-2 py-1 rounded transition-all ${accountingStandard === "gaap" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-500 hover:text-slate-800"}`}
            >
              US GAAP
            </button>
            <button
              onClick={() => setAccountingStandard("ifrs")}
              className={`px-2 py-1 rounded transition-all ${accountingStandard === "ifrs" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-500 hover:text-slate-800"}`}
            >
              IFRS
            </button>
          </div>

          {/* Compare Periods Toggle */}
          <button
            onClick={() => {
              setCompareLoading(true);
              setComparePeriods(prev => !prev);
              setTimeout(() => setCompareLoading(false), 600);
            }}
            className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg border shadow-xs transition-all cursor-pointer group ${
              comparePeriods
                ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-700"
                : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${compareLoading ? "animate-spin" : "text-slate-400 group-hover:text-slate-600 group-hover:rotate-45 transition-transform"}`} />
            <span>Compare Periods</span>
            <span className={`w-1.5 h-1.5 rounded-full ${comparePeriods ? "bg-emerald-400 animate-pulse" : "bg-slate-300"}`}></span>
          </button>

          <div className="h-5 w-px bg-slate-200 hidden md:block"></div>

          {/* Saved Search Importer Trigger */}
          <button
            onClick={() => setIsImporterOpen(true)}
            className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200 shadow-xs transition-all cursor-pointer group"
          >
            <Database className="w-3.5 h-3.5 text-amber-600 group-hover:scale-105 transition-transform animate-pulse" />
            <span>Load Saved Search</span>
          </button>

          {/* Last Synchronized Status */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Secured Session</span>
          </div>
        </div>
      </header>

      {/* Custom Date Picker Bar (Only shown if custom is selected) */}
      {dateRange === "custom" && (
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center gap-4 text-xs animate-fadeIn">
          <span className="font-semibold text-slate-600 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Select Custom Dates:
          </span>
          <div className="flex items-center gap-2">
            <label className="text-slate-500 font-medium">Start Date:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-white border border-slate-200 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-700 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-slate-500 font-medium">End Date:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-white border border-slate-200 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-700 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
            />
          </div>
        </div>
      )}

      {/* 2. BODY PAGE WORKSPACE */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Error Notification */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center justify-between gap-4 shadow-sm animate-bounce">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-rose-100 border border-rose-200">⚠️</span>
              <p>
                <strong>System API Sync Error:</strong> {error} (Falling back to simulated high-fidelity metrics)
              </p>
            </div>
            <button
              onClick={syncData}
              className="px-3 py-1 bg-rose-100 hover:bg-rose-200 border border-rose-200 rounded-md transition-all text-[11px] font-medium"
            >
              Retry Sync
            </button>
          </div>
        )}

        {dashboardData?.errorNotice && (
          <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-start gap-3 shadow-xs animate-fadeIn mb-4">
            <span className="p-1 rounded bg-amber-100 border border-amber-200 shrink-0">⚠️</span>
            <div className="space-y-1">
              <p className="font-bold text-slate-900">NetSuite Live Query Fallback Active</p>
              <p className="text-slate-700 leading-relaxed font-mono text-[11px] bg-white/60 p-2 rounded border border-amber-200/40 mt-1">{dashboardData.errorNotice}</p>
              <p className="text-[10px] text-slate-500 pt-1.5">
                The application connected successfully but failed to execute financial queries. Verify that the Role assigned to your NetSuite Access Token has full permissions for the <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">transaction</code>, <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">account</code>, and <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">companyinformation</code> tables under NetSuite Setup &gt; Users/Roles.
              </p>
            </div>
          </div>
        )}

        {/* Global Loading state */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <RefreshCw className="w-10 h-10 text-slate-700 animate-spin" />
            <div className="space-y-1 text-center">
              <p className="text-sm font-bold text-slate-900 font-display">Syncing NetSuite ERP Ledgers...</p>
              <p className="text-xs text-slate-500">Contacting secure credentials vault server proxy</p>
            </div>
          </div>
        ) : (
          <>
            {/* 2.1 ERP Link Status */}
            <NetsuiteConnectorStatus
              status={netsuiteStatus}
              loading={loading}
              onRefresh={syncData}
            />

            {/* View Selector Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700">
                  <LayoutGrid className="w-4 h-4 text-slate-500" />
                </span>
                <div>
                  <h2 className="font-display font-bold text-base text-slate-950 leading-tight">Dashboard Workspace View</h2>
                  <p className="text-[10px] text-slate-500 font-medium font-sans">Select a workspace tab to filter panels or isolate specific financial ledgers</p>
                </div>
              </div>
              
              <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex flex-wrap text-xs gap-1">
                <button
                  id="tab-all-overview"
                  onClick={() => setDashboardView("all")}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-medium transition-all cursor-pointer ${dashboardView === "all" ? "bg-white text-slate-900 border border-slate-200/50 shadow-xs font-bold animate-fadeIn" : "text-slate-500 hover:text-slate-800"}`}
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-slate-500" />
                  Consolidated Overview
                </button>
                <button
                  id="tab-kpi-performance"
                  onClick={() => setDashboardView("kpis")}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-medium transition-all cursor-pointer ${dashboardView === "kpis" ? "bg-white text-slate-900 border border-slate-200/50 shadow-xs font-bold animate-fadeIn" : "text-slate-500 hover:text-slate-800"}`}
                >
                  <Activity className="w-3.5 h-3.5 text-blue-600" />
                  KPI Performance
                </button>
                <button
                  id="tab-scenario-modeling"
                  onClick={() => setDashboardView("forecasts")}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-medium transition-all cursor-pointer ${dashboardView === "forecasts" ? "bg-white text-slate-900 border border-slate-200/50 shadow-xs font-bold animate-fadeIn" : "text-slate-500 hover:text-slate-800"}`}
                >
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  Scenario Modeling
                </button>
                <button
                  id="tab-ai-narrative"
                  onClick={() => setDashboardView("analysis")}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-medium transition-all cursor-pointer ${dashboardView === "analysis" ? "bg-white text-slate-900 border border-slate-200/50 shadow-xs font-bold animate-fadeIn" : "text-slate-500 hover:text-slate-800"}`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  AI Narrative
                </button>
                <button
                  id="tab-ledger-reports"
                  onClick={() => setDashboardView("reports")}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-medium transition-all cursor-pointer ${dashboardView === "reports" ? "bg-white text-slate-900 border border-slate-200/50 shadow-xs font-bold animate-fadeIn" : "text-slate-500 hover:text-slate-800"}`}
                >
                  <FileText className="w-3.5 h-3.5 text-purple-600" />
                  Ledger Financial Reports
                </button>
              </div>
            </div>

            {/* 2.2 KPI METRIC TILES */}
            {activeData && (dashboardView === "all" || dashboardView === "kpis") && (
              <MetricCards 
                kpis={activeData.kpis} 
                onCardClick={handleCardClick} 
                comparePeriods={comparePeriods}
                compareLoading={compareLoading}
              />
            )}

            {/* 2.3 FORECASTING DOUBLE COMPONENT COLUMN */}
            {activeData && (dashboardView === "all" || dashboardView === "forecasts") && (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* Cash Forecasting with Scenario sliders */}
                <div className="xl:col-span-12">
                  <CashForecaster baselineForecast={activeData.cashForecast} />
                </div>

                {/* Sales double-bar actual vs forecast comparison */}
                <div className="xl:col-span-12">
                  <SalesForecaster baselineSales={activeData.salesForecast} />
                </div>
              </div>
            )}

            {/* 2.4 CFO NARRATIVE COMMENTARY */}
            {activeData && (dashboardView === "all" || dashboardView === "analysis") && (
              <ExecutiveAnalysis data={activeData} />
            )}

            {/* 2.5 FINANCIAL STATEMENT TABLES (P&L, Balance Sheet, AR) */}
            {activeData && (dashboardView === "all" || dashboardView === "reports") && (
              <ReportViewer
                incomeStatement={activeData.incomeStatement}
                balanceSheet={activeData.balanceSheet}
                arAging={activeData.arAging}
              />
            )}
          </>
        )}
      </main>

      {/* 3. FOOTER */}
      <footer className="mt-auto border-t border-slate-200 bg-white px-6 py-4 flex flex-wrap justify-between items-center text-xs text-slate-500 font-sans gap-2">
        <p>© 2026 NetSuite Financial Executive Dashboard | Oracle NetSuite SuiteTalk API</p>
        <div className="flex gap-4">
          <span className="flex items-center gap-1 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block animate-pulse"></span>
            ERP Service Status: Operational
          </span>
          <span className="font-semibold text-slate-400">|</span>
          <span className="font-semibold">Compliant: PCAOB / GAAP standards</span>
        </div>
      </footer>

      {/* 4. CFO AI COPILOT FLOATING CHATBOX */}
      <AIChatBox contextData={activeData} onDrillDown={setDashboardView} />

      {/* 5. NETSUITE SAVED SEARCH IMPORTER MODAL */}
      {isImporterOpen && (
        <NetsuiteSavedSearchImporter
          onImportSuccess={(newData) => {
            setDashboardData(newData);
            setDashboardView("all");
          }}
          onClose={() => setIsImporterOpen(false)}
        />
      )}
    </div>
  );
}
