/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { AuthContextType } from "@/contexts/AuthContext.types";
import { useLanguage } from "@/hooks/use-language";
import { useBusinessVertical } from "@/hooks/use-business-vertical";
import { API_BASE, api } from "@/lib/api";
import { logError } from "@/lib/logging";
import { syncAgentPanelLayout } from "@/lib/agentPanelLayout";
import {
  buildLuaPopBaseSessionId,
  buildLuaPopRuntimeContext,
  buildLuaPopSessionId,
  prefillLuaPopComposer,
  resolveAgentRestaurantContext,
} from "@/lib/luapopContext";
import { cn } from "@/lib/utils";
import { OPERATIONAL_COMMAND_ROLES } from "@/lib/operationalCommandRoles";

declare global {
  interface Window {
    LuaPop?: {
      init: (config: Record<string, unknown>) => { destroy: () => void };
    };
  }
}

const LUA_POP_SCRIPT = "https://lua-ai-global.github.io/lua-pop/lua-pop.umd.js";
const EMBED_CONTAINER_ID = "mizan-luapop-embed";

const ALLOWED_ROLES = [...OPERATIONAL_COMMAND_ROLES];
const ATTENTION_ROLES = new Set<string>(OPERATIONAL_COMMAND_ROLES);

const SYSTEM_CONTEXT_MARKERS = [
  "[SYSTEM: PERSISTENT CONTEXT]",
  "[SYSTEM: PARTIAL CONTEXT]",
] as const;

function messageContainsSystemContext(text: string | null | undefined): boolean {
  if (!text) return false;
  return SYSTEM_CONTEXT_MARKERS.some((marker) => text.includes(marker));
}

function hideSystemContextMessages(root: ParentNode) {
  const selectors = [
    ".lua-pop-message",
    '[class*="lua-pop-message"]',
    '[class*="message-bubble"]',
    '[class*="MessageBubble"]',
  ];
  for (const selector of selectors) {
    root.querySelectorAll(selector).forEach((node) => {
      const el = node as HTMLElement;
      if (el.dataset.miyaSystemHidden === "true") return;
      if (messageContainsSystemContext(el.textContent)) {
        el.style.display = "none";
        el.setAttribute("aria-hidden", "true");
        el.dataset.miyaSystemHidden = "true";
      }
    });
  }
}

function loadLuaPopScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.LuaPop) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${LUA_POP_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("LuaPop script failed")));
      if (window.LuaPop) resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = LUA_POP_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("LuaPop script failed to load"));
    document.body.appendChild(script);
  });
}

