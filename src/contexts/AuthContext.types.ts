/* eslint-disable @typescript-eslint/no-explicit-any */
import { SignupData } from "../lib/types";

export interface User {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    restaurant: string;
    restaurant_data?: {
        id: string;
        name: string;
        address: string;
    };
    phone?: string;
    profile?: {
        emergency_contact_name?: string;
        emergency_contact_phone?: string;
    };
}

export interface AuthContextType {
    [x: string]: any;
    user: User | null;
    isLoading: boolean;
    accessToken: string | null;
    refreshToken: string | null;
    updateUser: (user: User) => void;
    login: (email: string, password: string) => Promise<void>;
    loginWithPin: (
        pin: string,
        email?: string | null,
        imageData?: string | null,
        latitude?: number | null,
        longitude?: number | null
    ) => Promise<void>;
    ownerSignup: (signupData: SignupData) => Promise<void>;
    acceptInvitation: (
        token: string,
        first_name: string,
        last_name: string,
        password: string,
        pin_code: string | null,
        invitation_pin?: string | null
    ) => Promise<void>;
    inviteStaff: (
        accessToken: string,
        inviteData: { email: string; role: string; first_name?: string; last_name?: string; phone_number?: string }
    ) => Promise<any>;
    logout: () => void;
    hasRole: (roles: string[]) => boolean;
    isSuperAdmin: () => boolean;
    isAdmin: () => boolean;
    isStaff: () => boolean;
}
