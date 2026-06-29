import React, { useState } from "react";
import { Cloud, CloudOff, RefreshCw, Key, ExternalLink, Info, CheckCircle, AlertTriangle } from "lucide-react";
import { NetSuiteStatus } from "../types";

interface Props {
  status: NetSuiteStatus | null;
  loading: boolean;
  onRefresh: () => void;
}

export default function NetsuiteConnectorStatus({ status, loading, onRefresh }: Props) {
  const [showSetup, setShowSetup] = useState(false);

  if (!status) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs mb-6">
      <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-4 bg-slate-50 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${status.connected ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-amber-50 text-amber-600 border border-amber-200"}`}>
            {status.connected ? <Cloud className="w-5 h-5 animate-pulse" /> : <CloudOff className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-semibold text-base text-slate-900">NetSuite Integration Link</h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${status.connected ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-amber-100 text-amber-800 border border-amber-200"}`}>
                {status.connected ? "LIVE SECURE ERP" : "DEMO / SANDBOX ERP"}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              {status.connected 
                ? `Connected to Account ${status.accountInfo?.accountId} (${status.accountInfo?.companyName})`
                : "Using high-fidelity simulated enterprise metrics. See diagnostic details below."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSetup(!showSetup)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-xs text-slate-600 font-medium transition-all bg-white"
          >
            {showSetup ? "Hide Connection Guide" : "NetSuite Connection Guide"}
          </button>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-xs font-semibold text-white transition-all shadow-sm cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Sync ERP
          </button>
        </div>
      </div>

      {!status.connected && (
        <div className="mx-6 my-4 p-4 bg-amber-50/60 border border-amber-200 rounded-lg flex flex-col gap-3 animate-fadeIn text-slate-700">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-[13px] text-slate-900">ERP Connection Status Indicator</p>
              <p className="text-[12px] text-slate-600 leading-relaxed">
                {status.message || "No connection attempts have succeeded yet. The app is falling back to safe local mock metrics."}
              </p>
            </div>
          </div>
          {status.missingKeys.length > 0 && (
            <div className="text-[11px] bg-white border border-amber-200/50 rounded-md p-2.5 space-y-1">
              <p className="font-bold text-slate-800 flex items-center gap-1">
                <Key className="w-3.5 h-3.5 text-amber-500" />
                Missing Environment Variables on Railway:
              </p>
              <ul className="list-disc pl-4 text-slate-600 font-mono space-y-0.5">
                {status.missingKeys.map(k => (
                  <li key={k} className="text-rose-600 font-bold">{k}</li>
                ))}
              </ul>
              <p className="text-[10px] text-slate-500 pt-1">
                Please make sure these variables are defined in your Railway Dashboard under the <span className="font-semibold text-slate-700">Variables</span> tab of this service, then trigger a redeploy.
              </p>
            </div>
          )}
        </div>
      )}

      {showSetup && (
        <div className="p-6 border-t border-slate-100 bg-slate-50/50 text-slate-700 text-xs space-y-4 font-sans leading-relaxed">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-display font-semibold text-sm text-slate-900 flex items-center gap-1.5 mb-2">
                <Key className="w-4 h-4 text-slate-700" /> Required Environment Variables
              </h4>
              <p className="text-slate-500 mb-3">
                To connect your real-time NetSuite financials, add these variables to your system environment or AI Studio Secrets manager:
              </p>
              <div className="space-y-1.5 font-mono text-[11px] bg-slate-100 p-3 rounded-lg border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-800 font-medium">NETSUITE_ACCOUNT_ID</span>
                  <span className={status.missingKeys.includes("NETSUITE_ACCOUNT_ID") ? "text-amber-600 font-semibold" : "text-emerald-600 font-semibold"}>
                    {status.missingKeys.includes("NETSUITE_ACCOUNT_ID") ? "⚠️ Missing" : "✓ Active"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-800 font-medium">NETSUITE_CONSUMER_KEY</span>
                  <span className={status.missingKeys.includes("NETSUITE_CONSUMER_KEY") ? "text-amber-600 font-semibold" : "text-emerald-600 font-semibold"}>
                    {status.missingKeys.includes("NETSUITE_CONSUMER_KEY") ? "⚠️ Missing" : "✓ Active"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-800 font-medium">NETSUITE_CONSUMER_SECRET</span>
                  <span className={status.missingKeys.includes("NETSUITE_CONSUMER_SECRET") ? "text-amber-600 font-semibold" : "text-emerald-600 font-semibold"}>
                    {status.missingKeys.includes("NETSUITE_CONSUMER_SECRET") ? "⚠️ Missing" : "✓ Active"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-800 font-medium">NETSUITE_TOKEN_ID</span>
                  <span className={status.missingKeys.includes("NETSUITE_TOKEN_ID") ? "text-amber-600 font-semibold" : "text-emerald-600 font-semibold"}>
                    {status.missingKeys.includes("NETSUITE_TOKEN_ID") ? "⚠️ Missing" : "✓ Active"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-800 font-medium">NETSUITE_TOKEN_SECRET</span>
                  <span className={status.missingKeys.includes("NETSUITE_TOKEN_SECRET") ? "text-amber-600 font-semibold" : "text-emerald-600 font-semibold"}>
                    {status.missingKeys.includes("NETSUITE_TOKEN_SECRET") ? "⚠️ Missing" : "✓ Active"}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-display font-semibold text-sm text-slate-900 flex items-center gap-1.5 mb-2">
                <Info className="w-4 h-4 text-slate-700" /> Setup Checklist (NetSuite SuiteTalk TBA)
              </h4>
              <ol className="list-decimal pl-4 space-y-1.5 text-slate-500">
                <li>
                  Enable features in NetSuite: Go to <span className="text-slate-900 font-medium">Setup &gt; Company &gt; Enable Features</span> under the <span className="text-slate-900 font-medium">SuiteCloud</span> tab. Turn on <span className="text-slate-900 font-medium">Web Services (REST)</span> and <span className="text-slate-900 font-medium">Token-Based Authentication (TBA)</span>.
                </li>
                <li>
                  Create Integration Record: Search for <span className="text-slate-900 font-medium">New Integration</span>. Check <span className="text-slate-900 font-medium">Token-Based Authentication</span>. Save to generate your <span className="text-slate-800 font-medium">Consumer Key & Secret</span>.
                </li>
                <li>
                  Configure User Role: Assign or create a role with <span className="text-slate-900 font-medium">REST Web Services</span> and <span className="text-slate-900 font-medium">User Access Tokens</span> permissions in NetSuite.
                </li>
                <li>
                  Generate Access Token: Go to <span className="text-slate-900 font-medium">Setup &gt; Users/Roles &gt; Access Tokens &gt; New</span>. Select your user and integration. Save to generate <span className="text-slate-800 font-medium">Token ID & Token Secret</span>.
                </li>
              </ol>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg mt-2">
            <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0" />
            <p className="text-[11px] text-blue-800 font-medium">
              When variables are configured, the dashboard automatically routes live queries through NetSuite SuiteTalk REST API. All secrets are held securely server-side and never exposed to the client.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
