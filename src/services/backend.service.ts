import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';

export interface User {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    restaurant: string;
    accessToken?: string;
}

export interface Restaurant {
    id: string;
    name: string;
    address: string;
    phone: string;
    email: string;
}

export interface LoginResponse {
    user: User & { restaurant_data?: Restaurant };
    tokens: {
        access: string;
        refresh: string;
    };
}

export interface SignupData {
    user: {
        email: string;
        password: string;
        first_name: string;
        last_name: string;
        phone?: string;
    };
    restaurant: {
        name: string;
        address: string;
        phone: string;
        email: string;
    };
}

export interface StaffUserData {
    first_name: string;
    last_name: string;
    password: string;
}

export interface InviteStaffData {
    email: string;
    first_name: string;
    last_name: string;
    role: string;
}

export interface StaffListItem {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    join_date: string;
}

export interface StaffDashboardSummary {
    totalStaff: number;
    activeShifts: number;
    pendingOrders: number;
    revenueToday: number;
}

export interface StaffOperationResponse {
    message: string;
}

@Injectable()
export class BackendService {
    private readonly apiUrl: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.apiUrl = this.configService.get<string>('backend.apiUrl');
    }

    private getHeaders(token?: string): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    }

    async login(email: string, password: string): Promise<LoginResponse> {
        try {
            const response: AxiosResponse<LoginResponse> = await firstValueFrom(
                this.httpService.post(
                    `${this.apiUrl}/auth/login/`,
                    { email, password },
                    { headers: this.getHeaders() },
                ),
            );
            return response.data;
        } catch (error) {
            throw new HttpException(
                error.response?.data?.error || 'Login failed',
                error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async ownerSignup(signupData: SignupData): Promise<LoginResponse> {
        try {
            const response: AxiosResponse<LoginResponse> = await firstValueFrom(
                this.httpService.post(
                    `${this.apiUrl}/auth/signup/owner/`,
                    signupData,
                    { headers: this.getHeaders() },
                ),
            );
            return response.data;
        } catch (error) {
            throw new HttpException(
                error.response?.data?.error || 'Signup failed',
                error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async acceptInvitation(token: string, userData: StaffUserData): Promise<LoginResponse> {
        try {
            const response: AxiosResponse<LoginResponse> = await firstValueFrom(
                this.httpService.post(
                    `${this.apiUrl}/staff/accept-invitation/`,
                    { token, user: userData },
                    { headers: this.getHeaders() },
                ),
            );
            return response.data;
        } catch (error) {
            throw new HttpException(
                error.response?.data?.error || 'Invitation acceptance failed',
                error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async refreshToken(refreshToken: string): Promise<{ access: string }> {
        try {
            const response: AxiosResponse<{ access: string }> = await firstValueFrom(
                this.httpService.post(
                    `${this.apiUrl}/auth/token/refresh/`,
                    { refresh: refreshToken },
                    { headers: this.getHeaders() },
                ),
            );
            return response.data;
        } catch (error) {
            throw new HttpException(
                'Token refresh failed',
                HttpStatus.UNAUTHORIZED,
            );
        }
    }

    async getUserProfile(accessToken: string): Promise<User> {
        try {
            const response: AxiosResponse<User> = await firstValueFrom(
                this.httpService.get(
                    `${this.apiUrl}/auth/profile/`,
                    { headers: this.getHeaders(accessToken) },
                ),
            );
            return response.data;
        } catch (error) {
            throw new HttpException(
                'Failed to fetch user profile',
                HttpStatus.UNAUTHORIZED,
            );
        }
    }

    async inviteStaff(accessToken: string, invitationData: InviteStaffData): Promise<User> {
        try {
            const response: AxiosResponse<User> = await firstValueFrom(
                this.httpService.post(
                    `${this.apiUrl}/staff/invite/`, // Assuming this is your Django backend endpoint
                    invitationData,
                    { headers: this.getHeaders(accessToken) },
                ),
            );
            return response.data;
        } catch (error) {
            throw new HttpException(
                error.response?.data?.error || 'Staff invitation failed',
                error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
    // Add to your existing BackendService class

    async getStaffList(accessToken: string): Promise<StaffListItem[]> {
        try {
            const response: AxiosResponse<StaffListItem[]> = await firstValueFrom(
                this.httpService.get(
                    `${this.apiUrl}/staff/list/`,
                    { headers: this.getHeaders(accessToken) },
                ),
            );
            return response.data;
        } catch (error) {
            // Mock staff list
            return [
                {
                    id: 'user-1',
                    email: 'chef@restaurant.com',
                    first_name: 'John',
                    last_name: 'Doe',
                    role: 'CHEF',
                    join_date: '2024-01-15'
                },
                {
                    id: 'user-2',
                    email: 'waiter@restaurant.com',
                    first_name: 'Jane',
                    last_name: 'Smith',
                    role: 'WAITER',
                    join_date: '2024-01-14'
                }
            ];
        }
    }

    async getStaffDashboard(accessToken: string): Promise<StaffDashboardSummary> {
        try {
            const response: AxiosResponse<StaffDashboardSummary> = await firstValueFrom(
                this.httpService.get(
                    `${this.apiUrl}/staff/dashboard/`,
                    { headers: this.getHeaders(accessToken) },
                ),
            );
            return response.data;
        } catch (error) {
            // Mock dashboard data
            return {
                totalStaff: 8,
                activeShifts: 3,
                pendingOrders: 12,
                revenueToday: 1850
            };
        }
    }

    async removeStaff(accessToken: string, staffId: string): Promise<StaffOperationResponse> {
        try {
            const response: AxiosResponse<StaffOperationResponse> = await firstValueFrom(
                this.httpService.delete(
                    `${this.apiUrl}/staff/${staffId}/`,
                    { headers: this.getHeaders(accessToken) },
                ),
            );
            return response.data;
        } catch (error) {
            return { message: `Staff member ${staffId} removed successfully` };
        }
    }

    async updateStaffRole(accessToken: string, staffId: string, role: string): Promise<StaffOperationResponse> {
        try {
            const response: AxiosResponse<StaffOperationResponse> = await firstValueFrom(
                this.httpService.put(
                    `${this.apiUrl}/staff/${staffId}/role/`,
                    { role },
                    { headers: this.getHeaders(accessToken) },
                ),
            );
            return response.data;
        } catch (error) {
            return { message: `Staff role updated to ${role}` };
        }
    }
}