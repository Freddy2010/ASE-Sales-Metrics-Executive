import React from "react";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { NetSuiteStatus } from "../types";

interface Props {
  status: NetSuiteStatus | null;
  loading: boolean;
  onRefresh: () => void;
}

export default function NetsuiteConnectorStatus({ status, loading, onRefresh }: Props) {
  if (!status) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs mb-4">
      <div className="px-5 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-lg ${status.connected ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-slate-100 text-slate-400 border border-slate-200"}`}>
            {status.connected ? <Cloud className="w-4 h-4" /> : <CloudOff className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-900">
                {status.connected
                  ? `Live Data — ${status.accountInfo?.companyName || "Connected"}`
                  : "Demo Mode"}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${status.connected ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"}`}>
                {status.connected ? "LIVE" : "DEMO"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">
              {status.connected
                ? `Account ${status.accountInfo?.accountId}`
                : "Using representative financial data. Connect an ERP to load live figures."}
            </p>
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-xs font-semibold text-white transition-all shadow-sm cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>
    </div>
  );
}
