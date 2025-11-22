import React, { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { AuthContextType } from '@/contexts/AuthContext.types';

declare global {
    interface Window {
        LuaPop: {
            init: (config: any) => void;
        };
    }
}

export const LuaWidget: React.FC = () => {
    const { user } = useAuth() as AuthContextType;
    const initialized = useRef(false);

    useEffect(() => {
        if (!user) return;

        // Only show for ADMIN or SUPER_ADMIN
        const allowedRoles = ['ADMIN', 'SUPER_ADMIN'];
        if (!allowedRoles.includes(user.role)) return;

        if (window.LuaPop && !initialized.current) {
            window.LuaPop.init({
                agentId: "baseAgent_agent_1762796132079_ob3ln5fkl",

                // Floating button position
                position: "bottom-right",

                // Button - Using emoji in text instead of buttonIcon to avoid broken image issues
                buttonText: "🤖 Chat with AI",
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
                chatTitle: "AI Assistant",
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
                    iconUrl: "/favicon.ico",
                    linkUrl: ""
                },

                // Input
                chatInputPlaceholder: "Ask me anything..."
            });

            initialized.current = true;
        }
    }, [user]);

    return null;
};
