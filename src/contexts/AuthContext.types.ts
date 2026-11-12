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
        /** "agency" for a facility agency account (jobs from the restaurants it services). */
        restaurant_type?: string;
    };
    phone?: string;
    /** The person's own language (falls back to the business's on the server). Drives the app, Miya and WhatsApp. */
    language?: string | null;
    /** False: the person hasn't picked a language and follows the business default. */
    language_chosen?: boolean;
    preferred_language?: string | null;
    profile?: {
        emergency_contact_name?: string;
        emergency_contact_phone?: string;
    };
    branch_scope?: BranchScopePayload;
    /** One person, several businesses: every business they can open (empty when only one). */
    businesses?: UserBusiness[];
}

export interface UserBusiness {
    userId: string;
    restaurantId: string;
    name: string;
    role: string;
    /** Allowed on the web app in that business (staff accounts are WhatsApp-only). */
    web: boolean;
    current: boolean;
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
    /** Open another business this person runs (a new session for that business, then a full reload). */
    switchBusiness: (userId: string) => Promise<void>;
    hasRole: (roles: string[]) => boolean;
    isSuperAdmin: () => boolean;
    isAdmin: () => boolean;
    isStaff: () => boolean;
}
