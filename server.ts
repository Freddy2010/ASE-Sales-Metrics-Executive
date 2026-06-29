import express from "express";
import path from "path";
import crypto from "crypto";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper to strip any copy-paste artifact quotes or spaces from env vars (common in Railway/Vercel)
function cleanEnvVar(val: string | undefined): string {
  if (!val) return "";
  let clean = val.trim();
  // Strip leading and trailing double or single quotes if they exist
  if (clean.startsWith('"') && clean.endsWith('"')) {
    clean = clean.slice(1, -1);
  }
  if (clean.startsWith("'") && clean.endsWith("'")) {
    clean = clean.slice(1, -1);
  }
  return clean.trim();
}

// Initialize Gemini API client safely (lazy loaded/guarded)
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = cleanEnvVar(process.env.GEMINI_API_KEY);
    if (key && key !== "MY_GEMINI_API_KEY") {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
  }
  return aiClient;
}

// NetSuite credentials status
function getNetsuiteConfig() {
  return {
    accountId: cleanEnvVar(process.env.NETSUITE_ACCOUNT_ID),
    consumerKey: cleanEnvVar(process.env.NETSUITE_CONSUMER_KEY),
    consumerSecret: cleanEnvVar(process.env.NETSUITE_CONSUMER_SECRET),
    tokenId: cleanEnvVar(process.env.NETSUITE_TOKEN_ID),
    tokenSecret: cleanEnvVar(process.env.NETSUITE_TOKEN_SECRET),
  };
}

function isNetsuiteConfigured(): boolean {
  const cfg = getNetsuiteConfig();
  return !!(cfg.accountId && cfg.consumerKey && cfg.consumerSecret && cfg.tokenId && cfg.tokenSecret);
}

// Generate NetSuite OAuth 1.0a Signature & Header for REST / SuiteQL
function buildNetsuiteOauthHeader(method: string, urlStr: string): string {
  const cfg = getNetsuiteConfig();
  if (!isNetsuiteConfigured()) return "";

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString("hex");

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: cfg.consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA256",
    oauth_timestamp: timestamp,
    oauth_token: cfg.tokenId,
    oauth_version: "1.0",
  };

  // Extract query parameters from URL if any
  const parsedUrl = new URL(urlStr);
  const signatureParams = { ...oauthParams };
  parsedUrl.searchParams.forEach((value, key) => {
    signatureParams[key] = value;
  });

  // Sort and assemble parameter string
  const sortedKeys = Object.keys(signatureParams).sort();
  const parameterString = sortedKeys
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(signatureParams[key])}`)
    .join("&");

  // Construct Base URL (without query params)
  const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}`;

  // Signature Base String
  const signatureBaseString = [
    method.toUpperCase(),
    encodeURIComponent(baseUrl),
    encodeURIComponent(parameterString),
  ].join("&");

  // Signing Key
  const signingKey = `${encodeURIComponent(cfg.consumerSecret)}&${encodeURIComponent(cfg.tokenSecret)}`;

  // Calculate HMAC-SHA256 Signature
  const signature = crypto
    .createHmac("sha256", signingKey)
    .update(signatureBaseString)
    .digest("base64");

  // Format Authorization Header
  const realm = cfg.accountId.toUpperCase().replace(/_/g, "-");
  const authHeaderParts = [
    `OAuth realm="${realm}"`,
    `oauth_consumer_key="${encodeURIComponent(cfg.consumerKey)}"`,
    `oauth_token="${encodeURIComponent(cfg.tokenId)}"`,
    `oauth_signature_method="HMAC-SHA256"`,
    `oauth_timestamp="${timestamp}"`,
    `oauth_nonce="${nonce}"`,
    `oauth_version="1.0"`,
    `oauth_signature="${encodeURIComponent(signature)}"`,
  ];

  return authHeaderParts.join(", ");
}

// Helper to format NetSuite domain
function getNetsuiteDomain(accountId: string): string {
  const formattedAccount = accountId.toLowerCase().replace(/_/g, "-");
  return `${formattedAccount}.suitetalk.api.netsuite.com`;
}

