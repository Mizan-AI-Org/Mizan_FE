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
import { syncLuaPopTheme } from "@/lib/luapopTheme";
import { useAppTheme } from "@/hooks/use-app-theme";
import {
  buildLuaPopBaseSessionId,
  buildLuaPopRuntimeContext,
  buildLuaPopSessionId,
  buildAgentWelcomeMessage,
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
/** Bump when welcome copy changes so LuaPop shows welcomeMessage (not stale history). */
const AGENT_GREETING_VERSION = "welcome-v2";

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
  const appTheme = useAppTheme();
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
  const [chatReady, setChatReady] = useState(false);

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
      if (!prompt) return;
      pendingPromptRef.current = prompt;
      const delays = [0, 150, 400, 800, 1200, 2000];
      for (const delay of delays) {
        window.setTimeout(() => {
          if (!pendingPromptRef.current) return;
          if (prefillLuaPopComposer(pendingPromptRef.current)) {
            pendingPromptRef.current = null;
          }
        }, delay);
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
    const host = document.querySelector("#lua-shadow-root-embedded, #lua-shadow-root");
    if (host) host.remove();
    initializedRef.current = false;
    setChatReady(false);
  }, []);

  useEffect(() => {
    if (!user) {
      destroyWidget();
    }
  }, [user, destroyWidget]);

  useEffect(() => {
    if (!user) return;

    const observer = new MutationObserver(() => {
      const shadowHost = document.querySelector("#lua-shadow-root-embedded, #lua-shadow-root");
      if (shadowHost?.shadowRoot) {
        hideSystemContextMessages(shadowHost.shadowRoot);
        syncLuaPopTheme(appTheme);
      }
      const pending = pendingPromptRef.current;
      if (pending && prefillLuaPopComposer(pending)) {
        pendingPromptRef.current = null;
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    const pollId = window.setInterval(() => {
      const shadowHost = document.querySelector("#lua-shadow-root-embedded, #lua-shadow-root");
      if (shadowHost?.shadowRoot) {
        hideSystemContextMessages(shadowHost.shadowRoot);
        syncLuaPopTheme(appTheme);
      }
    }, 500);

    return () => {
      observer.disconnect();
      window.clearInterval(pollId);
    };
  }, [user, appTheme]);

  useEffect(() => {
    syncLuaPopTheme(appTheme);
  }, [appTheme, open]);

  useEffect(() => {
    if (!open) return;
    if (!user || !accessToken || hideOnPlatformAdmin || !enabled) return;
    if (!ALLOWED_ROLES.includes(user.role)) return;
    if (businessVerticalQuery.isPending) return;
    if (!restaurant?.id) {
      setInitError("No workspace linked to this account. Select a tenant or use impersonation.");
      setChatReady(false);
      return;
    }
    if (!agentId) {
      setInitError("Agent is not configured (missing agent id).");
      setChatReady(false);
      return;
    }

    let cancelled = false;

    const init = async () => {
      try {
        await loadLuaPopScript();
        if (cancelled || !window.LuaPop) return;

        const businessVertical = businessVerticalQuery.data?.businessVertical ?? "RESTAURANT";
        const userFullName = `${user.first_name} ${user.last_name}`.trim() || user.email || "User";
        const welcomeMessage = buildAgentWelcomeMessage(userFullName, (key, opts) =>
          t(key, opts as { name: string; defaultValue: string }),
        );
        const baseSessionId = buildLuaPopBaseSessionId(restaurant.id, user.id);

        let loginNonce = sessionStorage.getItem("lua_login_nonce");
        const storedGreetingVersion = sessionStorage.getItem("lua_greeting_version");
        if (!loginNonce || storedGreetingVersion !== AGENT_GREETING_VERSION) {
          loginNonce = Date.now().toString(36);
          sessionStorage.setItem("lua_login_nonce", loginNonce);
          sessionStorage.setItem("lua_greeting_version", AGENT_GREETING_VERSION);
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
            useContainerHeight: true,
          },

          metadata: {
            restaurantId: restaurant.id,
            restaurant_id: restaurant.id,
            restaurantName: restaurant.name,
            restaurant_name: restaurant.name,
            businessVertical,
            userId: user.id,
            user_id: user.id,
            role: user.role,
            token: accessToken,
            sessionId: baseSessionId,
            language,
            rtl: isRTL,
            channel: "luapop",
          },

          requestContext: {
            restaurant_id: restaurant.id,
            restaurantId: restaurant.id,
            restaurant_name: restaurant.name,
            restaurantName: restaurant.name,
            user_id: user.id,
            userId: user.id,
            actingUserId: user.id,
            role: user.role,
            channel: "luapop",
            token: accessToken,
            tenant_scope: "restaurant",
            agent_mode: "manager_copilot",
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
            visible: false,
          },
          chatInputPlaceholder: t("ai.chat_placeholder") || "Ask Agent anything...",
          welcomeMessage,
          attachmentsEnabled: true,
          microphoneEnabled: true,
        });

        initializedRef.current = initMarker;
        setInitError(null);
        setChatReady(true);

        // Seed HeyLua user profile with tenant + JWT (pop channel often omits init metadata on generate).
        fetch(`${API_BASE}/agent/luapop-sync/`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            session_id: sessionId,
            base_session_id: baseSessionId,
            restaurant_id: restaurant.id,
            user_id: user.id,
          }),
        }).catch((err) => {
          logError({ feature: "luapop-agent-widget", action: "luapop-sync" }, err as Error);
        });

        const pending = pendingPromptRef.current;
        if (pending) {
          window.setTimeout(() => {
            if (prefillLuaPopComposer(pending)) pendingPromptRef.current = null;
          }, 600);
        }
      } catch (err) {
        logError({ feature: "luapop-agent-widget", action: "init" }, err as Error);
        setInitError("Could not load Agent chat. Refresh and try again.");
        setChatReady(false);
      }
    };

    void init();
    return () => {
      cancelled = true;
    };
  }, [
    open,
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
    if (!open || typeof document === "undefined") return;
    if (window.matchMedia("(max-width: 1023px)").matches) {
      document.documentElement.style.overflow = "hidden";
      return () => {
        document.documentElement.style.overflow = "";
      };
    }
    return undefined;
  }, [open]);

  useEffect(() => {
    if (chatReady && open) {
      syncLuaPopTheme(appTheme);
    }
  }, [chatReady, open, appTheme]);

  useEffect(() => {
    if (!open || !chatReady) return;
    const pending = pendingPromptRef.current;
    if (!pending) return;
    const tryPrefill = () => {
      if (prefillLuaPopComposer(pending)) {
        pendingPromptRef.current = null;
        return true;
      }
      return false;
    };
    if (tryPrefill()) return;
    const retryId = window.setInterval(() => {
      if (tryPrefill()) window.clearInterval(retryId);
    }, 250);
    const stopId = window.setTimeout(() => window.clearInterval(retryId), 5000);
    return () => {
      window.clearInterval(retryId);
      window.clearTimeout(stopId);
    };
  }, [open, chatReady]);

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

  const launcherButton = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={cn(
        "agent-launcher flex pointer-events-auto",
        "flex-col items-center justify-center gap-2 rounded-l-xl border border-r-0 px-2 py-4",
        "min-w-[3.25rem] shadow-lg transition-all duration-200",
        "hover:scale-[1.03] hover:shadow-xl active:scale-[0.98]",
        hasAttention ? "agent-launcher-attention" : "agent-launcher-idle",
        isRTL ? "rounded-l-none rounded-r-xl border-l-0 border-r" : "",
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
  );

  const panelHeader = (
    <div className="mizan-agent-panel-header flex shrink-0 items-center gap-3 border-b border-border/80 bg-card px-3 py-2.5 text-foreground">
      <img
        src="/agent-avatar.webp"
        alt=""
        className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-primary/20"
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div id="agent-chat-title" className="truncate text-[15px] font-semibold leading-tight">
          {t("ai.chat_title") || "Agent"}
        </div>
        <div className="truncate text-[12px] text-muted-foreground">{t("ai.chat_online")}</div>
      </div>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
        aria-label={t("ai.chat_close")}
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );

  const panelBody = initError ? (
    <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
      {initError}
    </div>
  ) : (
    <div className="mizan-agent-panel-body relative flex min-h-0 flex-1 flex-col">
      {!chatReady ? (
        <div className="absolute inset-0 z-[1] flex items-center justify-center bg-background/80 p-6">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : null}
      <div
        id={EMBED_CONTAINER_ID}
        className={cn(
          "mizan-luapop-embed flex h-full min-h-0 w-full flex-1 flex-col",
          "[&_.lua-pop-embedded]:!h-full [&_.lua-pop-embedded]:!max-h-full [&_.lua-pop-embedded-root]:!h-full",
          !chatReady && "invisible",
        )}
      />
    </div>
  );

  const desktopLauncherSide = isRTL ? "left-0" : "right-0";
  const desktopLauncherRadius = isRTL
    ? "rounded-l-none rounded-r-xl border-l-0 border-r"
    : "rounded-l-xl border-r-0";

  return (
    <>
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-[10055] bg-black/20 lg:hidden"
          aria-label={t("ai.chat_close")}
          onClick={() => setOpen(false)}
        />
      ) : null}

      {/* Desktop: fixed edge tab when collapsed */}
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "agent-launcher fixed z-[10050] top-1/2 -translate-y-1/2 hidden lg:flex pointer-events-auto",
            "flex-col items-center justify-center gap-2 border px-2 py-4",
            "min-w-[3.25rem] shadow-lg transition-all duration-200",
            "hover:scale-[1.03] hover:shadow-xl active:scale-[0.98]",
            hasAttention ? "agent-launcher-attention" : "agent-launcher-idle",
            desktopLauncherSide,
            desktopLauncherRadius,
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

      {/* Agent panel — desktop: in-flow sticky column; mobile/tablet: fixed drawer */}
      <aside
        role="complementary"
        aria-labelledby="agent-chat-title"
        aria-hidden={!open}
        data-open={open ? "true" : "false"}
        className={cn(
          "mizan-agent-dock hidden shrink-0 overflow-hidden border-border/80 bg-background shadow-strong",
          "transition-[width,transform] duration-300 ease-out lg:flex",
          open ? "border-s" : "w-0 border-0",
          isRTL && open && "border-s-0 border-e",
          !isRTL && open && "border-s",
          "max-lg:flex",
          isRTL ? "max-lg:left-0 max-lg:border-r" : "max-lg:right-0 max-lg:border-l",
          open
            ? "max-lg:translate-x-0"
            : isRTL
              ? "max-lg:-translate-x-full max-lg:pointer-events-none max-lg:hidden"
              : "max-lg:translate-x-full max-lg:pointer-events-none max-lg:hidden",
        )}
      >
        <div
          className={cn(
            "mizan-agent-panel-shell",
            !open && "pointer-events-none invisible max-lg:invisible",
          )}
        >
          {open ? panelHeader : null}
          {panelBody}
        </div>
      </aside>

      {/* Mobile launcher when collapsed */}
      {!open ? (
        <div
          className={cn(
            "fixed z-[10050] top-1/2 -translate-y-1/2 lg:hidden pointer-events-auto",
            isRTL ? "left-0" : "right-0",
          )}
        >
          {launcherButton}
        </div>
      ) : null}
    </>
  );
};

export default LuaPopAgentWidget;
