/* eslint-disable @typescript-eslint/no-explicit-any */
import { SignupData } from "../lib/types";

export interface BranchBrief {
    id: string;
    name: string;
    isPrimary?: boolean;
    timezone?: string;
}

/** Branches this person covers (login / me payload). multiBranch false = a single-branch business. */
export interface BranchScopePayload {
    multiBranch: boolean;
    all: boolean;
    home: BranchBrief | null;
    visible: BranchBrief[];
    managed: string[];
    allowed: string[];
}

export interface User {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    is_staff?: boolean;
    is_superuser?: boolean;
    is_platform_operator?: boolean;
    restaurant: string;
    restaurant_name: string;
    restaurant_data?: {
        id: string;
        name: string;
        address: string;
        language?: string;
        onboarding_completed_at?: string | null;
        onboarding_state?: Record<string, boolean>;
    };
    phone?: string;
    preferred_language?: string | null;
    profile?: {
        emergency_contact_name?: string;
        emergency_contact_phone?: string;
    };
    branch_scope?: BranchScopePayload;
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
    logout: () => void;
    hasRole: (roles: string[]) => boolean;
    isSuperAdmin: () => boolean;
    isAdmin: () => boolean;
    isStaff: () => boolean;
}