// API: Check NetSuite Connection Status
app.get("/api/netsuite/status", async (req, res) => {
  const config = getNetsuiteConfig();
  const missingKeys = [];
  if (!config.accountId) missingKeys.push("NETSUITE_ACCOUNT_ID");
  if (!config.consumerKey) missingKeys.push("NETSUITE_CONSUMER_KEY");
  if (!config.consumerSecret) missingKeys.push("NETSUITE_CONSUMER_SECRET");
  if (!config.tokenId) missingKeys.push("NETSUITE_TOKEN_ID");
  if (!config.tokenSecret) missingKeys.push("NETSUITE_TOKEN_SECRET");

  const configured = missingKeys.length === 0;

  let connectionSuccess = false;
  let connectionMessage = "";
  let accountInfo = null;

  if (configured) {
    try {
      // Attempt a lightweight test fetch (e.g. select first company account from NetSuite SuiteQL)
      const domain = getNetsuiteDomain(config.accountId);
      const url = `https://${domain}/services/rest/query/v1/suiteql?limit=1`;
      const authHeader = buildNetsuiteOauthHeader("POST", url);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/json",
          "prefer": "transient",
        },
        body: JSON.stringify({
          q: "SELECT companyname FROM companyinformation"
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data: any = await response.json();
        connectionSuccess = true;
        connectionMessage = "Successfully authenticated and connected to NetSuite Enterprise ERP.";
        if (data && data.items && data.items[0]) {
          accountInfo = {
            companyName: data.items[0].companyname || "NetSuite Connected Account",
            accountId: config.accountId,
          };
        } else {
          accountInfo = { companyName: "Configured Account", accountId: config.accountId };
        }
      } else {
        const errorText = await response.text();
        connectionSuccess = false;
        connectionMessage = `NetSuite rejected credentials. Status: ${response.status} - ${errorText.substring(0, 200)}`;
      }
    } catch (err: any) {
      connectionSuccess = false;
      connectionMessage = `Connection timed out or failed: ${err.message || err}`;
    }
  } else {
    connectionMessage = "Missing configuration. Standard ERP Demo environment loaded.";
  }

  res.json({
    configured,
    connected: connectionSuccess,
    message: connectionMessage,
    missingKeys,
    accountInfo,
    netsuiteDomain: config.accountId ? getNetsuiteDomain(config.accountId) : null,
  });
});

