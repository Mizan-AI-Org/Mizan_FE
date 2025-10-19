import { Controller, Post, Body, UseGuards, Get, Delete, Param, Put, Query } from '@nestjs/common';
import type { Request } from 'express';
import { BackendService, InviteStaffData, User, StaffListItem, StaffDashboardSummary, StaffOperationResponse } from '../services/backend.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';

declare module 'express' {
    interface Request {
        user?: User;
    }
}

@Controller('staff')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StaffController {
    constructor(private readonly backendService: BackendService) { }

    @Post('invite')
    @Roles('SUPER_ADMIN', 'ADMIN')
    async inviteStaff(@Body() invitationData: InviteStaffData, @Req() request: Request) {
        const accessToken = request.cookies['access_token'];
        return await this.backendService.inviteStaff(accessToken, invitationData);
    }

    @Get('list')
    @Roles('SUPER_ADMIN', 'ADMIN')
    async getStaffList(@Req() request: Request): Promise<StaffListItem[]> {
        const accessToken = request.cookies['access_token'];
        return await this.backendService.getStaffList(accessToken);
    }

    @Get('dashboard')
    @Roles('SUPER_ADMIN', 'ADMIN')
    async getStaffDashboard(@Req() request: Request): Promise<StaffDashboardSummary> {
        const accessToken = request.cookies['access_token'];
        return await this.backendService.getStaffDashboard(accessToken);
    }

    @Get('stats')
    @Roles('SUPER_ADMIN', 'ADMIN')
    async getStaffStats(@Req() request: Request): Promise<StaffDashboardSummary> {
        // Return dashboard statistics
        return {
            totalStaff: 12,
            activeShifts: 3,
            pendingOrders: 8,
            revenueToday: 1250
        };
    }

    @Delete(':id')
    @Roles('SUPER_ADMIN')
    async removeStaff(@Param('id') staffId: string, @Req() request: Request): Promise<StaffOperationResponse> {
        const accessToken = request.cookies['access_token'];
        return await this.backendService.removeStaff(accessToken, staffId);
    }

    @Put(':id/role')
    @Roles('SUPER_ADMIN')
    async updateStaffRole(
        @Param('id') staffId: string,
        @Body() updateData: { role: string },
        @Req() request: Request
    ): Promise<StaffOperationResponse> {
        const accessToken = request.cookies['access_token'];
        return await this.backendService.updateStaffRole(accessToken, staffId, updateData.role);
    }
}