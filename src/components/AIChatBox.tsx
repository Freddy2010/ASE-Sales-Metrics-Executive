import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Sparkles, AlertCircle, RefreshCw, ChevronDown, User, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { DashboardData } from "../types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AIChatBoxProps {
  contextData: DashboardData | null;
  onDrillDown?: (view: "all" | "kpis" | "forecasts" | "analysis" | "reports") => void;
}

export default function AIChatBox({ contextData, onDrillDown }: AIChatBoxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Welcome to the CFO AI Workspace! I am your real-time NetSuite ERP Financial Advisor. Ask me to analyze budgets, calculate liquidity runway, assess collections risks, or help you drill down into ledger details.",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const starterQuestions = [
    "Analyze our DSO & collections risk",
    "What are our primary opex cost drivers?",
    "Assess our current cash balance and runway",
    "How do I switch dashboard views?"
  ];

  const handleSend = async (text: string) => {
    if (!text.trim() || isTyping) return;

    setError(null);
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      // Assemble full payload
      const historyPayload = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: historyPayload,
          context: contextData
        })
      });

      if (!res.ok) {
        throw new Error("Failed to reach financial analysis server.");
      }

      const data = await res.json();
      
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response || "I was unable to formulate a strategy response.",
        timestamp: new Date()
      }]);

      // Check if response contains suggestions about views, and support drill down dynamically if clicked
      const responseTextLower = (data.response || "").toLowerCase();
      if (onDrillDown) {
        if (responseTextLower.includes("scenario modeling") || responseTextLower.includes("forecast")) {
          // Dynamic hint or trigger if requested
        }
      }

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during analysis.");
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I encountered a communication timeout. Please make sure your server is online and active.",
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            id="open-ai-chat"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-tr from-slate-900 to-slate-800 text-white px-4 py-3.5 rounded-full shadow-lg border border-slate-700/30 hover:shadow-xl transition-all hover:translate-y-[-2px] cursor-pointer group"
          >
            <div className="relative">
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border border-slate-900"></span>
            </div>
            <span className="font-bold text-xs tracking-wide">CFO AI Copilot</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="ai-chat-box"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="bg-white border border-slate-200 rounded-2xl w-[380px] sm:w-[420px] h-[600px] shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-slate-800 rounded-lg border border-slate-700">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm tracking-tight flex items-center gap-1.5">
                    CFO AI Copilot
                    <span className="text-[9px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded uppercase">
                      Live
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">NetSuite SuiteQL & Analysis Engine</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Context Notice */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between text-[10px] text-slate-600 font-semibold font-mono">
              <span className="truncate max-w-[250px]">
                ERP: {contextData?.companyName || "Acme simulated ledger"}
              </span>
              <span className="text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold">
                Context Loaded
              </span>
            </div>

            {/* Message History */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-3 max-w-[85%] ${m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                >
                  <div className={`p-2 rounded-lg flex items-center justify-center shrink-0 w-7 h-7 border text-xs ${m.role === "user" ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-slate-900 text-white border-slate-800"}`}>
                    {m.role === "user" ? <User className="w-4 h-4" /> : <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                  </div>

                  <div className="space-y-1">
                    <div
                      className={`rounded-2xl px-4 py-3 text-xs leading-relaxed border ${
                        m.role === "user"
                          ? "bg-blue-600 text-white border-blue-700 shadow-sm rounded-tr-none"
                          : "bg-white text-slate-800 border-slate-200/80 shadow-xs rounded-tl-none whitespace-pre-wrap"
                      }`}
                    >
                      {m.content}
                    </div>
                    <span className="block text-[9px] text-slate-400 font-mono text-right font-medium px-1">
                      {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-3 max-w-[85%] mr-auto">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-white flex items-center justify-center shrink-0 w-7 h-7">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs shadow-xs rounded-tl-none flex items-center gap-1.5 text-slate-500 font-medium font-mono">
                    <span>AI CFO is compiling financial ratios</span>
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex items-start gap-2 text-rose-800 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p>{error}</p>
                    <button 
                      onClick={() => handleSend(messages[messages.length - 1]?.content || "")}
                      className="text-rose-700 underline mt-1 hover:text-rose-900 flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" /> Retry Prompt
                    </button>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Quick Suggestions (Only if last message wasn't user sending) */}
            {!isTyping && (
              <div className="px-4 py-2.5 bg-white border-t border-slate-100 flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto">
                {starterQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(q)}
                    className="text-[10px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full hover:bg-slate-100 hover:text-slate-900 transition-all text-left truncate cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="bg-white border-t border-slate-200 p-3.5 flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about opex, DSO risk, cash runway..."
                className="flex-1 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:bg-white focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 transition-all cursor-pointer flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