// Mock/Default High-Fidelity Data representing NetSuite financials
const mockDashboardData = {
  companyName: "Acme Enterprises Inc. (NetSuite Sandbox-1)",
  reportingPeriod: "Current Fiscal Year (YTD)",
  kpis: {
    revenue: { value: 14250000, target: 13500000, change: 12.4, status: "above_target" },
    grossProfit: { value: 9832500, target: 9180000, margin: 69.0, change: 14.1, status: "above_target" },
    operatingExpenses: { value: 6412500, budget: 6500000, change: -1.3, status: "within_budget" },
    netIncome: { value: 3420000, target: 2680000, margin: 24.0, change: 27.6, status: "above_target" },
    cashBalance: { value: 4125000, target: 3500000, runwayMonths: 7.7, change: 15.2, status: "healthy" },
    dso: { value: 42, target: 45, change: -12.5, status: "improving" }, // Days Sales Outstanding
    dpo: { value: 32, target: 30, change: 6.7, status: "optimal" }, // Days Payable Outstanding
  },
  cashForecast: [
    { period: "Jul 2026", cashIn: 1200000, cashOut: 950000, netFlow: 250000, balance: 4125000 },
    { period: "Aug 2026", cashIn: 1250000, cashOut: 980000, netFlow: 270000, balance: 4395000 },
    { period: "Sep 2026", cashIn: 1350000, cashOut: 1050000, netFlow: 300000, balance: 4695000 },
    { period: "Oct 2026", cashIn: 1100000, cashOut: 1020000, netFlow: 80000, balance: 4775000 },
    { period: "Nov 2026", cashIn: 1400000, cashOut: 1150000, netFlow: 250000, balance: 5025000 },
    { period: "Dec 2026", cashIn: 1650000, cashOut: 1400000, netFlow: 250000, balance: 5275000 },
  ],
  salesForecast: [
    { period: "Jul 2026", actualRevenue: 1150000, forecastRevenue: 1180000, actualGP: 782000, forecastGP: 802400 },
    { period: "Aug 2026", actualRevenue: 1210000, forecastRevenue: 1220000, actualGP: 834900, forecastGP: 841800 },
    { period: "Sep 2026", actualRevenue: 1312000, forecastRevenue: 1280000, actualGP: 905280, forecastGP: 883200 },
    { period: "Oct 2026", actualRevenue: 1080000, forecastRevenue: 1120000, actualGP: 745200, forecastGP: 772800 },
    { period: "Nov 2026", actualRevenue: 0, forecastRevenue: 1350000, actualGP: 0, forecastGP: 931500 },
    { period: "Dec 2026", actualRevenue: 0, forecastRevenue: 1580000, actualGP: 0, forecastGP: 1090200 },
  ],
  incomeStatement: {
    revenue: {
      total: 14250000,
      categories: [
        { name: "Product Subscriptions (SaaS)", value: 8950000, change: 18.2 },
        { name: "Professional Services", value: 3120000, change: 4.5 },
        { name: "Partner Commission Channels", value: 1680000, change: -2.1 },
        { name: "Other Supporting Revenue", value: 500000, change: 12.0 }
      ]
    },
    cogs: {
      total: 4417500,
      categories: [
        { name: "Hosting & Cloud Infrastructure", value: 1850000, change: 8.5 },
        { name: "Professional Delivery Payroll", value: 1980000, change: 5.2 },
        { name: "Direct Client Software Licensing", value: 587500, change: 1.1 }
      ]
    },
    opex: {
      total: 6412500,
      categories: [
        { name: "Sales & Marketing (S&M)", value: 2850000, change: -1.2 },
        { name: "Research & Development (R&D)", value: 2100000, change: 3.4 },
        { name: "General & Administrative (G&A)", value: 1462500, change: -5.8 }
      ]
    },
    otherExpenses: {
      total: 1412500,
      categories: [
        { name: "Amortization & Depreciation", value: 650000, change: 0.0 },
        { name: "Tax Provisioning", value: 762500, change: 12.4 }
      ]
    }
  },
  balanceSheet: {
    assets: {
      current: [
        { name: "Cash and Cash Equivalents", value: 4125000 },
        { name: "Accounts Receivable (Net)", value: 1890000 },
        { name: "Inventory", value: 450000 },
        { name: "Prepaid Expenses", value: 210000 }
      ],
      nonCurrent: [
        { name: "Property, Plant & Equipment", value: 3500000 },
        { name: "Intangible Assets & Goodwill", value: 1200000 }
      ]
    },
    liabilities: {
      current: [
        { name: "Accounts Payable", value: 840000 },
        { name: "Accrued Employee Payroll", value: 580000 },
        { name: "Short-Term Lines of Credit", value: 300000 }
      ],
      nonCurrent: [
        { name: "Long-Term Corporate Debt", value: 1500000 },
        { name: "Deferred Revenue (SaaS Pre-paid)", value: 1200000 }
      ]
    },
    equity: [
      { name: "Common Paid-in Capital", value: 2500000 },
      { name: "Retained Earnings Balance", value: 4455000 }
    ]
  },
  arAging: {
    totalOutstanding: 1890000,
    buckets: [
      { label: "Current (0-30 Days)", value: 1150000, percent: 60.8 },
      { label: "31-60 Days Aging", value: 420000, percent: 22.2 },
      { label: "61-90 Days Aging", value: 210000, percent: 11.1 },
      { label: "90+ Days (Delinquent)", value: 110000, percent: 5.9 }
    ],
    debtors: [
      { company: "Acme Corporate Systems", amount: 480000, days: 18, risk: "Low" },
      { company: "Initech Software Corp", amount: 320000, days: 42, risk: "Medium" },
      { company: "Globex Global Logistics", amount: 240000, days: 78, risk: "High" },
      { company: "Umbrella Corp", amount: 180000, days: 5, risk: "Low" },
      { company: "Hooli Web Platforms", amount: 150000, days: 32, risk: "Medium" }
    ]
  }
};

