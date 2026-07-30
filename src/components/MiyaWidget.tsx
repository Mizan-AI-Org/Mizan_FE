import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Mic, MicOff, Send, Volume2, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { AuthContextType } from "@/contexts/AuthContext.types";
import { useLanguage } from "@/hooks/use-language";
import { API_BASE } from "@/lib/api";
import { logError } from "@/lib/logging";
import { cn } from "@/lib/utils";

type ChatTurn = { role: "user" | "assistant"; content: string };

const ALLOWED_ROLES = [
  "ADMIN",
  "SUPER_ADMIN",
  "MANAGER",
  "OWNER",
  "WAITER",
  "CASHIER",
  "CHEF",
];

function playBase64Audio(base64: string, mimeType: string) {
  const audio = new Audio(`data:${mimeType};base64,${base64}`);
  void audio.play();
}

export const MiyaWidget: React.FC = () => {
  const { user, accessToken } = useAuth() as AuthContextType;
  const { t, isRTL } = useLanguage();
  const location = useLocation();
  const hideOnPlatformAdmin = location.pathname.startsWith("/admin");

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [listening, setListening] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const chatTitle = t("ai.chat_title") || "Miya";
  const chatPlaceholder = t("ai.chat_placeholder") || "Ask Miya anything...";
  const chatButton = t("ai.chat_button") || "Chat with Miya";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, loading, open]);

  useEffect(() => {
    if (!user || !accessToken || hideOnPlatformAdmin) return;
    fetch(`${API_BASE}/miya/config/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((data) => setEnabled(Boolean(data.enabled)))
      .catch(() => setEnabled(true));
  }, [user, accessToken, hideOnPlatformAdmin]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || !accessToken || loading) return;

      const userMessage = text.trim();
      setInput("");
      setHistory((prev) => [...prev, { role: "user", content: userMessage }]);
      setLoading(true);

      try {
        const resp = await fetch(`${API_BASE}/miya/chat/`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: userMessage,
            history: history.slice(-12),
            voice: voiceMode,
          }),
        });

        const data = await resp.json();
        if (!resp.ok) {
          throw new Error(data.error || "Miya chat failed");
        }

        const reply = data.reply || "Done.";
        setHistory((prev) => [...prev, { role: "assistant", content: reply }]);

        if (voiceMode && data.audio?.base64) {
          playBase64Audio(data.audio.base64, data.audio.mime_type || "audio/mpeg");
        }
      } catch (err) {
        logError({ feature: "miya-widget", action: "chat" }, err as Error);
        setHistory((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Sorry, I couldn't reach Mizan right now. Try again in a moment.",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [accessToken, history, loading, voiceMode],
  );

  const toggleListening = useCallback(() => {
    const SpeechRecognitionCtor =
      (window as unknown as { SpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setVoiceMode(true);
      return;
    }

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = document.documentElement.lang || "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript || "";
      if (transcript) {
        setVoiceMode(true);
        void sendMessage(transcript);
      }
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [listening, sendMessage]);

  if (!user || hideOnPlatformAdmin || !ALLOWED_ROLES.includes(user.role) || !enabled) {
    return null;
  }

  return (
    <div className={cn("fixed z-[9999]", isRTL ? "left-6" : "right-6")} style={{ bottom: 75 }}>
      {open && (
        <div
          className={cn(
            "mb-4 w-[min(100vw-2rem,380px)] rounded-2xl border border-emerald-100 bg-white shadow-2xl overflow-hidden flex flex-col",
            "animate-in slide-in-from-bottom-4 duration-300",
          )}
          style={{ height: "min(70vh, 520px)" }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 text-white"
            style={{ background: "linear-gradient(135deg, #00E676 0%, #00C853 100%)" }}
          >
            <div>
              <div className="font-bold text-lg">{chatTitle}</div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1 hover:bg-white/20"
              aria-label="Close Miya chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className={cn("flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50", isRTL && "text-right")}>
            {history.length === 0 && (
              <div className="text-sm text-slate-500 text-center py-8">
                Hi, I'm Miya, your operations assistant. Ask about shifts, tasks, staff, or insights.
              </div>
            )}
            {history.map((turn, i) => (
              <div
                key={`${turn.role}-${i}`}
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
                  turn.role === "user"
                    ? cn("ml-auto bg-emerald-500 text-white", isRTL && "mr-auto ml-0")
                    : "bg-white border border-slate-200 text-slate-800 shadow-sm",
                )}
              >
                {turn.content}
              </div>
            ))}
            {loading && (
              <div className="text-xs text-slate-400 animate-pulse">Miya is thinking…</div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-slate-100 p-3 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => setVoiceMode((v) => !v)}
                className={cn(
                  "flex items-center gap-1 rounded-full px-2 py-1 text-xs border",
                  voiceMode
                    ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 text-slate-500",
                )}
                title="Voice replies via Fish Audio"
              >
                <Volume2 className="h-3.5 w-3.5" />
                Voice
              </button>
              <button
                type="button"
                onClick={toggleListening}
                className={cn(
                  "flex items-center gap-1 rounded-full px-2 py-1 text-xs border",
                  listening
                    ? "border-red-400 bg-red-50 text-red-600"
                    : "border-slate-200 text-slate-500",
                )}
                title="Speak your message"
              >
                {listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                {listening ? "Listening…" : "Mic"}
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void sendMessage(input);
              }}
              className="flex gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={chatPlaceholder}
                disabled={loading}
                className={cn(
                  "flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400",
                  isRTL && "text-right",
                )}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="rounded-xl bg-emerald-500 p-2 text-white disabled:opacity-40 hover:bg-emerald-600"
                aria-label="Send message"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="group relative flex flex-col items-center"
        aria-label={chatButton}
      >
        <div
          className="rounded-full overflow-hidden shadow-lg transition-transform group-hover:scale-105"
          style={{
            width: 110,
            height: 110,
            border: "5px solid #1cc774",
            boxShadow: "0 15px 35px rgba(0, 230, 118, 0.5)",
          }}
        >
          <img
            src="/miya-avatar.webp"
            alt="Miya"
            className="h-full w-full object-cover"
          />
        </div>
        <span
          className="mt-2 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-bold text-white shadow-md"
          style={{
            background: "linear-gradient(135deg, #00E676 0%, #00C853 100%)",
            border: "2px solid white",
          }}
        >
          {chatButton}
        </span>
      </button>
    </div>
  );
};

export default MiyaWidget;
