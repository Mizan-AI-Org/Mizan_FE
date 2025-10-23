import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './use-auth'; // Assuming you have a useAuth hook

const IDLE_TIMEOUT_SECONDS = 60 * 60; // 1 hour (increased from 15 minutes)

export const useIdleTimeout = () => {
    const { logout, user } = useAuth();
    const timeoutRef = useRef<number | null>(null);

    const resetTimeout = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        if (user) { // Only set timeout if user is logged in
            timeoutRef.current = setTimeout(() => {
                console.log("User idle, logging out...");
                logout();
            }, IDLE_TIMEOUT_SECONDS * 1000) as unknown as number;
        }
    }, [logout, user]);

    useEffect(() => {
        // Attach event listeners for user activity
        const events = ['mousemove', 'keydown', 'scroll', 'click'];
        events.forEach(event => {
            window.addEventListener(event, resetTimeout);
        });

        resetTimeout(); // Initialize the timeout on component mount

        return () => {
            // Clean up event listeners and clear timeout on component unmount
            events.forEach(event => {
                window.removeEventListener(event, resetTimeout);
            });
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [resetTimeout]);
};