// API: Get Combined Financial Dashboard Data
app.get("/api/netsuite/dashboard", async (req, res) => {
  const isConfigured = isNetsuiteConfigured();
  const config = getNetsuiteConfig();

  if (isConfigured) {
    try {
      const domain = getNetsuiteDomain(config.accountId);
      const queryUrl = `https://${domain}/services/rest/query/v1/suiteql`;

      const executeQL = async (queryStr: string): Promise<any[]> => {
        const authHeader = buildNetsuiteOauthHeader("POST", queryUrl);
        const response = await fetch(queryUrl, {
          method: "POST",
          headers: {
            "Authorization": authHeader,
            "Content-Type": "application/json",
            "prefer": "transient",
          },
          body: JSON.stringify({ q: queryStr }),
        });
        if (!response.ok) {
          throw new Error(`NetSuite SQL error: ${response.status} - ${await response.text()}`);
        }
        const data = await response.json();
        return data.items || [];
      };

      const liveData: any = {};
      
      // 1. Fetch Company Name
      try {
        const companyItems = await executeQL("SELECT companyname FROM companyinformation");
        if (companyItems && companyItems[0]) {
          liveData.companyName = companyItems[0].companyname;
        }
      } catch (err) {
        console.warn("Failed to fetch company name from NetSuite", err);
      }

      // 2. Fetch Cash Balance (BANK)
      try {
        const bankItems = await executeQL("SELECT SUM(balance) as cash FROM account WHERE accttype = 'BANK'");
        if (bankItems && bankItems[0] && bankItems[0].cash !== null) {
          liveData.cashBalance = Math.abs(parseFloat(bankItems[0].cash));
        }
      } catch (err) {
        console.warn("Failed to fetch cash balance from NetSuite", err);
      }

      // 3. Fetch AR Balance (Accounts Receivable)
      try {
        const arItems = await executeQL("SELECT SUM(amountremaining) as ar FROM transaction WHERE type = 'CustInvc' AND isopen = 'T'");
        if (arItems && arItems[0] && arItems[0].ar !== null) {
          liveData.arOutstanding = Math.abs(parseFloat(arItems[0].ar));
        }
      } catch (err) {
        console.warn("Failed to fetch AR outstanding balance from NetSuite", err);
      }

      // 4. Fetch AP Balance (Accounts Payable)
      try {
        const apItems = await executeQL("SELECT SUM(amountremaining) as ap FROM transaction WHERE type = 'VendBill' AND isopen = 'T'");
        if (apItems && apItems[0] && apItems[0].ap !== null) {
          liveData.apOutstanding = Math.abs(parseFloat(apItems[0].ap));
        }
      } catch (err) {
        console.warn("Failed to fetch AP outstanding balance from NetSuite", err);
      }

      // 5. Fetch YTD Sales/Revenue (Income Accounts)
      try {
        const salesItems = await executeQL("SELECT -SUM(amount) as revenue FROM transactionline JOIN account ON transactionline.account = account.id WHERE account.accttype = 'INCOME' AND transactionline.trandate >= '2026-01-01'");
        if (salesItems && salesItems[0] && salesItems[0].revenue !== null) {
          liveData.revenueYtd = Math.abs(parseFloat(salesItems[0].revenue));
        }
      } catch (err) {
        // Fallback to simpler transaction search if account join is non-standard
        try {
          const altItems = await executeQL("SELECT SUM(foreignamount) as totalSales FROM transaction WHERE type = 'SalesOrd' AND trandate >= '2026-01-01'");
          if (altItems && altItems[0] && altItems[0].totalSales !== null) {
            liveData.revenueYtd = Math.abs(parseFloat(altItems[0].totalSales));
          }
        } catch (errAlt) {
          console.warn("Failed to fetch revenue/sales from NetSuite", errAlt);
        }
      }

      // 6. Fetch Operating Expenses
      try {
        const opexItems = await executeQL("SELECT SUM(amount) as opex FROM transactionline JOIN account ON transactionline.account = account.id WHERE account.accttype = 'EXPENSE' AND transactionline.trandate >= '2026-01-01'");
        if (opexItems && opexItems[0] && opexItems[0].opex !== null) {
          liveData.opexYtd = Math.abs(parseFloat(opexItems[0].opex));
        }
      } catch (err) {
        console.warn("Failed to fetch OPEX from NetSuite", err);
      }

      // Combine real NetSuite pull with deep financial structures
      const enrichedDashboard = {
        ...mockDashboardData,
        companyName: liveData.companyName || `NetSuite Live Account (${config.accountId})`,
        isLiveNetSuite: true,
      };

      if (liveData.cashBalance !== undefined && liveData.cashBalance > 0) {
        enrichedDashboard.kpis.cashBalance.value = liveData.cashBalance;
      }
      if (liveData.arOutstanding !== undefined && liveData.arOutstanding > 0) {
        const rev = liveData.revenueYtd || enrichedDashboard.kpis.revenue.value;
        enrichedDashboard.kpis.dso.value = Math.max(1, Math.min(120, Math.round((liveData.arOutstanding / rev) * 365)));
        enrichedDashboard.arAging.totalOutstanding = liveData.arOutstanding;
      }
      if (liveData.apOutstanding !== undefined && liveData.apOutstanding > 0) {
        const opex = liveData.opexYtd || enrichedDashboard.kpis.operatingExpenses.value;
        enrichedDashboard.kpis.dpo.value = Math.max(1, Math.min(120, Math.round((liveData.apOutstanding / opex) * 365)));
      }
      if (liveData.revenueYtd !== undefined && liveData.revenueYtd > 0) {
        enrichedDashboard.kpis.revenue.value = liveData.revenueYtd;
        enrichedDashboard.kpis.grossProfit.value = Math.floor(liveData.revenueYtd * 0.69);
        enrichedDashboard.incomeStatement.revenue.total = liveData.revenueYtd;
      }
      if (liveData.opexYtd !== undefined && liveData.opexYtd > 0) {
        enrichedDashboard.kpis.operatingExpenses.value = liveData.opexYtd;
        enrichedDashboard.incomeStatement.opex.total = liveData.opexYtd;
      }

      // Recalculate derivative metrics:
      enrichedDashboard.kpis.netIncome.value = enrichedDashboard.kpis.grossProfit.value - enrichedDashboard.kpis.operatingExpenses.value;

      return res.json(enrichedDashboard);

    } catch (err: any) {
      // In case of any credential issue or schema miss, fallback gracefully to the high-fidelity demo
      // but notify the frontend of the fallback
      return res.json({
        ...mockDashboardData,
        isLiveNetSuite: false,
        errorNotice: `NetSuite queries failed: ${err.message}. Showing simulated enterprise metrics.`
      });
    }
  }

  // Not configured - return standard demo with false configuration flag
  res.json({
    ...mockDashboardData,
    isLiveNetSuite: false,
  });
});