export const LuaPopAgentWidget: React.FC = () => {
  const { user, accessToken } = useAuth() as AuthContextType;
  const { t, isRTL, language } = useLanguage();
  const businessVerticalQuery = useBusinessVertical();
  const location = useLocation();
  const hideOnPlatformAdmin = location.pathname.startsWith("/admin");
  const takeOrdersMode = location.pathname.includes("take-orders");

  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [agentId, setAgentId] = useState<string | undefined>(
    () => import.meta.env.VITE_LUA_AGENT_ID as string | undefined,
  );
  const [initError, setInitError] = useState<string | null>(null);

  const initializedRef = useRef<string | false>(false);
  const widgetRef = useRef<{ destroy: () => void } | null>(null);
  const pendingPromptRef = useRef<string | null>(null);

  const restaurant = user ? resolveAgentRestaurantContext(user) : null;

  const attentionQuery = useQuery({
    queryKey: ["agent", "command-center"],
    queryFn: () =>
      api.getAgentCommandCenter({ locale: language }) as Promise<{ attention?: Array<{ id: string }> }>,
    enabled: Boolean(user?.role && ATTENTION_ROLES.has(user.role)) && !hideOnPlatformAdmin,
    staleTime: 20_000,
    refetchInterval: 60_000,
    retry: false,
  });
  const attentionCount = attentionQuery.data?.attention?.length ?? 0;
  const hasAttention = attentionCount > 0;

  useEffect(() => {
    syncAgentPanelLayout(open);
    window.dispatchEvent(new CustomEvent("agent:panel-state", { detail: { open } }));
  }, [open]);

  useEffect(() => {
    const openHandler = (event: Event) => {
      setOpen(true);
      const prompt = ((event as CustomEvent<{ prompt?: string }>).detail?.prompt || "").trim();
      if (prompt) {
        pendingPromptRef.current = prompt;
        window.setTimeout(() => {
          if (!prefillLuaPopComposer(prompt)) {
            pendingPromptRef.current = prompt;
          }
        }, 400);
      }
    };
    const closeHandler = () => setOpen(false);
    window.addEventListener("agent:open", openHandler);
    window.addEventListener("agent:close", closeHandler);
    return () => {
      window.removeEventListener("agent:open", openHandler);
      window.removeEventListener("agent:close", closeHandler);
    };
  }, []);

  useEffect(() => {
    if (!user || !accessToken || hideOnPlatformAdmin) return;
    fetch(`${API_BASE}/agent/config/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.luapop === false) {
          setEnabled(false);
          return;
        }
        if (data.agent_id) setAgentId(String(data.agent_id));
        setEnabled(true);
      })
      .catch(() => setEnabled(true));
  }, [user, accessToken, hideOnPlatformAdmin]);

  const destroyWidget = useCallback(() => {
    if (widgetRef.current) {
      try {
        widgetRef.current.destroy();
      } catch {
        /* ignore */
      }
      widgetRef.current = null;
    }
    const host = document.querySelector("#lua-shadow-root");
    if (host) host.remove();
    initializedRef.current = false;
  }, []);

  useEffect(() => {
    if (!user) {
      destroyWidget();
    }
  }, [user, destroyWidget]);

  useEffect(() => {
    if (!user) return;

    const observer = new MutationObserver(() => {
      const shadowHost = document.querySelector("#lua-shadow-root");
      if (shadowHost?.shadowRoot) hideSystemContextMessages(shadowHost.shadowRoot);
      const pending = pendingPromptRef.current;
      if (pending && prefillLuaPopComposer(pending)) {
        pendingPromptRef.current = null;
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    const pollId = window.setInterval(() => {
      const shadowHost = document.querySelector("#lua-shadow-root");
      if (shadowHost?.shadowRoot) hideSystemContextMessages(shadowHost.shadowRoot);
    }, 500);

    return () => {
      observer.disconnect();
      window.clearInterval(pollId);
    };
  }, [user]);

  useEffect(() => {
    if (!user || !accessToken || hideOnPlatformAdmin || !enabled) return;
    if (!ALLOWED_ROLES.includes(user.role)) return;
    if (businessVerticalQuery.isPending) return;
    if (!restaurant?.id) {
      setInitError("No workspace linked to this account. Select a tenant or use impersonation.");
      return;
    }
    if (!agentId) {
      setInitError("Agent is not configured (missing agent id).");
      return;
    }

    let cancelled = false;

    const init = async () => {
      try {
        await loadLuaPopScript();
        if (cancelled || !window.LuaPop) return;

        const businessVertical = businessVerticalQuery.data?.businessVertical ?? "RESTAURANT";
        const userFullName = `${user.first_name} ${user.last_name}`.trim() || user.email || "User";
        const baseSessionId = buildLuaPopBaseSessionId(restaurant.id, user.id);

        let loginNonce = sessionStorage.getItem("lua_login_nonce");
        if (!loginNonce) {
          loginNonce = Date.now().toString(36);
          sessionStorage.setItem("lua_login_nonce", loginNonce);
        }
        const sessionId = buildLuaPopSessionId(restaurant.id, user.id, loginNonce);
        const initMarker = `${sessionId}:${businessVertical}:${language}`;
        if (initializedRef.current === initMarker) return;

        destroyWidget();

        widgetRef.current = window.LuaPop.init({
          agentId,
          environment: "production",
          apiUrl: "https://api.heylua.ai",
          token: accessToken,
          accessToken,
          authToken: accessToken,

          displayMode: "embedded",
          embeddedDisplayConfig: {
            targetContainerId: EMBED_CONTAINER_ID,
          },

          metadata: {
            restaurantId: restaurant.id,
            restaurantName: restaurant.name,
            businessVertical,
            userId: user.id,
            role: user.role,
            token: accessToken,
            sessionId: baseSessionId,
            language,
            rtl: isRTL,
            channel: "luapop",
          },

          fullName: userFullName,
          emailAddress: user.email,
          sessionId,

          voiceModeEnabled: true,
          sttEnabled: true,
          ttsEnabled: true,
          voiceResponseEnabled: false,
          speechRecognitionLanguage:
            language === "ar" ? "ar-MA" : language === "fr" ? "fr-FR" : "en-US",

          runtimeContext: buildLuaPopRuntimeContext({
            restaurantName: restaurant.name,
            restaurantId: restaurant.id,
            userFullName,
            userId: user.id,
            role: user.role,
            accessToken,
            businessVertical,
            takeOrdersMode,
          }),

          chatTitle: t("ai.chat_title") || "Agent",
          chatHeaderSubtitle: {
            visible: true,
            brandName: t("common.brand") || "Mizan AI",
          },
          chatInputPlaceholder: t("ai.chat_placeholder") || "Ask Agent anything...",
          welcomeMessage: t("ai.chat_greeting"),
          attachmentsEnabled: true,
          microphoneEnabled: true,
        });

        initializedRef.current = initMarker;
        setInitError(null);

        const pending = pendingPromptRef.current;
        if (pending) {
          window.setTimeout(() => {
            if (prefillLuaPopComposer(pending)) pendingPromptRef.current = null;
          }, 600);
        }
      } catch (err) {
        logError({ feature: "luapop-agent-widget", action: "init" }, err as Error);
        setInitError("Could not load Agent chat. Refresh and try again.");
      }
    };

    void init();
    return () => {
      cancelled = true;
    };
  }, [
    user,
    accessToken,
    hideOnPlatformAdmin,
    enabled,
    agentId,
    restaurant?.id,
    restaurant?.name,
    businessVerticalQuery.isPending,
    businessVerticalQuery.data?.businessVertical,
    language,
    isRTL,
    takeOrdersMode,
    t,
    destroyWidget,
  ]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!user || hideOnPlatformAdmin || !ALLOWED_ROLES.includes(user.role) || !enabled) {
    return null;
  }

  return (
    <>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "agent-launcher fixed z-[10050] top-1/2 -translate-y-1/2 hidden lg:flex pointer-events-auto",
            "flex-col items-center justify-center gap-2 rounded-l-xl border border-r-0 px-2 py-4",
            "min-w-[3.25rem] shadow-lg transition-all duration-200",
            "hover:scale-[1.03] hover:shadow-xl active:scale-[0.98]",
            hasAttention ? "agent-launcher-attention" : "agent-launcher-idle",
            isRTL ? "left-0 rounded-l-none rounded-r-xl border-l-0 border-r" : "right-0",
          )}
          aria-label={
            hasAttention
              ? `${t("ai.chat_button")} - ${attentionCount} ${attentionCount === 1 ? "item needs" : "items need"} attention`
              : t("ai.chat_button")
          }
          aria-expanded={false}
        >
          <span className="relative inline-flex shrink-0">
            <img
              src="/agent-avatar.webp"
              alt=""
              className={cn(
                "h-10 w-10 rounded-full object-cover ring-2 ring-white/90 shadow-md",
                hasAttention && "ring-amber-300",
              )}
              aria-hidden
            />
            {hasAttention ? (
              <>
                <span
                  className="agent-ping absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full bg-amber-400"
                  aria-hidden
                />
                <span
                  className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-emerald-700"
                  aria-hidden
                >
                  {attentionCount > 9 ? "9+" : attentionCount}
                </span>
              </>
            ) : (
              <span
                className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-300 ring-2 ring-emerald-700"
                aria-hidden
                title={t("ai.chat_online")}
              />
            )}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-white leading-none">
            Agent
          </span>
        </button>
      ) : null}

      <div
        role="complementary"
        aria-labelledby="agent-chat-title"
        aria-hidden={!open}
        className={cn(
          "relative fixed z-[10060] top-[57px] bottom-0 flex flex-col border-border/80 bg-background shadow-strong pointer-events-auto",
          "transition-transform duration-300 ease-out",
          isRTL ? "left-0 border-r" : "right-0 border-l",
          "w-[min(100vw,420px)]",
          open ? "translate-x-0" : isRTL ? "-translate-x-full" : "translate-x-full",
          "max-lg:bottom-[56px]",
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border/80 bg-[#075E54] px-3 py-2.5 text-white dark:bg-[#1F2C34] lg:hidden">
          <div id="agent-chat-title" className="truncate text-[15px] font-semibold">
            {t("ai.chat_title")}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full p-1 text-white/85 hover:bg-white/10"
            aria-label={t("ai.chat_close")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {initError ? (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
            {initError}
          </div>
        ) : (
          <div
            id={EMBED_CONTAINER_ID}
            className="flex min-h-0 flex-1 flex-col [&_.lua-pop-embedded]:!h-full [&_.lua-pop-embedded]:!max-h-none"
          />
        )}

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute end-2 top-2 z-10 hidden rounded-full bg-black/20 p-1.5 text-white hover:bg-black/30 lg:inline-flex"
          aria-label={t("ai.chat_close")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </>
  );
};

export default LuaPopAgentWidget;
