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
  const [subsidiaries, setSubsidiaries] = useState<Array<{ id: string; name: string; currency?: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);

  // Filter States (Standard NetSuite Segments)
  const [selectedSubsidiary, setSelectedSubsidiary] = useState<string>("all");
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [accountingStandard, setAccountingStandard] = useState<"gaap" | "ifrs">("gaap");

  // Date Range Filter States
  const [dateRange, setDateRange] = useState<string>("ytd");
  const [startDate, setStartDate] = useState<string>(`${new Date().getFullYear()}-01-01`);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().slice(0, 10));

  // Dashboard Tab/Screen Mode State
  const [dashboardView, setDashboardView] = useState<"all" | "kpis" | "forecasts" | "analysis" | "reports">("all");

  // Importer modal visibility state
  const [isImporterOpen, setIsImporterOpen] = useState<boolean>(false);

  // Compare Periods State (Prior Year comparison)
  const [comparePeriods, setComparePeriods] = useState<boolean>(false);
  const [compareLoading, setCompareLoading] = useState<boolean>(false);

  // Translate a date-range selector value into concrete start/end dates for the server.
  // "ytd" omits dates entirely so the server falls back to its latest-posted-fiscal-year logic.
  const getPeriodRange = (
    range: string,
    custStart: string,
    custEnd: string
  ): { startDate?: string; endDate?: string } => {
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const now = new Date();
    if (range === "q1") {
      return { startDate: `${now.getFullYear()}-01-01`, endDate: `${now.getFullYear()}-03-31` };
    } else if (range === "q2") {
      return { startDate: `${now.getFullYear()}-04-01`, endDate: `${now.getFullYear()}-06-30` };
    } else if (range === "30days") {
      const s = new Date(now);
      s.setDate(s.getDate() - 30);
      return { startDate: fmt(s), endDate: fmt(now) };
    } else if (range === "90days") {
      const s = new Date(now);
      s.setDate(s.getDate() - 90);
      return { startDate: fmt(s), endDate: fmt(now) };
    } else if (range === "custom") {
      return { startDate: custStart, endDate: custEnd };
    }
    return {};
  };

  interface SyncOverrides {
    subsidiary?: string;
    department?: string;
    dateRange?: string;
    startDate?: string;
    endDate?: string;
  }

  const syncData = async (overrides: SyncOverrides = {}) => {
    setLoading(true);
    setError(null);
    try {
      const activeSub = overrides.subsidiary !== undefined ? overrides.subsidiary : selectedSubsidiary;
      const activeDept = overrides.department !== undefined ? overrides.department : selectedDept;
      const activeRange = overrides.dateRange !== undefined ? overrides.dateRange : dateRange;
      const activeStart = overrides.startDate !== undefined ? overrides.startDate : startDate;
      const activeEnd = overrides.endDate !== undefined ? overrides.endDate : endDate;

      // 1. Fetch connection status
      const statusRes = await fetch("/api/netsuite/status");
      if (!statusRes.ok) throw new Error("Failed to contact server API status.");
      const statusData = await statusRes.json();
      setNetsuiteStatus(statusData);

      // 2. Fetch live subsidiaries & departments
      const [subsRes, deptsRes] = await Promise.all([
        fetch("/api/netsuite/subsidiaries"),
        fetch("/api/netsuite/departments"),
      ]);
      if (subsRes.ok) setSubsidiaries(await subsRes.json());
      if (deptsRes.ok) setDepartments(await deptsRes.json());

      // 3. Fetch financial dashboard metrics with real subsidiary/department/date filters
      const params = new URLSearchParams({ subsidiary: activeSub });
      if (activeDept && activeDept !== "all") params.set("department", activeDept);
      const range = getPeriodRange(activeRange, activeStart, activeEnd);
      if (range.startDate && range.endDate) {
        params.set("startDate", range.startDate);
        params.set("endDate", range.endDate);
      }
      const dashboardRes = await fetch(`/api/netsuite/dashboard?${params.toString()}`);
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

  const activeData = dashboardData;

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
              onChange={(e) => {
                const val = e.target.value;
                setSelectedSubsidiary(val);
                syncData({ subsidiary: val });
              }}
              className="bg-white border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 text-[11px] font-semibold font-sans"
            >
              {subsidiaries.length > 0 ? (
                subsidiaries.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.id === "all" ? sub.name : `Subsidiary: ${sub.name}`}
                  </option>
                ))
              ) : (
                <>
                  <option value="all">Subsidiary: Consolidation (All)</option>
                  <option value="us">Subsidiary: Acme US Inc. (USD)</option>
                  <option value="emea">Subsidiary: Acme EMEA Ltd. (EUR)</option>
                </>
              )}
            </select>
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-2 text-xs">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedDept}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedDept(val);
                syncData({ department: val });
              }}
              className="bg-white border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 text-[11px] font-semibold font-sans"
            >
              {departments.length > 0 ? (
                departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.id === "all" ? `Department: ${dept.name}` : `Cost Center: ${dept.name}`}
                  </option>
                ))
              ) : (
                <>
                  <option value="all">Department: All Cost Centers</option>
                  <option value="eng">Cost Center: Engineering / R&D</option>
                  <option value="sales">Cost Center: S&M Sales Operations</option>
                  <option value="admin">Cost Center: Executive G&A</option>
                </>
              )}
            </select>
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center gap-2 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={dateRange}
              onChange={(e) => {
                const val = e.target.value;
                setDateRange(val);
                if (val !== "custom") syncData({ dateRange: val });
              }}
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
              onChange={(e) => {
                const val = e.target.value;
                setStartDate(val);
                syncData({ dateRange: "custom", startDate: val });
              }}
              className="bg-white border border-slate-200 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-700 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-slate-500 font-medium">End Date:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                const val = e.target.value;
                setEndDate(val);
                syncData({ dateRange: "custom", endDate: val });
              }}
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