// API: Custom SuiteQL Execution endpoint for power users
app.post("/api/netsuite/query", async (req, res) => {
  const config = getNetsuiteConfig();
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: "Missing 'query' string in request body." });
  }

  if (!isNetsuiteConfigured()) {
    return res.status(401).json({
      error: "NetSuite Connection is not fully configured.",
      suggestedQuery: query,
      simulatedResult: {
        columns: ["id", "trandate", "tranid", "entity", "amount"],
        rows: [
          [1012, "2026-06-15", "INV2026-485", "Globex Logistics", 24000.0],
          [1013, "2026-06-22", "INV2026-486", "Acme Corporate Systems", 12500.0],
          [1014, "2026-06-25", "INV2026-487", "Initech Software", 8900.0],
        ]
      }
    });
  }

  try {
    const domain = getNetsuiteDomain(config.accountId);
    const url = `https://${domain}/services/rest/query/v1/suiteql`;
    const authHeader = buildNetsuiteOauthHeader("POST", url);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query }),
    });

    if (response.ok) {
      const data = await response.json();
      res.json(data);
    } else {
      const errorText = await response.text();
      res.status(response.status).json({
        error: `NetSuite SuiteQL Error`,
        details: errorText,
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: `Connection failed: ${err.message || err}` });
  }
});

