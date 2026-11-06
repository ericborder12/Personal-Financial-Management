import React, { useState, useRef, useEffect } from "react";
import { aiApi } from "../api/ai";
import { IconSparkles } from "../components/common/Icons";

const INITIAL_MESSAGE = {
  role: "assistant",
  content:
    "Xin chào! Tôi là Trợ lý Tài chính & Hướng dẫn sử dụng FinanceFlow. 🌟\n\nTôi có thể giúp bạn:\n- Giải đáp cách dùng các tính năng (sổ giao dịch, ngân sách, tài khoản, sổ tiết kiệm, báo cáo).\n- Tư vấn kế hoạch chi tiêu thực tế (ví dụ: thu nhập 10 triệu, tiền nhà 4 triệu thì nên cắt giảm khoản nào?).\n- Đánh giá dòng tiền và các khoản tiết kiệm hiện tại của bạn.\n\nBạn muốn tìm hiểu hoặc cần lời khuyên về vấn đề gì hôm nay?",
  timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
};

const SUGGESTED_PROMPTS = [
  "Thu nhập 10 triệu, tiền nhà 4 triệu nên chi tiêu và cắt giảm khoản nào?",
  "Đánh giá tình hình tài chính và chi tiêu tháng này của tôi",
  "Làm thế nào để thêm một giao dịch thu chi mới?",
  "Tôi có nên gửi tiết kiệm kỳ hạn 6 tháng hay 12 tháng?",
  "Quy tắc 50/30/20 là gì và áp dụng ra sao?",
  "Cách mở sổ tiết kiệm và dùng máy tính lãi suất?",
];

// Helper to render basic markdown formatting cleanly
function FormattedMessage({ content }) {
  const lines = content.split("\n");

  return (
    <div className="space-y-1.5 leading-relaxed text-sm">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        // Heading 3 or 4
        if (trimmed.startsWith("### ") || trimmed.startsWith("#### ")) {
          const text = trimmed.replace(/^#+\s*/, "");
          return (
            <h4 key={idx} className="font-bold text-slate-900 dark:text-white pt-2 text-sm sm:text-base">
              {text}
            </h4>
          );
        }

        // Bullet points
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const bulletText = trimmed.slice(2);
          return (
            <div key={idx} className="flex items-start gap-2 pl-1.5">
              <span className="text-blue-500 font-bold shrink-0 leading-5">•</span>
              <span>{renderInlineBold(bulletText)}</span>
            </div>
          );
        }

        // Numbered list: e.g. "1. " or "2. "
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1.5">
              <span className="font-bold text-blue-600 dark:text-blue-400 shrink-0 text-xs mt-0.5">
                {numMatch[1]}.
              </span>
              <span>{renderInlineBold(numMatch[2])}</span>
            </div>
          );
        }

        return <p key={idx}>{renderInlineBold(trimmed)}</p>;
      })}
    </div>
  );
}

function renderInlineBold(text) {
  // Simple regex for **bold**
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-bold text-slate-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export default function QAPage() {
  const [messages, setMessages] = useState(() => [INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [configError, setConfigError] = useState(null);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const prompt = (textToSend || input).trim();
    if (!prompt || loading) return;

    const userMessage = {
      role: "user",
      content: prompt,
      timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setConfigError(null);

    try {
      // Send conversation history to backend endpoint
      const payloadMessages = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await aiApi.askQA(payloadMessages);

      const aiReply = {
        role: "assistant",
        content: res.reply || "Xin lỗi, tôi chưa nhận được câu trả lời từ máy chủ.",
        timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiReply]);
    } catch (err) {
      if (err.data && err.data.configured === false) {
        setConfigError(err.message);
      } else {
        const errorReply = {
          role: "assistant",
          content: `⚠️ ${err.message || "Đã có lỗi xảy ra khi kết nối tới Trợ lý AI. Vui lòng thử lại sau."}`,
          timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, errorReply]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    if (window.confirm("Bạn có muốn làm mới và xóa toàn bộ đoạn chat hiện tại?")) {
      setMessages([INITIAL_MESSAGE]);
      setConfigError(null);
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto h-[calc(100vh-8.5rem)] flex flex-col">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25">
            <IconSparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
                Trợ lý AI & Hỏi đáp
              </h1>
              <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                Cloudflare AI LLM
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tư vấn tài chính thông minh và giải đáp tính năng FinanceFlow
            </p>
          </div>
        </div>

        <button
          onClick={handleClearChat}
          className="cursor-pointer rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          Làm mới chat
        </button>
      </div>

      {/* Cloudflare Setup Warning Banner if unconfigured */}
      {configError && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/60 dark:bg-amber-950/40 shrink-0">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div className="text-xs space-y-1 text-amber-900 dark:text-amber-200">
              <p className="font-bold text-sm">Chưa kích hoạt Cloudflare Workers AI</p>
              <p>{configError}</p>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Hướng dẫn cấu hình: Mở file <code className="font-mono bg-white/70 px-1.5 py-0.5 rounded dark:bg-slate-900">backend/.env</code> và thêm:
              </p>
              <pre className="mt-1 bg-white/90 p-2 rounded-lg font-mono text-[11px] text-slate-800 dark:bg-slate-900 dark:text-slate-200 overflow-x-auto">
{`CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token
CLOUDFLARE_AI_MODEL=@cf/meta/llama-3.1-8b-instruct`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4 rounded-2xl border border-slate-200/80 bg-white/50 backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/50">
        {messages.map((msg, index) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={index}
              className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar Icon */}
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                  isUser
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-gradient-to-tr from-indigo-500 to-blue-600 text-white shadow-xs"
                }`}
              >
                {isUser ? "Bạn" : "AI"}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 shadow-xs ${
                  isUser
                    ? "bg-blue-600 text-white rounded-tr-xs"
                    : "bg-white border border-slate-200/90 text-slate-800 dark:bg-slate-800 dark:border-slate-700/80 dark:text-slate-100 rounded-tl-xs"
                }`}
              >
                {isUser ? (
                  <p className="text-sm font-medium whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <FormattedMessage content={msg.content} />
                )}
                <div
                  className={`mt-1 text-[10px] ${
                    isUser ? "text-blue-100 text-right" : "text-slate-400 text-left"
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-blue-600 text-white text-xs font-bold">
              AI
            </div>
            <div className="rounded-2xl rounded-tl-xs bg-white border border-slate-200 px-4 py-3 text-xs text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 flex items-center gap-2">
              <span className="flex gap-1 items-center">
                <span className="h-2 w-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
              <span>Trợ lý AI đang suy nghĩ và tính toán...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompt Chips */}
      <div className="space-y-1.5 shrink-0">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
          Gợi ý câu hỏi nhanh:
        </span>
        <div className="flex gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
          {SUGGESTED_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              type="button"
              disabled={loading}
              onClick={() => handleSend(prompt)}
              className="cursor-pointer shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-400 transition-all shadow-2xs"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Input Box Area */}
      <div className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-900 shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            rows={2}
            value={input}
            disabled={loading}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Đặt câu hỏi về tính năng hoặc bài toán tài chính của bạn (Nhấn Enter để gửi)..."
            className="flex-1 resize-none bg-transparent px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden dark:text-white dark:placeholder:text-slate-500"
          />
          <button
            type="button"
            disabled={!input.trim() || loading}
            onClick={() => handleSend()}
            className="cursor-pointer rounded-xl bg-blue-600 p-2.5 text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            aria-label="Gửi tin nhắn"
          >
            <svg className="w-5 h-5 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
