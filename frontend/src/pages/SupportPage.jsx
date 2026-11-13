import React, { useState, useEffect, useRef, useCallback } from "react";
import { financeApi } from "../api/finance";
import {
  IconChat,
  IconPaperAirplane,
  IconInbox,
  IconCheck,
  IconSearch,
  IconShield,
} from "../components/common/Icons";

const FEEDBACK_TYPES = [
  { value: "feature", label: "💡 Đề xuất tính năng mới" },
  { value: "bug", label: "🐞 Báo cáo lỗi phát sinh" },
  { value: "other", label: "💬 Ý kiến đóng góp khác" },
];

export default function SupportPage({ user }) {
  const isAdmin = Boolean(user?.is_staff || user?.is_superuser);

  const [activeSubTab, setActiveSubTab] = useState("chat"); // 'chat' | 'feedback'
  const [presence, setPresence] = useState({
    admin_online: false,
    admin_last_seen: null,
    is_admin: isAdmin,
  });

  // Regular user state
  const [userMessages, setUserMessages] = useState([]);
  const [userChatInput, setUserChatInput] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [userFeedbacks, setUserFeedbacks] = useState([]);
  const [feedbackForm, setFeedbackForm] = useState({
    type: "feature",
    title: "",
    content: "",
  });
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  // Admin state
  const [conversations, setConversations] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [adminMessages, setAdminMessages] = useState([]);
  const [adminChatInput, setAdminChatInput] = useState("");
  const [allFeedbacks, setAllFeedbacks] = useState([]);
  const [feedbackFilterStatus, setFeedbackFilterStatus] = useState("all");
  const [feedbackFilterType, setFeedbackFilterType] = useState("all");
  const [adminReplyTexts, setAdminReplyTexts] = useState({});
  const [adminReplyStatuses, setAdminReplyStatuses] = useState({});
  const [savingReplyId, setSavingReplyId] = useState(null);

  const chatEndRef = useRef(null);

  // 1. Fetch presence and send heartbeat
  const fetchPresence = useCallback(async () => {
    try {
      const res = await financeApi.getSupportPresence();
      setPresence(res);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchPresence();
    const interval = setInterval(fetchPresence, 10000);
    return () => clearInterval(interval);
  }, [fetchPresence]);

  // 2. Fetch Chat Messages (User or Admin)
  const fetchUserMessages = useCallback(async () => {
    try {
      const msgs = await financeApi.getChatMessages();
      setUserMessages(msgs);
    } catch {
      // ignore
    }
  }, []);

  const fetchAdminConversations = useCallback(async () => {
    try {
      const convs = await financeApi.getChatMessages();
      setConversations(convs);
      if (!selectedUserId && convs.length > 0) {
        setSelectedUserId(convs[0].user_id);
      }
    } catch {
      // ignore
    }
  }, [selectedUserId]);

  const fetchAdminMessagesWithUser = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const msgs = await financeApi.getChatMessages({ user_id: userId });
      setAdminMessages(msgs);
    } catch {
      // ignore
    }
  }, []);

  // 3. Polling for Chat Messages (every 3 seconds when in chat subtab)
  useEffect(() => {
    if (activeSubTab !== "chat") return;

    if (!isAdmin) {
      fetchUserMessages();
      const interval = setInterval(fetchUserMessages, 3000);
      return () => clearInterval(interval);
    } else {
      fetchAdminConversations();
      if (selectedUserId) {
        fetchAdminMessagesWithUser(selectedUserId);
      }
      const interval = setInterval(() => {
        fetchAdminConversations();
        if (selectedUserId) {
          fetchAdminMessagesWithUser(selectedUserId);
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [
    activeSubTab,
    isAdmin,
    selectedUserId,
    fetchUserMessages,
    fetchAdminConversations,
    fetchAdminMessagesWithUser,
  ]);

  // 4. Fetch Feedbacks
  const fetchFeedbacks = useCallback(async () => {
    try {
      if (isAdmin) {
        const params = {};
        if (feedbackFilterStatus !== "all") params.status = feedbackFilterStatus;
        if (feedbackFilterType !== "all") params.type = feedbackFilterType;
        const res = await financeApi.getFeedbacks(params);
        setAllFeedbacks(res);
      } else {
        const res = await financeApi.getFeedbacks();
        setUserFeedbacks(res);
      }
    } catch {
      // ignore
    }
  }, [isAdmin, feedbackFilterStatus, feedbackFilterType]);

  useEffect(() => {
    if (activeSubTab === "feedback") {
      fetchFeedbacks();
    }
  }, [activeSubTab, fetchFeedbacks]);

  // Auto scroll chat to bottom
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [userMessages, adminMessages]);

  // Handle User Send Chat Message
  const handleUserSendMessage = async (e) => {
    e.preventDefault();
    const content = userChatInput.trim();
    if (!content || sendingMessage) return;

    setSendingMessage(true);
    try {
      const newMsg = await financeApi.sendChatMessage({ content });
      setUserMessages((prev) => [...prev, newMsg]);
      setUserChatInput("");
    } catch (err) {
      alert(err.message || "Không gửi được tin nhắn");
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle Admin Send Chat Message
  const handleAdminSendMessage = async (e) => {
    e.preventDefault();
    const content = adminChatInput.trim();
    if (!content || sendingMessage || !selectedUserId) return;

    setSendingMessage(true);
    try {
      const newMsg = await financeApi.sendChatMessage({
        receiver_id: selectedUserId,
        content,
      });
      setAdminMessages((prev) => [...prev, newMsg]);
      setAdminChatInput("");
      fetchAdminConversations();
    } catch (err) {
      alert(err.message || "Không gửi được tin nhắn");
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle User Submit Feedback
  const handleUserSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackForm.title.trim() || !feedbackForm.content.trim() || submittingFeedback) {
      return;
    }

    setSubmittingFeedback(true);
    try {
      const created = await financeApi.createFeedback(feedbackForm);
      setUserFeedbacks((prev) => [created, ...prev]);
      setFeedbackForm({ type: "feature", title: "", content: "" });
      setFeedbackSuccess(true);
      setTimeout(() => setFeedbackSuccess(false), 5000);
    } catch (err) {
      alert(err.message || "Không thể gửi góp ý.");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Handle Admin Save Feedback Reply
  const handleAdminSaveReply = async (feedbackId) => {
    const reply = adminReplyTexts[feedbackId] ?? "";
    const statusVal = adminReplyStatuses[feedbackId] || "resolved";

    setSavingReplyId(feedbackId);
    try {
      const updated = await financeApi.updateFeedback(feedbackId, {
        admin_reply: reply,
        status: statusVal,
      });
      setAllFeedbacks((prev) =>
        prev.map((fb) => (fb.id === feedbackId ? updated : fb))
      );
      alert("Đã lưu phản hồi thành công!");
    } catch (err) {
      alert(err.message || "Lỗi khi lưu phản hồi");
    } finally {
      setSavingReplyId(null);
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return "";
    const d = new Date(isoString);
    return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (isoString) => {
    if (!isoString) return "";
    const d = new Date(isoString);
    return `${d.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    })} • ${d.toLocaleDateString("vi-VN")}`;
  };

  const renderStatusBadge = (status) => {
    if (status === "resolved") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
          <IconCheck className="w-3.5 h-3.5" /> Đã phản hồi & giải quyết
        </span>
      );
    }
    if (status === "reviewed") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
          Đang xem xét
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
        Chờ xử lý
      </span>
    );
  };

  const renderTypeBadge = (type) => {
    if (type === "bug") {
      return (
        <span className="rounded-md bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
          🐞 Báo lỗi
        </span>
      );
    }
    if (type === "feature") {
      return (
        <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
          💡 Tính năng mới
        </span>
      );
    }
    return (
      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
        💬 Khác
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Hỗ trợ & Góp ý
            </h1>
            {isAdmin ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200 dark:bg-indigo-950/50 dark:border-indigo-800 dark:text-indigo-300">
                <IconShield className="w-3.5 h-3.5" /> Quản trị viên
              </span>
            ) : presence.admin_online ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Admin đang trực tuyến
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400">
                <span className="inline-block h-2 w-2 rounded-full bg-slate-400"></span>
                Admin vắng mặt (Để lại tin nhắn hoặc góp ý)
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {isAdmin
              ? "Quản lý các cuộc trò chuyện trực tiếp và phản hồi ý kiến đóng góp từ người dùng."
              : "Trò chuyện trực tiếp với Ban Quản Trị hoặc gửi đề xuất tính năng, báo lỗi để hoàn thiện ứng dụng."}
          </p>
        </div>

        {/* Subtabs Switch */}
        <div className="flex items-center gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveSubTab("chat")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              activeSubTab === "chat"
                ? "bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-blue-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <IconChat className="w-4 h-4" />
            {isAdmin ? "Tin nhắn người dùng" : "Trò chuyện trực tiếp"}
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("feedback")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              activeSubTab === "feedback"
                ? "bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-blue-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            <IconInbox className="w-4 h-4" />
            {isAdmin ? "Quản lý Hộp thư góp ý" : "Hộp thư góp ý & Báo lỗi"}
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* USER VIEW */}
      {/* =================================================================== */}
      {!isAdmin && (
        <>
          {/* USER CHAT SUBTAB */}
          {activeSubTab === "chat" && (
            <div className="flex flex-col h-[650px] rounded-3xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
              {/* Offline Warning Banner if Admin is offline */}
              {!presence.admin_online && (
                <div className="bg-amber-50/90 border-b border-amber-200 px-4 py-3 dark:bg-amber-950/40 dark:border-amber-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                    <span className="text-base">ℹ️</span>
                    <span>
                      Ban Quản Trị hiện đang vắng mặt. Tin nhắn bạn gửi vẫn được lưu lại để Admin phản hồi khi quay lại.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSubTab("feedback")}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition shrink-0"
                  >
                    <IconInbox className="w-3.5 h-3.5" /> Chuyển sang Hộp thư góp ý
                  </button>
                </div>
              )}

              {/* Chat Messages Scroll Container */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {userMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                      <IconChat className="w-7 h-7" />
                    </div>
                    <div className="max-w-md space-y-1">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        Bắt đầu trò chuyện với Ban Quản Trị
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Nếu bạn có thắc mắc trong quá trình sử dụng, cần hỗ trợ kỹ thuật hoặc tài khoản, hãy để lại tin nhắn tại đây!
                      </p>
                    </div>
                  </div>
                ) : (
                  userMessages.map((msg) => {
                    const isFromAdmin = msg.is_from_admin;
                    return (
                      <div
                        key={msg.id}
                        className={`flex items-start gap-3 ${
                          isFromAdmin ? "flex-row" : "flex-row-reverse"
                        }`}
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                            isFromAdmin
                              ? "bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-xs"
                              : "bg-blue-600 text-white shadow-xs"
                          }`}
                        >
                          {isFromAdmin ? "AD" : "Bạn"}
                        </div>
                        <div
                          className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-3 shadow-xs ${
                            isFromAdmin
                              ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 rounded-tl-xs"
                              : "bg-blue-600 text-white rounded-tr-xs"
                          }`}
                        >
                          {isFromAdmin && (
                            <div className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-1">
                              <IconShield className="w-3 h-3" /> Ban Quản Trị
                            </div>
                          )}
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">
                            {msg.content}
                          </p>
                          <div
                            className={`mt-1 text-[10px] ${
                              isFromAdmin
                                ? "text-slate-400 dark:text-slate-500"
                                : "text-blue-100 text-right"
                            }`}
                          >
                            {formatTime(msg.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Bar */}
              <form
                onSubmit={handleUserSendMessage}
                className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={userChatInput}
                  onChange={(e) => setUserChatInput(e.target.value)}
                  placeholder="Nhập nội dung cần hỗ trợ... (Nhấn Enter để gửi)"
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={!userChatInput.trim() || sendingMessage}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <IconPaperAirplane className="w-4 h-4" />
                  <span className="hidden sm:inline">Gửi</span>
                </button>
              </form>
            </div>
          )}

          {/* USER FEEDBACK SUBTAB */}
          {activeSubTab === "feedback" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form to submit feedback (5 cols) */}
              <div className="lg:col-span-5 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <IconInbox className="w-5 h-5 text-blue-600" />
                    Gửi thư góp ý hoặc Báo lỗi
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Ý kiến của bạn là động lực để FinanceFlow ngày càng hoàn thiện và hữu ích hơn.
                  </p>
                </div>

                {feedbackSuccess && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-2">
                    <IconCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Cảm ơn bạn! Đóng góp của bạn đã được ghi nhận vào hệ thống.</span>
                  </div>
                )}

                <form onSubmit={handleUserSubmitFeedback} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Phân loại
                    </label>
                    <select
                      value={feedbackForm.type}
                      onChange={(e) =>
                        setFeedbackForm({ ...feedbackForm, type: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {FEEDBACK_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Tiêu đề ngắn gọn
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Lỗi không lưu được sổ tiết kiệm, Đề xuất xuất file Excel..."
                      value={feedbackForm.title}
                      onChange={(e) =>
                        setFeedbackForm({ ...feedbackForm, title: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Chi tiết nội dung / Mô tả lỗi
                    </label>
                    <textarea
                      required
                      rows={5}
                      placeholder="Mô tả cụ thể các bước phát sinh lỗi hoặc chi tiết tính năng bạn mong muốn có trên FinanceFlow..."
                      value={feedbackForm.content}
                      onChange={(e) =>
                        setFeedbackForm({ ...feedbackForm, content: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingFeedback}
                    className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submittingFeedback ? "Đang gửi..." : "Gửi thư góp ý"}
                  </button>
                </form>
              </div>

              {/* History of feedback (7 cols) */}
              <div className="lg:col-span-7 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Lịch sử góp ý của bạn ({userFeedbacks.length})
                  </h2>
                </div>

                {userFeedbacks.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
                    Bạn chưa gửi ý kiến đóng góp nào.
                  </div>
                ) : (
                  <div className="space-y-3.5 max-h-[600px] overflow-y-auto pr-1">
                    {userFeedbacks.map((fb) => (
                      <div
                        key={fb.id}
                        className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4.5 dark:border-slate-800/80 dark:bg-slate-800/50 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {renderTypeBadge(fb.type)}
                              {renderStatusBadge(fb.status)}
                            </div>
                            <h3 className="font-semibold text-sm text-slate-900 dark:text-white pt-1">
                              {fb.title}
                            </h3>
                          </div>
                          <span className="text-[11px] text-slate-400 shrink-0">
                            {formatDate(fb.created_at)}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {fb.content}
                        </p>

                        {/* Admin Reply Highlight */}
                        {fb.admin_reply ? (
                          <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/60 p-3.5 dark:border-indigo-900/60 dark:bg-indigo-950/40 space-y-1">
                            <div className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                              <IconShield className="w-3.5 h-3.5" /> Phản hồi từ Ban Quản Trị
                            </div>
                            <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                              {fb.admin_reply}
                            </p>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 italic">
                            Chưa có phản hồi từ Admin. Chúng tôi sẽ sớm cập nhật tại đây!
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* =================================================================== */}
      {/* ADMIN VIEW */}
      {/* =================================================================== */}
      {isAdmin && (
        <>
          {/* ADMIN CHAT SUBTAB */}
          {activeSubTab === "chat" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[700px]">
              {/* User Conversation List (4 cols) */}
              <div className="md:col-span-4 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col overflow-hidden">
                <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
                    <span>Hội thoại người dùng</span>
                    <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-600 dark:text-slate-400">
                      {conversations.length}
                    </span>
                  </h2>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 mt-2">
                  {conversations.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      Chưa có người dùng nào nhắn tin.
                    </div>
                  ) : (
                    conversations.map((c) => {
                      const isSelected = selectedUserId === c.user_id;
                      return (
                        <button
                          key={c.user_id}
                          onClick={() => {
                            setSelectedUserId(c.user_id);
                            fetchAdminMessagesWithUser(c.user_id);
                          }}
                          className={`w-full text-left p-3 rounded-2xl transition flex items-start gap-3 ${
                            isSelected
                              ? "bg-blue-50/80 dark:bg-blue-950/50 border border-blue-200/60 dark:border-blue-800/60"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          }`}
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-bold text-xs shadow-xs">
                            {c.display_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                                {c.display_name}
                              </span>
                              {c.unread_count > 0 && (
                                <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-[10px] font-bold text-white shrink-0">
                                  {c.unread_count}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {c.last_message || "Chưa có nội dung"}
                            </p>
                            <div className="text-[10px] text-slate-400">
                              {formatTime(c.last_message_at)}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Chat Thread with Selected User (8 cols) */}
              <div className="md:col-span-8 rounded-3xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col overflow-hidden">
                {selectedUserId ? (
                  <>
                    {/* Header with user info */}
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      {(() => {
                        const activeUser = conversations.find(
                          (c) => c.user_id === selectedUserId
                        );
                        return (
                          <div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                              {activeUser?.display_name || "Người dùng"}
                            </h3>
                            <p className="text-xs text-slate-400">{activeUser?.email}</p>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Messages Container */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                      {adminMessages.map((msg) => {
                        const isFromAdmin = msg.is_from_admin;
                        return (
                          <div
                            key={msg.id}
                            className={`flex items-start gap-3 ${
                              isFromAdmin ? "flex-row-reverse" : "flex-row"
                            }`}
                          >
                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                                isFromAdmin
                                  ? "bg-indigo-600 text-white shadow-xs"
                                  : "bg-blue-600 text-white shadow-xs"
                              }`}
                            >
                              {isFromAdmin ? "AD" : "U"}
                            </div>
                            <div
                              className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-3 shadow-xs ${
                                isFromAdmin
                                  ? "bg-indigo-600 text-white rounded-tr-xs"
                                  : "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 rounded-tl-xs"
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                {msg.content}
                              </p>
                              <div
                                className={`mt-1 text-[10px] ${
                                  isFromAdmin
                                    ? "text-indigo-200 text-right"
                                    : "text-slate-400"
                                }`}
                              >
                                {formatTime(msg.created_at)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Admin Reply Bar */}
                    <form
                      onSubmit={handleAdminSendMessage}
                      className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2"
                    >
                      <input
                        type="text"
                        value={adminChatInput}
                        onChange={(e) => setAdminChatInput(e.target.value)}
                        placeholder="Nhập tin nhắn phản hồi cho người dùng này..."
                        className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                      <button
                        type="submit"
                        disabled={!adminChatInput.trim() || sendingMessage}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-700 disabled:opacity-50"
                      >
                        <IconPaperAirplane className="w-4 h-4" />
                        <span>Gửi phản hồi</span>
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    Chọn một người dùng từ danh sách bên trái để xem nội dung trò chuyện.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ADMIN FEEDBACK SUBTAB */}
          {activeSubTab === "feedback" && (
            <div className="space-y-6">
              {/* Filter controls */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <IconSearch className="w-4 h-4" />
                    <span className="font-semibold">Trạng thái:</span>
                  </div>
                  {["all", "pending", "reviewed", "resolved"].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setFeedbackFilterStatus(st)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        feedbackFilterStatus === st
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {st === "all"
                        ? "Tất cả"
                        : st === "pending"
                        ? "Chờ xử lý"
                        : st === "reviewed"
                        ? "Đang xem xét"
                        : "Đã giải quyết"}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Loại:</span>
                  <select
                    value={feedbackFilterType}
                    onChange={(e) => setFeedbackFilterType(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <option value="all">Tất cả loại</option>
                    <option value="bug">🐞 Báo lỗi</option>
                    <option value="feature">💡 Tính năng mới</option>
                    <option value="other">💬 Ý kiến khác</option>
                  </select>
                </div>
              </div>

              {/* Feedbacks list */}
              {allFeedbacks.length === 0 ? (
                <div className="rounded-3xl border border-slate-200/80 bg-white p-12 text-center text-slate-400 dark:border-slate-800 dark:bg-slate-900">
                  Không có thư góp ý nào phù hợp với bộ lọc hiện tại.
                </div>
              ) : (
                <div className="space-y-4">
                  {allFeedbacks.map((fb) => (
                    <div
                      key={fb.id}
                      className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {renderTypeBadge(fb.type)}
                            {renderStatusBadge(fb.status)}
                            <span className="text-xs text-slate-400">
                              Người gửi: <strong>{fb.user_name || fb.user_email}</strong> (
                              {fb.user_email})
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white pt-1">
                            {fb.title}
                          </h3>
                        </div>
                        <span className="text-xs text-slate-400 shrink-0">
                          {formatDate(fb.created_at)}
                        </span>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60 text-xs text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {fb.content}
                      </div>

                      {/* Admin Reply & Status Edit Box */}
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30 space-y-3">
                        <label className="block text-xs font-bold text-indigo-700 dark:text-indigo-400">
                          Phản hồi của Ban Quản Trị dành cho người dùng:
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Nhập nội dung phản hồi gửi đến người dùng..."
                          defaultValue={fb.admin_reply}
                          onChange={(e) =>
                            setAdminReplyTexts({
                              ...adminReplyTexts,
                              [fb.id]: e.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-500">
                              Cập nhật trạng thái:
                            </span>
                            <select
                              defaultValue={fb.status}
                              onChange={(e) =>
                                setAdminReplyStatuses({
                                  ...adminReplyStatuses,
                                  [fb.id]: e.target.value,
                                })
                              }
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            >
                              <option value="pending">Chờ xử lý</option>
                              <option value="reviewed">Đang xem xét</option>
                              <option value="resolved">Đã phản hồi & giải quyết</option>
                            </select>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAdminSaveReply(fb.id)}
                            disabled={savingReplyId === fb.id}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700 disabled:opacity-50"
                          >
                            <IconCheck className="w-3.5 h-3.5" />
                            {savingReplyId === fb.id ? "Đang lưu..." : "Lưu phản hồi & Trạng thái"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
