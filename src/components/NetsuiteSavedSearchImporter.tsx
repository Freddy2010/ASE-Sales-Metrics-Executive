import React, { useState } from "react";
import { X, FileText, Upload, Sparkles, AlertCircle, Database, HelpCircle, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { DashboardData } from "../types";

interface ImporterProps {
  onImportSuccess: (data: DashboardData) => void;
  onClose: () => void;
}

export default function NetsuiteSavedSearchImporter({ onImportSuccess, onClose }: ImporterProps) {
  const [rawData, setRawData] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Pre-configured Saved Search templates (high-fidelity mock NetSuite exports)
  const templates = [
    {
      name: "Standard Invoice & Transaction Saved Search (CSV)",
      description: "NetSuite Transaction Saved Search containing Invoice lines, Sales Orders, and payments.",
      data: `"Internal ID","Document Number","Type","Date","Entity (Name)","Amount","Gross Amount","Status"
"10492","INV2026-981","Invoice","2026-06-15","Apex Global Systems","120000.00","120000.00","Paid"
"10493","INV2026-982","Invoice","2026-06-18","Initech Software Ltd","85400.00","85400.00","Open"
"10494","INV2026-983","Invoice","2026-06-20","Hooli Corp","420000.00","420000.00","Open"
"10495","SO2026-581","Sales Order","2026-06-22","Soylent Corp","150000.00","150000.00","Pending Billing"
"10496","INV2026-984","Invoice","2026-06-24","Veer Retail Partners","23500.00","23500.00","Paid"
"10497","PMT2026-341","Payment","2026-06-25","Hooli Corp","-120000.00","-120000.00","Deposited"
"10498","INV2026-985","Invoice","2026-06-28","Initiative Enterprise","95000.00","95000.00","Open"`
    },
    {
      name: "Accounts Receivable Detail Aging (CSV)",
      description: "NetSuite Accounts Receivable aging saved search with days overdue, debtor company, and risk levels.",
      data: `"Customer Name","Total Outstanding","Current","1 - 30 Days Overdue","31 - 60 Days Overdue","61 - 90 Days Overdue","90+ Days Overdue"
"Tyrell Biotech Inc.","350000.00","200000.00","150000.00","0.00","0.00","0.00"
"Soylent Financials","185000.00","0.00","85000.00","100000.00","0.00","0.00"
"Cyberdyne Systems","95000.00","0.00","0.00","0.00","95000.00","0.00"
"Weyland-Yutani Group","280000.00","180000.00","0.00","0.00","0.00","100000.00"
"Initech Solutions","45000.00","45000.00","0.00","0.00","0.00","0.00"`
    },
    {
      name: "Cost Center & Departmental Expense Ledger (JSON)",
      description: "NetSuite general ledger expense distribution by cost center (Engineering, Sales, Admin).",
      data: `{
  "reportingPeriod": "Q2 2026 Expenses",
  "departments": [
    { "name": "Engineering / R&D", "opex": 1945000, "budget": 2000000, "variance": -55000 },
    { "name": "Sales & Marketing", "opex": 2850000, "budget": 2750000, "variance": 100000 },
    { "name": "General & Administrative", "opex": 1280000, "budget": 1350000, "variance": -70000 }
  ],
  "cogs": { "hosting_infrastructure": 450000, "professional_services": 180000 }
}`
    }
  ];

  const handleLoadTemplate = (templateData: string) => {
    setRawData(templateData);
    setError(null);
  };

  const handleParse = async () => {
    if (!rawData.trim()) {
      setError("Please paste raw NetSuite CSV lines, general ledger text, or select one of the high-fidelity sample search templates below.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/netsuite/parse-saved-search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ rawData })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "An error occurred while parsing the Saved Search.");
      }

      const parsedDashboard: DashboardData = await res.json();
      
      setSuccess(true);
      setTimeout(() => {
        onImportSuccess(parsedDashboard);
        onClose();
      }, 1500);

    } catch (err: any) {
      setError(err.message || "Failed to parse data. Make sure a valid Gemini API Key is configured in your Settings Secrets.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-[100] p-4 font-sans animate-fadeIn">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-slate-950 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600/20 rounded-lg text-blue-400 border border-blue-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base leading-none tracking-tight">
                NetSuite Saved Search Importer
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-1">
                Convert raw CSV reports or transaction tables into high-fidelity dashboards with CFO AI
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Instruction Card */}
          <div className="bg-blue-50 border border-blue-100/70 rounded-xl p-4 flex gap-3 text-xs leading-relaxed text-blue-800">
            <Sparkles className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold mb-1">Direct ERP Pipeline Conversion</p>
              Paste any transactional dataset, accounting ledger, or client-aging tables below. The integrated **CFO Gemini Engine** will automatically normalize schemas, calculate ratios, map statement trees (GAAP/IFRS), and construct a balanced interactive workspace in real-time.
            </div>
          </div>

          {/* Text Area Input */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-500" />
                Raw Saved Search Data (CSV, TSV, or JSON)
              </label>
              <button 
                onClick={() => setRawData("")}
                className="text-[11px] text-slate-500 hover:text-slate-900 font-bold underline cursor-pointer"
              >
                Clear Workspace
              </button>
            </div>
            <textarea
              value={rawData}
              onChange={(e) => setRawData(e.target.value)}
              placeholder={`Paste NetSuite search output here (e.g. CSV lines with headers: "Internal ID", "Document Number", "Amount", etc.)...`}
              rows={8}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl p-3.5 font-mono text-[11px] leading-normal focus:outline-none focus:bg-white focus:border-slate-400 focus:ring-1 focus:ring-slate-400 resize-none placeholder:text-slate-400"
            />
          </div>

          {/* Preset templates selector */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-slate-500" />
              Quick-Test Templates (High-Fidelity Sample Saved Searches)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {templates.map((tpl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleLoadTemplate(tpl.data)}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-left hover:border-slate-400 hover:bg-slate-100/50 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <h5 className="font-semibold text-slate-800 text-[11px] leading-snug group-hover:text-blue-700 transition-colors">
                      {tpl.name}
                    </h5>
                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-1">
                      {tpl.description}
                    </p>
                  </div>
                  <span className="text-[9px] font-mono font-bold uppercase text-slate-400 mt-2 hover:text-slate-600 block text-right">
                    Load Preset &rarr;
                  </span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-100 rounded-xl p-3.5 flex gap-2.5 text-xs font-semibold text-rose-800 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Conversion Blocked</p>
                <p className="font-medium mt-0.5">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5" />
            Paste data to auto-balance statement hierarchies
          </span>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={loading || success}
              className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleParse}
              disabled={loading || success}
              className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Parsing Ledger...
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Successfully Balanced!
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                  Parse & Render Dashboard
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
