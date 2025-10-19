import { Controller, Post, Body, Res, Req, Get, UseGuards, Param } from '@nestjs/common';
import type { Response, Request } from 'express';
import { TimeTrackingService } from '../timeloss/time-tracking.service.ts';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { User } from '../services/backend.service';

declare module 'express' {
    interface Request {
        user?: User;
    }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('timeloss')
export class TimelossController {
    constructor(private readonly timeTrackingService: TimeTrackingService) { }

    @Post('clock-in')
    async clockIn(@Req() request: Request) {
        return this.timeTrackingService.clockIn(request.user.id);
    }

    @Post('clock-out')
    async clockOut(@Req() request: Request) {
        return this.timeTrackingService.clockOut(request.user.id);
    }

    @Post('take-break')
    async takeBreak(@Req() request: Request) {
        return this.timeTrackingService.takeBreak(request.user.id);
    }

    @Post('end-break')
    async endBreak(@Req() request: Request) {
        return this.timeTrackingService.endBreak(request.user.id);
    }

    @Get('status')
    async getStatus(@Req() request: Request) {
        return this.timeTrackingService.getCurrentStatus(request.user.id);
    }

    @Get('history')
    @Roles('SUPER_ADMIN', 'ADMIN', 'CHEF')
    async getHistory(@Req() request: Request, @Param('startDate') startDate: string, @Param('endDate') endDate: string) {
        return this.timeTrackingService.getHistory(request.user.restaurant, startDate, endDate);
    }

    @Get('overview')
    @Roles('SUPER_ADMIN', 'ADMIN', 'CHEF')
    async getOverview(@Req() request: Request) {
        return this.timeTrackingService.getOverview(request.user.restaurant);
    }
} 