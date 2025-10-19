import { Controller, Get, Post, Body, UseGuards, Req, Query } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { ScheduleService } from '../schedule/schedule.service.ts';
import { User } from '../services/backend.service';

declare module 'express' {
    interface Request {
        user?: User;
    }
}

interface TimeOffRequest {
    reason: string;
    start_date: string;
    end_date: string;
}

interface ShiftCreationData {
    staff_id: string;
    shift_type: string;
    start_time: string;
    end_time: string;
    notes?: string;
}

@Controller('schedule')
@UseGuards(JwtAuthGuard)
export class ScheduleController {
    constructor(private readonly scheduleService: ScheduleService) { }

    @Get('today')
    async getTodaysSchedule(@Req() request: Request) {
        const user = request.user;
        return await this.scheduleService.getTodaysSchedule(user);
    }

    @Get('upcoming')
    async getUpcomingShifts(@Req() request: Request) {
        const user = request.user;
        return await this.scheduleService.getUpcomingShifts(user);
    }

    @Post('time-off')
    async requestTimeOff(@Body() timeOffData: TimeOffRequest, @Req() request: Request) {
        const user = request.user;
        return await this.scheduleService.requestTimeOff(user, timeOffData);
    }

    @Get()
    async getSchedule(@Query('week_start') weekStart: string, @Req() request: Request) {
        const user = request.user;
        return await this.scheduleService.getSchedule(user, weekStart);
    }

    @Post()
    @Roles('SUPER_ADMIN', 'ADMIN')
    async createShift(@Body() shiftData: ShiftCreationData, @Req() request: Request) {
        const user = request.user;
        return await this.scheduleService.createShift(user, shiftData);
    }
}