// API: Generate Executive Commentary/Narrative using Gemini model (server-side API proxy)
app.post("/api/netsuite/analysis", async (req, res) => {
  const { financeData } = req.body;
  const ai = getAiClient();

  if (!ai) {
    return res.json({
      analysis: `### **Executive Financial Briefing (Offline Engine)**\n\n` +
        `*Please configure your **GEMINI_API_KEY** secret to unlock advanced AI executive narrative summaries and scenario projections.* \n\n` +
        `**Key Observations:**\n` +
        `- **Superior EBITDA Margin**: Operating margins have expanded to **23.9%**, primarily driven by an 18.2% surge in SaaS subscription revenues.\n` +
        `- **Optimized Accounts Receivable**: DSO improved significantly from **48** to **42 days**, generating an incremental cash cushion of roughly **$412K** in current liquidity.\n` +
        `- **Cost-Containment**: Operating expenses are tracking **1.3% below budget**, with S&M costs seeing high efficiency. R&D spending is fully aligned with pipeline updates.`
    });
  }

  try {
    const dataString = JSON.stringify(financeData || mockDashboardData, null, 2);
    
    const prompt = `You are an elite Chief Financial Officer (CFO) and NetSuite financial analyst. 
Analyze the following enterprise NetSuite balance sheet, income statement, cash forecasts, and key performance metrics.
Provide a high-impact, professional executive narrative report suitable for a presentation to the Board of Directors.

Guidelines:
- Keep the tone highly strategic, objective, professional, and composed.
- Start with a clear section: "### **Executive Summary & Board Briefing**"
- Under "Key Insights", provide 3 high-impact, deeply specific bullet points analyzing revenue structures, cost efficiency, and liquidity. Include percentage figures and metric citations directly from the data.
- Provide a concise "Risk Management & Runway" section addressing cash forecasting models, AP/AR cycles (DSO/DPO), and potential growth levers.
- Focus purely on genuine financial strategy (no general boilerplate). Use professional financial terms.

NetSuite Financial Data Structure:
${dataString}`;

    // Call Gemini API using modern GoogleGenAI SDK
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const markdownText = response.text || "No response text generated.";
    res.json({ analysis: markdownText });

  } catch (err: any) {
    res.status(500).json({ error: `Gemini API Analysis failed: ${err.message || err}` });
  }
});

// API: CFO AI Chat dialogue proxy (state-free conversation based on active context)
app.post("/api/gemini/chat", async (req, res) => {
  const { messages, context } = req.body;
  const ai = getAiClient();

  if (!ai) {
    return res.json({
      response: `Hello! I am your offline financial AI. To unlock the live Gemini-powered conversation engine and drill down into real-time ledger questions, please configure your **GEMINI_API_KEY** in the Settings panel.

Currently, I am running in local demo mode. I can see you are looking at **${context?.companyName || "the active company"}** with a cash balance of **${context?.kpis?.cashBalance?.value ? "$" + context.kpis.cashBalance.value.toLocaleString() : "N/A"}**.`
    });
  }

  try {
    const systemPrompt = `You are an elite Chief Financial Officer (CFO) and NetSuite ERP expert assistant.
You are helping the user analyze their enterprise financial dashboard.
Here is the active company's financial context from NetSuite:
${JSON.stringify(context || {}, null, 2)}

Instructions:
1. Speak in a highly strategic, professional, objective, and composed CFO tone.
2. Answer the user's questions clearly, citing specific numbers from the provided financial context (such as cash balance, gross profit, opex, net income, DSO/DPO, P&L statement, balance sheet, or AR aging) whenever relevant.
3. Be helpful, concise, and professional. Avoid generic platitudes or greeting clutter. Keep markdown structure tidy.
4. If asked how to switch dashboard views (Consolidated Overview, KPI Performance, Scenario Modeling, AI Narrative, Ledger Financial Reports), clearly explain that they can use the workspace tab selector at the top, or click directly on any primary metric KPI card (like Cash Balance, Revenue, Gross Profit, operating expenses, or DSO) to automatically trigger a drill-down into that dedicated workspace view!`;

    const formattedContents = (messages || []).map((m: any) => {
      const role = m.role === "assistant" ? "model" : "user";
      return {
        role,
        parts: [{ text: m.content || "" }]
      };
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction: systemPrompt
      }
    });

    res.json({ response: response.text || "I was unable to generate a response." });
  } catch (err: any) {
    res.status(500).json({ error: `AI Chat failed: ${err.message || err}` });
  }
});

