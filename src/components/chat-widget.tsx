"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  ChangeEvent,
} from "react";
import { MessageSquare, X, Send, Paperclip, Loader2, CheckCircle, AlertCircle, Bot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "bot" | "candidate";
  content: string;
  ts: number;
}

type ChatStatus = "idle" | "loading" | "uploading" | "done" | "error";

// ─── Component ────────────────────────────────────────────────────────────────

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isDone) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, isDone]);

  // ── Session init ────────────────────────────────────────────────────────────

  const initSession = useCallback(async () => {
    if (sessionId || messages.length > 0) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start session");

      setSessionId(data.session_id);
      appendMessage("bot", data.message);
      if (data.done) setIsDone(true);
    } catch (e) {
      appendMessage(
        "bot",
        "I'm having trouble connecting right now. Please try again in a moment."
      );
    } finally {
      setStatus("idle");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, messages.length]);

  // Init session when widget opens
  useEffect(() => {
    if (isOpen) initSession();
  }, [isOpen, initSession]);

  // ── Message helpers ─────────────────────────────────────────────────────────

  function appendMessage(role: "bot" | "candidate", content: string) {
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role, content, ts: Date.now() },
    ]);
  }

  // ── Send message ────────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (text?: string) => {
      const msg = (text ?? input).trim();
      if (!msg || status === "loading" || isDone) return;

      setInput("");
      appendMessage("candidate", msg);
      setStatus("loading");

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: msg, session_id: sessionId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Chat error");

        if (data.session_id && !sessionId) setSessionId(data.session_id);
        appendMessage("bot", data.message);
        if (data.done) setIsDone(true);
      } catch (e) {
        appendMessage(
          "bot",
          "I had a brief error processing that. Could you try again?"
        );
      } finally {
        setStatus("idle");
      }
    },
    [input, sessionId, status, isDone]
  );

  // ── File upload ─────────────────────────────────────────────────────────────

  const handleFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";

      setUploadError(null);
      setStatus("uploading");
      appendMessage("candidate", `📎 Uploading resume: ${file.name}`);

      try {
        const formData = new FormData();
        formData.append("file", file);
        if (sessionId) formData.append("session_id", sessionId);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        if (!res.ok) {
          setUploadError(data.error || "Upload failed");
          appendMessage("bot", `⚠️ ${data.error || "Upload failed. Please try a different file."}`);
          setStatus("idle");
          return;
        }

        appendMessage(
          "bot",
          `✅ Resume received! I've extracted your details. Let's continue.`
        );

        // Trigger next conversational turn after successful upload
        setStatus("loading");
        const chatRes = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: "I just uploaded my resume.",
            session_id: sessionId,
          }),
        });
        const chatData = await chatRes.json();
        if (chatData.message) appendMessage("bot", chatData.message);
        if (chatData.done) setIsDone(true);
      } catch (err) {
        appendMessage("bot", "Upload failed. Please try again or answer the questions manually.");
      } finally {
        setStatus("idle");
      }
    },
    [sessionId]
  );

  if (!mounted) return null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Floating bubble */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-xl shadow-accent/30 transition-colors hover:bg-accent-hover md:bottom-10 md:right-10"
            aria-label="Open screening chat"
          >
            <MessageSquare size={24} />
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-full animate-ping bg-accent/40" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", bounce: 0.18, duration: 0.45 }}
            className="fixed bottom-4 right-4 z-50 flex h-[600px] max-h-[85vh] w-[calc(100vw-32px)] flex-col overflow-hidden rounded-2xl border border-surface-light bg-white shadow-2xl md:bottom-10 md:right-10 md:w-[420px]"
            role="dialog"
            aria-label="RecruitChat candidate screening chat"
          >
            {/* Header */}
            <ChatHeader onClose={() => setIsOpen(false)} isDone={isDone} />

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 bg-[#fcfaf8]"
            >
              {messages.length === 0 && status === "loading" && (
                <div className="flex items-center gap-2 text-text-secondary text-sm">
                  <Loader2 size={16} className="animate-spin" />
                  <span>Connecting…</span>
                </div>
              )}

              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}

              {/* Typing indicator */}
              {status === "loading" && (
                <div className="flex items-end gap-2">
                  <BotAvatar />
                  <div className="rounded-2xl rounded-tl-sm bg-surface-light px-4 py-3 flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-text-secondary animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-text-secondary animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-text-secondary animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}

              {isDone && (
                <div className="flex items-center justify-center gap-2 text-sm text-accent py-3">
                  <CheckCircle size={16} />
                  <span>Screening complete — we&apos;ll be in touch!</span>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            {!isDone && (
              <ChatInput
                input={input}
                setInput={setInput}
                onSend={() => sendMessage()}
                onFileClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                disabled={status === "loading" || status === "uploading"}
                uploading={status === "uploading"}
                inputRef={inputRef}
              />
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              className="hidden"
              onChange={handleFileChange}
              aria-label="Upload resume file"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ChatHeader({
  onClose,
  isDone,
}: {
  onClose: () => void;
  isDone: boolean;
}) {
  return (
    <div className="flex items-center justify-between bg-brand px-5 py-4 flex-shrink-0 shadow-sm z-10" style={{ backgroundColor: "var(--color-brand)" }}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-brand font-bold shadow-sm" style={{ color: "var(--color-brand)" }}>
          <Bot size={22} strokeWidth={1.5} />
        </div>
        <div>
          <h3 className="font-display text-base font-semibold text-white leading-tight">
            RecruitChat Assistant
          </h3>
          <p className="text-xs text-white/80 flex items-center gap-1.5 mt-0.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isDone ? "bg-white" : "bg-green-400"}`} />
            {isDone ? "Session Complete" : "Always active"}
          </p>
        </div>
      </div>
      <button
        onClick={onClose}
        className="rounded-full p-2 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
        aria-label="Close chat"
      >
        <X size={20} />
      </button>
    </div>
  );
}

function BotAvatar() {
  return (
    <div className="flex-shrink-0 w-8 h-8 mt-1 rounded-full bg-brand flex items-center justify-center shadow-sm" style={{ backgroundColor: "var(--color-brand)" }}>
      <Bot size={16} className="text-white" />
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isBot = msg.role === "bot";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25 }}
      className={`flex gap-3 max-w-[95%] ${isBot ? "items-start w-full" : "items-start justify-end w-full ml-auto"}`}
    >
      {isBot && <BotAvatar />}
      <div
        className={`px-4 py-3 text-[15px] leading-relaxed shadow-sm whitespace-pre-wrap ${
          isBot
            ? "rounded-2xl rounded-tl-sm bg-surface-light text-text-primary"
            : "rounded-2xl rounded-tr-sm bg-accent text-white"
        }`}
      >
        {msg.content}
      </div>
    </motion.div>
  );
}

function ChatInput({
  input,
  setInput,
  onSend,
  onFileClick,
  onKeyDown,
  disabled,
  uploading,
  inputRef,
}: {
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  onFileClick: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  disabled: boolean;
  uploading: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="border-t border-surface-light bg-white px-4 py-4 flex-shrink-0 z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-2 rounded-full border border-surface-light bg-surface-light/30 px-3 py-2 focus-within:bg-white focus-within:border-brand/40 focus-within:ring-2 focus-within:ring-brand/10 transition-all shadow-inner">
        <button
          onClick={onFileClick}
          disabled={disabled}
          className="p-2 text-text-secondary transition-colors hover:text-brand disabled:opacity-40 rounded-full hover:bg-surface-light focus:outline-none"
          aria-label="Upload resume"
          title="Upload resume (PDF, DOC, DOCX, TXT)"
        >
          {uploading ? (
            <Loader2 size={18} className="animate-spin text-brand" />
          ) : (
            <Paperclip size={18} />
          )}
        </button>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={disabled ? "Please wait…" : "Type your answer…"}
          disabled={disabled}
          maxLength={500}
          className="flex-1 bg-transparent px-2 py-1 text-[15px] text-text-primary outline-none placeholder:text-text-secondary/60 disabled:opacity-60"
          aria-label="Chat message input"
        />
        <button
          onClick={onSend}
          disabled={disabled || !input.trim()}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white transition-all hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
          aria-label="Send message"
          style={{ backgroundColor: disabled || !input.trim() ? "var(--color-surface-light)" : "var(--color-brand)" }}
        >
          <Send size={16} className="-ml-0.5" />
        </button>
      </div>
      <p className="mt-3 text-xs text-text-secondary/60 text-center font-medium">
        AI Assistant · Data processed securely
      </p>
    </div>
  );
}
