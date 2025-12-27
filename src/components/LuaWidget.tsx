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
    const { t } = useLanguage();
    const initialized = useRef(false);
    const agentId = import.meta.env.VITE_LUA_AGENT_ID as string | undefined;

    useEffect(() => {
        if (!user) return;

        // Only show for ADMIN or SUPER_ADMIN
        const allowedRoles = ['ADMIN', 'SUPER_ADMIN'];
        if (!allowedRoles.includes(user.role)) return;

        if (!agentId) {
            logError({ feature: 'lua-widget', action: 'init' }, new Error('Missing VITE_LUA_AGENT_ID'));
            return;
        }

        if (window.LuaPop && !initialized.current) {
            window.LuaPop.init({
                agentId,
                environment: "production",
                apiUrl: "https://api.heylua.ai",
                voiceModeEnabled: true,
                // Embed context in sessionId 
                sessionId: `tenant-${user.restaurant_data?.id || user.restaurant}-name-${btoa(encodeURIComponent(user.restaurant_data?.name || "Unknown Restaurant"))}-user-${user.id}`,

                // Pass auth token and context metadata
                metadata: {
                    token: accessToken,
                    restaurantId: user.restaurant_data?.id || user.restaurant,
                    userId: user.id,
                    role: user.role
                },

                // Floating button position
                position: "bottom-right",

                // Button - Using emoji in text instead of buttonIcon to avoid broken image issues
                buttonText: t("ai.chat_button"),
                buttonColor: "#1cc774ff",

                // Button custom styles
                popupButtonStyles: {
                    borderRadius: "30px",
                    padding: "12px 24px",
                    fontSize: "15px",
                    fontWeight: "600",
                    boxShadow: "0 8px 20px rgba(0, 230, 118, 0.3)",
                    border: "2px solid rgba(255, 255, 255, 0.3)"
                },

                // Positioning
                popupButtonPositionalContainerStyles: {
                    bottom: "25px",
                    right: "25px",
                    zIndex: "9999"
                },

                // Chat header
                chatTitle: t("ai.chat_title"),
                chatTitleHeaderStyles: {
                    background: "linear-gradient(135deg, #00E676 0%, #00C853 100%)",
                    color: "white",
                    padding: "16px 20px",
                    borderRadius: "12px 12px 0 0",
                    fontWeight: "700"
                },

                // Branding
                chatHeaderSubtitle: {
                    visible: true,
                    brandName: "Mizan AI",
                    iconUrl: "",
                    linkUrl: ""
                },

                // Input
                chatInputPlaceholder: t("ai.chat_placeholder"),

                // Voice Config
                voice: {
                    enabled: true,
                },

                // UI preferences
                showBotIcon: false,
                buttonIcon: "", // Ensure no default icon
                showLauncherIcon: false, // Valid for some versions
                botAvatar: "", // Hide avatar in chat if possible
            });

            initialized.current = true;
        }
    }, [user, t, agentId]);

    return null;
};