// API: Parse NetSuite saved search data into full dashboard schema
app.post("/api/netsuite/parse-saved-search", async (req, res) => {
  const { rawData } = req.body;
  const ai = getAiClient();

  if (!rawData || rawData.trim() === "") {
    return res.status(400).json({ error: "No raw NetSuite saved search data provided." });
  }

  if (!ai) {
    return res.status(400).json({ 
      error: "Gemini API key is required to convert raw Saved Searches. Please configure your GEMINI_API_KEY in the Settings > Secrets panel." 
    });
  }

  try {
    const prompt = `You are an expert financial systems integrator and NetSuite ERP consultant.
Analyze the following raw data pasted by a user (which is a NetSuite Saved Search, CSV file, or JSON export of financial transactions, accounts, ledger balances, or customer transactions).

Raw Saved Search Data:
${rawData}

Your task is to convert this raw data into a complete, high-fidelity, and internally consistent financial DashboardData JSON object.
The structure MUST match this exact typescript schema:
interface DashboardData {
  companyName: string; // Extract company name or use a realistic name derived from data (e.g. "NetSuite Import - [Extracted Name]")
  reportingPeriod: string; // Extract period name, or use "Imported Saved Search Ledger"
  isLiveNetSuite: boolean; // Set this to true
  kpis: {
    revenue: { value: number; target: number; change: number; status: string }; // status: 'above_target' | 'below_target'
    grossProfit: { value: number; target: number; margin: number; change: number; status: string };
    operatingExpenses: { value: number; budget: number; change: number; status: string }; // status: 'within_budget' | 'over_budget'
    netIncome: { value: number; target: number; margin: number; change: number; status: string };
    cashBalance: { value: number; target: number; runwayMonths: number; change: number; status: string };
    dso: { value: number; change: number }; // Days Sales Outstanding, typically 30-50
    dpo: { value: number; change: number }; // Days Payable Outstanding, typically 30-50
  };
  cashForecast: Array<{ period: string; cashIn: number; cashOut: number; netFlow: number; balance: number }>; // 6-month sequence
  salesForecast: Array<{ period: string; actualRevenue: number; forecastRevenue: number; actualGP: number; forecastGP: number }>; // 6-month sequence
  incomeStatement: {
    revenue: { total: number; categories: Array<{ name: string; value: number; change: number }> };
    cogs: { total: number; categories: Array<{ name: string; value: number; change: number }> };
    opex: { total: number; categories: Array<{ name: string; value: number; change: number }> };
    otherExpenses: { total: number; categories: Array<{ name: string; value: number; change: number }> };
  };
  balanceSheet: {
    assets: {
      current: Array<{ name: string; value: number }>;
      nonCurrent: Array<{ name: string; value: number }>;
    };
    liabilities: {
      current: Array<{ name: string; value: number }>;
      nonCurrent: Array<{ name: string; value: number }>;
    };
    equity: Array<{ name: string; value: number }>;
  };
  arAging: {
    totalOutstanding: number;
    buckets: Array<{ label: string; value: number; percent: number }>; // e.g. "Current", "1-30 Days", "31-60 Days", "61-90 Days", "90+ Days". Sum of percent must be exactly 100.
    debtors: Array<{ company: string; amount: number; days: number; risk: "Low" | "Medium" | "High" }>;
  };
}

Rules:
1. Read the raw data very carefully. Identify if it contains revenue, invoices, balances, debtors, expenses, or assets.
2. Map the actual numbers found in the raw search into the appropriate sections of the dashboard.
3. If sections are missing in the raw search (for example, if it's only an AR aging saved search, or only an income statement saved search), you MUST generate realistic, consistent, and balanced numbers for the other sections so the user gets a fully functional and beautiful dashboard!
4. The Balance Sheet MUST balance perfectly: Total Assets (current + non-current) MUST exactly equal Total Liabilities (current + non-current) + Total Equity.
5. Gross Profit MUST equal Revenue - COGS. Net Income MUST equal Gross Profit - OPEX - Other Expenses (taxes/etc).
6. Return ONLY the JSON object. Do not include any markdown fences or explanation. Use responseMimeType: "application/json" output.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "{}";
    let parsedData;
    try {
      parsedData = JSON.parse(text.trim());
    } catch (parseErr) {
      // Fallback: strip any markdown code blocks if the model accidentally included them
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      parsedData = JSON.parse(cleaned);
    }

    res.json(parsedData);
  } catch (err: any) {
    res.status(500).json({ error: `Saved Search parsing failed: ${err.message || err}` });
  }
});

// Vite server setup or static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
