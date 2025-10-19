import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

import { AuthController } from './auth/auth.controller';
import { StaffController } from './staff/staff.controller';
import { TimelossController } from './timeloss/timeloss.controller';
import { ScheduleController } from './schedule/schedule.controller';

import { BackendService } from './services/backend.service';
import { TimeTrackingService } from './timeloss/time-tracking.service';
import { ScheduleService } from './schedule/schedule.service';

import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        HttpModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                timeout: 5000,
                maxRedirects: 5,
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [
        AuthController,
        StaffController,
        TimelossController,
        ScheduleController,
    ],
    providers: [
        BackendService,
        TimeTrackingService,
        ScheduleService,
        JwtAuthGuard,
        RolesGuard,
    ],
})
export class AppModule { }