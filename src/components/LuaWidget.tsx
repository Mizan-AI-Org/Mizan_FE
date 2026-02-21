/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { AuthContextType } from '@/contexts/AuthContext.types';
import { useLanguage } from '@/hooks/use-language';
import { logError } from '@/lib/logging';

declare global {
    interface Window {
        LuaPop: {
            init: (config: any) => void;
        };
    }
}

export const LuaWidget: React.FC = () => {
    const { user, accessToken } = useAuth() as AuthContextType;
    const { t, language, isRTL } = useLanguage();
    const initialized = useRef<string | boolean>(false);
    const agentId = import.meta.env.VITE_LUA_AGENT_ID as string | undefined;

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

        // Show for ADMIN, SUPER_ADMIN, MANAGER, and OWNER
        const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'OWNER'];
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
            const baseSessionId = `tenant-${user.restaurant_data?.id || user.restaurant}-user-${user.id}`;
            // Append date for fresh daily conversations – keeps chat UI clean while metadata
            // (userId, restaurantId, fullName) ensures Miya always knows who's chatting and restaurant context
            const today = new Date().toISOString().slice(0, 10); // yyyy-MM-dd
            const sessionId = `${baseSessionId}-${today}`;

            if (initialized.current === sessionId) return;

            console.log("[LuaWidget] Initializing fresh Miya session:", sessionId);
            try {
                const now = new Date();
                const userFullName = `${user.first_name} ${user.last_name}`.trim() || "Unknown User";

                console.log("[LuaWidget] Initializing with context:", {
                    restaurantName: user.restaurant_data?.name || user.restaurant_name,
                    restaurantId: user.restaurant_data?.id || user.restaurant,
                    role: user.role
                });

                window.LuaPop.init({
                    agentId,
                    environment: "production",
                    apiUrl: "https://api.heylua.ai",
                    token: accessToken,
                    accessToken: accessToken, // Pass twice for safety

                    // Structured context (preferred over runtimeContext string)
                    // Helps the agent avoid asking for restaurant ID.
                    metadata: {
                        restaurantId: user.restaurant_data?.id || user.restaurant,
                        restaurantName: user.restaurant_data?.name || user.restaurant_name,
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
                        `Restaurant: ${user.restaurant_data?.name || user.restaurant_name || "Unknown"} (ID: ${user.restaurant_data?.id || user.restaurant}), User: ${userFullName} (ID: ${user.id}), Role: ${user.role}, Token: ${accessToken}, Current Time: ${now.toLocaleDateString()} ${now.toLocaleTimeString()} (${Intl.DateTimeFormat().resolvedOptions().timeZone})`,
                        "Operational directives: You are Miya, the AI Operations Manager for this restaurant only. Never hallucinate: verify every answer from the database, filtered by restaurant_id, date, and staff. Execute actions only when permitted and after validating permissions, staff, and shift exist. Respect role: managers get full team visibility and recommendations; staff see only their own data. Resolve relative dates (e.g. Tuesday 17th) to the current calendar week. When giving insights, label as Verified Data (state confidently), Recommendation (predictive), or Missing Data (state limitation). Precision over creativity; verification over assumption.",
                    ].join(" | "),

                    position: "bottom-right",

                    // Button visuals
                    buttonIcon: "/miya-avatar.png",
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
                initialized.current = sessionId;
            } catch (err) {
                logError({ feature: 'lua-widget', action: 'init' }, err as Error);
            }
        }
    }, [user, t, agentId, accessToken, language, isRTL]);

    return null;
};
