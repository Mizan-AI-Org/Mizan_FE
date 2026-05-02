/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { AuthContextType } from '@/contexts/AuthContext.types';
import { useLanguage } from '@/hooks/use-language';
import { useBusinessVertical } from '@/hooks/use-business-vertical';
import { logError } from '@/lib/logging';

declare global {
    interface Window {
        LuaPop: {
            init: (config: any) => { destroy: () => void };
        };
    }
}

export const LuaWidget: React.FC = () => {
    const { user, accessToken } = useAuth() as AuthContextType;
    const { t, language, isRTL } = useLanguage();
    const businessVerticalQuery = useBusinessVertical();
    const location = useLocation();
    const takeOrdersMode = location.pathname.includes('take-orders');
    const initialized = useRef<string | boolean>(false);
    const widgetRef = useRef<{ destroy: () => void } | null>(null);
    const agentId = import.meta.env.VITE_LUA_AGENT_ID as string | undefined;

    // Tear down the widget when user logs out so chat history doesn't persist
    useEffect(() => {
        if (!user) {
            if (widgetRef.current) {
                try { widgetRef.current.destroy(); } catch (_) { /* ignore */ }
                widgetRef.current = null;
            }
            // Remove leftover DOM from previous session
            const host = document.querySelector('#lua-shadow-root');
            if (host) host.remove();
            initialized.current = false;
        }
    }, [user]);

    // Robust Shadow DOM Injection
    useEffect(() => {
        if (!user) return;

        const intervalId = setInterval(() => {
            const shadowHost = document.querySelector('#lua-shadow-root');
            if (shadowHost && shadowHost.shadowRoot) {
                // Replace our style if it already exists (so language/RTL can update live)
                const existing = shadowHost.shadowRoot.querySelector('#miya-custom-styles');
                if (existing) existing.remove();

                const style = document.createElement('style');
                style.id = 'miya-custom-styles';
                const chatLabel = (t("ai.chat_button") || "Chat with Miya").replace(/"/g, '\\"');
                style.textContent = `
                    /* Force the avatar image to fill the entire circular button */
                    button.lua-pop-button img {
                        width: 100% !important;
                        height: 100% !important;
                        max-width: none !important;
                        max-height: none !important;
                        object-fit: cover !important;
                        border-radius: 50% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    /* Ensure the label is visible outside the button */
                    .lua-pop-button {
                        overflow: visible !important;
                        position: relative !important;
                        background: white !important; /* Fallback background */
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
                    }

                    .lua-pop-button:hover {
                        transform: scale(1.1) translateY(-5px) !important;
                    }
                    
                    /* "Chat with Miya" Label */
                    .lua-pop-button::after {
                        content: "${chatLabel}";
                        position: absolute;
                        bottom: -40px;
                        left: 50%;
                        transform: translateX(-50%);
                        background: linear-gradient(135deg, #00E676 0%, #00C853 100%);
                        color: white !important;
                        padding: 6px 16px;
                        border-radius: 30px;
                        font-family: inherit;
                        font-size: 14px;
                        font-weight: 700;
                        white-space: nowrap;
                        box-shadow: 0 4px 15px rgba(0, 230, 118, 0.3);
                        border: 2px solid white;
                        z-index: 100 !important;
                        pointer-events: none;
                        display: block !important;
                        visibility: visible !important;
                        opacity: 1 !important;
                    }

                    /* RTL support (Arabic) */
                    ${isRTL ? `
                    .lua-pop-container,
                    .lua-pop-chat,
                    .lua-pop-messages,
                    .lua-pop-message,
                    .lua-pop-input-container {
                        direction: rtl !important;
                        text-align: right !important;
                    }
                    ` : ''}
                `;
                shadowHost.shadowRoot.appendChild(style);
            }
        }, 1000); // 1s interval is fine
        return () => clearInterval(intervalId);
    }, [user, language, isRTL, t]);

    useEffect(() => {
        if (!user) return;
        if (businessVerticalQuery.isPending) return;

        const businessVertical = businessVerticalQuery.data?.businessVertical ?? "RESTAURANT";

        // Managers + front-of-house who take orders with Miya (voice/text)
        const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'OWNER', 'WAITER', 'CASHIER', 'CHEF'];
        if (!allowedRoles.includes(user.role)) {
            console.log("[LuaWidget] Hide for role:", user.role);
            return;
        }

        if (!agentId) {
            logError({ feature: 'lua-widget', action: 'init' }, new Error('Missing VITE_LUA_AGENT_ID'));
            return;
        }

        if (window.LuaPop && accessToken) {
            // Base identity for backend/webhook linkage
            const restaurantIdForSession = user.restaurant_data?.id
                ?? (typeof user.restaurant === "string" ? user.restaurant : (user.restaurant as { id?: string })?.id)
                ?? user.restaurant;
            const baseSessionId = `tenant-${restaurantIdForSession}-user-${user.id}`;
            // Per-login nonce ensures a fresh conversation after every logout/login cycle
            let loginNonce = sessionStorage.getItem('lua_login_nonce');
            if (!loginNonce) {
                loginNonce = Date.now().toString(36);
                sessionStorage.setItem('lua_login_nonce', loginNonce);
            }
            const sessionId = `${baseSessionId}-${loginNonce}`;
            const initMarker = `${sessionId}:${businessVertical}`;
            if (initialized.current === initMarker) return;

            if (widgetRef.current) {
                try {
                    widgetRef.current.destroy();
                } catch (_) {
                    /* ignore */
                }
                widgetRef.current = null;
            }

            console.log("[LuaWidget] Initializing fresh Miya session:", sessionId, "vertical:", businessVertical);
            try {
                const now = new Date();
                const userFullName = `${user.first_name} ${user.last_name}`.trim() || "Unknown User";

                const restaurantId = user.restaurant_data?.id
                    ?? (typeof user.restaurant === "string" ? user.restaurant : (user.restaurant as { id?: string })?.id)
                    ?? user.restaurant;
                const restaurantName = user.restaurant_data?.name || user.restaurant_name
                    || (typeof user.restaurant === "object" && user.restaurant !== null ? (user.restaurant as { name?: string }).name : undefined);
                console.log("[LuaWidget] Initializing with context:", {
                    restaurantName: restaurantName || "Unknown",
                    restaurantId,
                    role: user.role,
                    businessVertical,
                });

                widgetRef.current = window.LuaPop.init({
                    agentId,
                    environment: "production",
                    apiUrl: "https://api.heylua.ai",
                    token: accessToken,
                    accessToken: accessToken, // Pass twice for safety

                    // Structured context (preferred over runtimeContext string)
                    // Helps the agent avoid asking for restaurant ID.
                    metadata: {
                        restaurantId,
                        restaurantName: restaurantName || user.restaurant_data?.name || user.restaurant_name || "Unknown",
                        businessVertical,
                        userId: user.id,
                        role: user.role,
                        token: accessToken,
                        sessionId: baseSessionId, // stable identity for backend
                        language,
                        rtl: isRTL,
                    },

                    // User identification (for Lua Admin portal)
                    fullName: userFullName,
                    emailAddress: user.email,

                    // Voice Configuration
                    voiceModeEnabled: true,
                    sttEnabled: true,
                    ttsEnabled: true,
                    voiceResponseEnabled: false,
                    // ar-MA for Arabic: better Darija (Moroccan) support; fr-FR for French; en-US for English
                    speechRecognitionLanguage: language === "ar" ? "ar-MA" : (language === "fr" ? "fr-FR" : "en-US"),

                    // Session context – date suffix gives fresh conversation each day; metadata preserves user+restaurant context
                    sessionId,
                    runtimeContext: [
                        // Canonical `Restaurant: NAME (ID: XXX)` form is what the TenantContextPreprocessor
                        // regex is written against — put it FIRST so the preprocessor reliably injects
                        // [SYSTEM: PERSISTENT CONTEXT] on every turn. Without this prefix, the preprocessor
                        // never sees a restaurant and Miya falls back to "I don't have the restaurant context".
                        `Restaurant: ${restaurantName || user.restaurant_data?.name || user.restaurant_name || "Unknown"} (ID: ${restaurantId})`,
                        `User: ${userFullName} (ID: ${user.id})`,
                        `Role: ${user.role}`,
                        `Token: ${accessToken}`,
                        `business_vertical: ${businessVertical} | tenant_id (API field restaurant_id): ${restaurantId} | Current time: ${now.toLocaleDateString()} ${now.toLocaleTimeString()} (${Intl.DateTimeFormat().resolvedOptions().timeZone})`,
                        "Operational directives: You are Miya, the AI Operations Manager for this Mizan workspace only. Mizan is multi-vertical (restaurant, retail, manufacturing, construction, healthcare operations, hospitality, professional services, other). Use business_vertical to choose appropriate language; restaurant_id is always the tenant/workspace id. Never hallucinate: verify every answer from the database using that tenant id, date, and staff. Execute actions only when permitted and after validating permissions, staff, and shift exist. Respect role: managers get full team visibility and recommendations; staff see only their own data. Resolve relative dates (e.g. Tuesday 17th) to the current calendar week. When giving insights, label as Verified Data (state confidently), Recommendation (predictive), or Missing Data (state limitation). Precision over creativity; verification over assumption.",
                        takeOrdersMode
                            ? "Order-taking mode: For every guest order, capture and confirm: customer name; phone for takeout/delivery; order type (dine-in, takeout, delivery); table or pickup location; each menu item with quantity and modifiers; allergens and dietary restrictions; special instructions; repeat the full order back for confirmation before closing. Help staff log details accurately."
                            : "",
                    ].filter(Boolean).join(" | "),

                    position: "bottom-right",

                    // Button visuals
                    buttonIcon: "/miya-avatar.webp",
                    buttonText: "",
                    buttonColor: "transparent",

                    // Base container styles
                    popupButtonStyles: {
                        borderRadius: "50%",
                        width: "110px",
                        height: "110px",
                        padding: "0",
                        fontSize: "0",
                        boxShadow: "0 15px 35px rgba(0, 230, 118, 0.5)",
                        border: "5px solid #1cc774",
                        animation: "float 4s ease-in-out infinite",
                    },

                    // Positioning
                    popupButtonPositionalContainerStyles: {
                        bottom: "75px",
                        right: "45px",
                        zIndex: "9999"
                    },

                    chatTitle: t("ai.chat_title") || "Miya",
                    chatTitleHeaderStyles: {
                        background: "linear-gradient(135deg, #00E676 0%, #00C853 100%)",
                        color: "white",
                        padding: "16px 20px",
                        borderRadius: "12px 12px 0 0",
                        fontWeight: "700"
                    },

                    chatHeaderSubtitle: {
                        visible: true,
                        brandName: t("common.brand") || "Mizan AI"
                    },

                    chatInputPlaceholder: t("ai.chat_placeholder")
                });
                initialized.current = initMarker;
            } catch (err) {
                logError({ feature: 'lua-widget', action: 'init' }, err as Error);
            }
        }
    }, [user, t, agentId, accessToken, language, isRTL, takeOrdersMode, businessVerticalQuery.isPending, businessVerticalQuery.data?.businessVertical]);

    return null;
};
