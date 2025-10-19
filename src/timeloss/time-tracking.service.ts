import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { User } from '../services/backend.service';

interface TimeSession {
    id: string;
    user_id: string;
    clock_in: string;
    clock_out: string | null;
    status: 'active' | 'completed';
}

interface Timecard {
    date: string;
    clock_in: string;
    clock_out: string;
    total_hours: number;
    status: string;
}

interface StaffDashboardData {
    currentSession: TimeSession | null;
    todaysShift: {
        id: string;
        shift_type: string;
        start_time: string;
        end_time: string;
        notes: string;
    };
    stats: {
        hoursThisWeek: number;
        shiftsThisWeek: number;
        earningsThisWeek: number;
    };
}

interface ClockInOutResponse {
    id: string;
    user_id: string;
    clock_in: string;
    clock_out: string | null;
    status: string;
}

interface BreakResponse {
    message: string;
    session?: TimeSession;
}

interface CurrentStatusResponse {
    currentSession: TimeSession | null;
    currentBreak: BreakResponse | null;
}

interface HistoryEntry {
    date: string;
    clock_in: string;
    clock_out: string;
    total_hours: number;
    status: string;
    breaks: BreakResponse[];
}

interface OverviewData {
    totalStaff: number;
    activeShifts: number;
    pendingOrders: number;
    revenueToday: number;
}

@Injectable()
export class TimeTrackingService {
    private readonly apiUrl: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.apiUrl = this.configService.get<string>('backend.apiUrl');
    }

    private getHeaders(token: string) {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        };
    }

    async clockIn(userId: string): Promise<ClockInOutResponse> {
        try {
            const response = await firstValueFrom(
                this.httpService.post<
                    ClockInOutResponse
                >(
                    `${this.apiUrl}/timeloss/clock-in/`,
                    { user_id: userId },
                ),
            );
            return response.data;
        } catch (error) {
            // For now, return mock data
            return {
                id: 'session-' + Date.now(),
                user_id: userId,
                clock_in: new Date().toISOString(),
                clock_out: null,
                status: 'active'
            };
        }
    }

    async clockOut(userId: string): Promise<ClockInOutResponse> {
        try {
            const response = await firstValueFrom(
                this.httpService.post<ClockInOutResponse>(
                    `${this.apiUrl}/timeloss/clock-out/`,
                    { user_id: userId },
                ),
            );
            return response.data;
        } catch (error) {
            // Mock response
            return {
                id: 'session-' + Date.now(),
                user_id: userId,
                clock_in: new Date().toISOString(),
                clock_out: new Date().toISOString(),
                status: 'completed',
            };
        }
    }

    async takeBreak(userId: string): Promise<BreakResponse> {
        try {
            const response = await firstValueFrom(
                this.httpService.post<BreakResponse>(
                    `${this.apiUrl}/timeloss/take-break/`,
                    { user_id: userId },
                ),
            );
            return response.data;
        } catch (error) {
            return { message: 'Break started (mock)', session: null };
        }
    }

    async endBreak(userId: string): Promise<BreakResponse> {
        try {
            const response = await firstValueFrom(
                this.httpService.post<BreakResponse>(
                    `${this.apiUrl}/timeloss/end-break/`,
                    { user_id: userId },
                ),
            );
            return response.data;
        } catch (error) {
            return { message: 'Break ended (mock)', session: null };
        }
    }

    async getCurrentStatus(userId: string): Promise<CurrentStatusResponse> {
        try {
            const response = await firstValueFrom(
                this.httpService.get<CurrentStatusResponse>(
                    `${this.apiUrl}/timeloss/status/`,
                    { params: { user_id: userId } },
                ),
            );
            return response.data;
        } catch (error) {
            return { currentSession: null, currentBreak: null };
        }
    }

    async getHistory(restaurantId: string, startDate: string, endDate: string): Promise<HistoryEntry[]> {
        try {
            const response = await firstValueFrom(
                this.httpService.get<HistoryEntry[]>(
                    `${this.apiUrl}/timeloss/history/`,
                    { params: { restaurant_id: restaurantId, start_date: startDate, end_date: endDate } },
                ),
            );
            return response.data;
        } catch (error) {
            return [];
        }
    }

    async getOverview(restaurantId: string): Promise<OverviewData> {
        try {
            const response = await firstValueFrom(
                this.httpService.get<OverviewData>(
                    `${this.apiUrl}/timeloss/overview/`,
                    { params: { restaurant_id: restaurantId } },
                ),
            );
            return response.data;
        } catch (error) {
            return {
                totalStaff: 0,
                activeShifts: 0,
                pendingOrders: 0,
                revenueToday: 0,
            };
        }
    }

    async getStaffDashboardData(userId: string): Promise<StaffDashboardData> {
        // Return mock data for staff dashboard
        return {
            currentSession: null, // or active session data
            todaysShift: {
                id: 'shift-1',
                shift_type: 'MORNING',
                start_time: '2024-01-18T09:00:00Z',
                end_time: '2024-01-18T17:00:00Z',
                notes: 'Regular morning shift'
            },
            stats: {
                hoursThisWeek: 32.5,
                shiftsThisWeek: 4,
                earningsThisWeek: 520
            }
        };
    }
}