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
            throw new HttpException(
                'Failed to get today\'s schedule. Please try again.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
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
            throw new HttpException(
                'Failed to get upcoming shifts. Please try again.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
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
            throw new HttpException(
                'Failed to submit time off request. Please try again.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
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
            throw new HttpException(
                'Failed to get schedule. Please try again.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
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
            throw new HttpException(
                'Failed to create shift. Please try again.',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}