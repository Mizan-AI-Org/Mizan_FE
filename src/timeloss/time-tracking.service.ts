import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

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
                    `${this.apiUrl}/timeclock/clock-in/`,
                    { user_id: userId },
                ),
            );
            return response.data;
        } catch (error) {
            throw new HttpException(
                'Failed to clock in. Please try again.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async clockOut(userId: string): Promise<ClockInOutResponse> {
        try {
            const response = await firstValueFrom(
                this.httpService.post<ClockInOutResponse>(
                    `${this.apiUrl}/timeclock/clock-out/`,
                    { user_id: userId },
                ),
            );
            return response.data;
        } catch (error) {
            throw new HttpException(
                'Failed to clock out. Please try again.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async takeBreak(userId: string): Promise<BreakResponse> {
        try {
            const response = await firstValueFrom(
                this.httpService.post<BreakResponse>(
                    `${this.apiUrl}/timeclock/break/start/`,
                    { user_id: userId },
                ),
            );
            return response.data;
        } catch (error) {
            throw new HttpException(
                'Failed to start break. Please try again.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async endBreak(userId: string): Promise<BreakResponse> {
        try {
            const response = await firstValueFrom(
                this.httpService.post<BreakResponse>(
                    `${this.apiUrl}/timeclock/break/end/`,
                    { user_id: userId },
                ),
            );
            return response.data;
        } catch (error) {
            throw new HttpException(
                'Failed to end break. Please try again.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async getCurrentStatus(userId: string): Promise<CurrentStatusResponse> {
        try {
            const response = await firstValueFrom(
                this.httpService.get<CurrentStatusResponse>(
                    `${this.apiUrl}/timeclock/current-session/`,
                    { params: { user_id: userId } },
                ),
            );
            return response.data;
        } catch (error) {
            throw new HttpException(
                'Failed to get current status. Please try again.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async getHistory(restaurantId: string, startDate: string, endDate: string): Promise<HistoryEntry[]> {
        try {
            const response = await firstValueFrom(
                this.httpService.get<HistoryEntry[]>(
                    `${this.apiUrl}/timeclock/attendance-history/`,
                    { params: { start_date: startDate, end_date: endDate } },
                ),
            );
            return response.data;
        } catch (error) {
            throw new HttpException(
                'Failed to get time tracking history. Please try again.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async getOverview(restaurantId: string): Promise<OverviewData> {
        try {
            const response = await firstValueFrom(
                this.httpService.get<OverviewData>(
                    `${this.apiUrl}/timeclock/overview/`,
                    { params: { restaurant_id: restaurantId } },
                ),
            );
            return response.data;
        } catch (error) {
            throw new HttpException(
                'Failed to get overview data. Please try again.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async getStaffDashboardData(userId: string): Promise<StaffDashboardData> {
        try {
            const response = await firstValueFrom(
                this.httpService.get<StaffDashboardData>(
                    `${this.apiUrl}/timeclock/staff-dashboard/`,
                    { params: { user_id: userId } },
                ),
            );
            return response.data;
        } catch (error) {
            throw new HttpException(
                'Failed to get staff dashboard data. Please try again.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}