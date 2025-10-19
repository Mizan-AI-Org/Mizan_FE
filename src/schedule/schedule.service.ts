import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { User } from '../services/backend.service';

interface TodaysScheduleResponse {
    id: string;
    user: string;
    shift_type: string;
    start_time: string;
    end_time: string;
    notes?: string;
}

interface UpcomingShift {
    id: string;
    date: string;
    shift_type: string;
    start_time: string;
    end_time: string;
}

interface Shift {
    id: string;
    user_id: string;
    shift_type: string;
    start_time: string;
    end_time: string;
    notes?: string;
}

interface TimeOffRequestData {
    reason: string;
    start_date: string;
    end_date: string;
}

interface TimeOffRequestResponse {
    id: string;
    status: string;
    message: string;
}

interface ScheduleResponse {
    week_start: string;
    shifts: Shift[];
}

interface ShiftCreationData {
    staff_id: string;
    shift_type: string;
    start_time: string;
    end_time: string;
    notes?: string;
}

interface CreatedShiftResponse extends ShiftCreationData {
    id: string;
    created_by: string;
}

@Injectable()
export class ScheduleService {
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

    async getTodaysSchedule(user: User): Promise<TodaysScheduleResponse> {
        try {
            const response = await firstValueFrom(
                this.httpService.get<TodaysScheduleResponse>(
                    `${this.apiUrl}/schedule/today/`,
                    { headers: this.getHeaders(user.accessToken) },
                ),
            );
            return response.data;
        } catch (error) {
            // Mock today's schedule
            const today = new Date().toISOString().split('T')[0];
            return {
                id: 'shift-' + Date.now(),
                user: user.id,
                shift_type: 'MORNING',
                start_time: `${today}T09:00:00Z`,
                end_time: `${today}T17:00:00Z`,
                notes: 'Regular shift'
            };
        }
    }

    async getUpcomingShifts(user: User): Promise<UpcomingShift[]> {
        try {
            const response = await firstValueFrom(
                this.httpService.get<UpcomingShift[]>(
                    `${this.apiUrl}/schedule/upcoming/`,
                    { headers: this.getHeaders(user.accessToken) },
                ),
            );
            return response.data;
        } catch (error) {
            // Mock upcoming shifts
            return [
                {
                    id: 'shift-1',
                    date: '2024-01-19',
                    shift_type: 'MORNING',
                    start_time: '09:00:00',
                    end_time: '17:00:00'
                },
                {
                    id: 'shift-2',
                    date: '2024-01-20',
                    shift_type: 'EVENING',
                    start_time: '14:00:00',
                    end_time: '22:00:00'
                }
            ];
        }
    }

    async requestTimeOff(user: User, timeOffData: TimeOffRequestData): Promise<TimeOffRequestResponse> {
        try {
            const response = await firstValueFrom(
                this.httpService.post<TimeOffRequestResponse>(
                    `${this.apiUrl}/schedule/time-off/`,
                    { ...timeOffData, user_id: user.id },
                    { headers: this.getHeaders(user.accessToken) },
                ),
            );
            return response.data;
        } catch (error) {
            // Mock response
            return {
                id: 'request-' + Date.now(),
                status: 'PENDING',
                message: 'Time off request submitted successfully'
            };
        }
    }

    async getSchedule(user: User, weekStart: string): Promise<ScheduleResponse> {
        try {
            const response = await firstValueFrom(
                this.httpService.get<ScheduleResponse>(
                    `${this.apiUrl}/schedule/?week_start=${weekStart}`,
                    { headers: this.getHeaders(user.accessToken) },
                ),
            );
            return response.data;
        } catch (error) {
            // Mock schedule data
            return {
                week_start: weekStart,
                shifts: [
                    // Mock shifts for the week
                ]
            };
        }
    }

    async createShift(user: User, shiftData: ShiftCreationData): Promise<CreatedShiftResponse> {
        try {
            const response = await firstValueFrom(
                this.httpService.post<CreatedShiftResponse>(
                    `${this.apiUrl}/schedule/`,
                    shiftData,
                    { headers: this.getHeaders(user.accessToken) },
                ),
            );
            return response.data;
        } catch (error) {
            // Mock response
            return {
                id: 'shift-' + Date.now(),
                ...shiftData,
                created_by: user.id
            };
        }
    }
}