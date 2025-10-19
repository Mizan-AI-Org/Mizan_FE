import { SignupData, StaffUserData } from '../services/backend.service';

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
}

export interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    ownerSignup: (signupData: SignupData) => Promise<void>;
    acceptInvitation: (token: string, userData: StaffUserData) => Promise<void>;
    logout: () => void;
    hasRole: (roles: string[]) => boolean;
    isSuperAdmin: () => boolean;
    isAdmin: () => boolean;
    isStaff: () => boolean;
}
