import { Controller, Post, Body, Res, Req, Get, UseGuards, UnauthorizedException } from '@nestjs/common';
import type { Response, Request } from 'express';
import { BackendService, LoginResponse, SignupData, User, Restaurant, StaffUserData } from '../services/backend.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

interface InvitationData {
    token: string;
    user: StaffUserData;
}

declare module 'express' {
    interface Request {
        user?: User;
    }
}

@Controller('auth')
export class AuthController {
    constructor(private readonly backendService: BackendService) { }

    @Post('login')
    async login(
        @Body() loginData: { email: string; password: string },
        @Res({ passthrough: true }) response: Response,
    ) {
        const result: LoginResponse = await this.backendService.login(
            loginData.email,
            loginData.password,
        );

        response.cookie('access_token', result.tokens.access, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000,
        });

        response.cookie('refresh_token', result.tokens.refresh, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return {
            user: result.user,
            message: 'Login successful',
        };
    }

    @Post('signup/owner')
    async ownerSignup(
        @Body() signupData: SignupData,
        @Res({ passthrough: true }) response: Response,
    ) {
        const result: LoginResponse = await this.backendService.ownerSignup(signupData);

        response.cookie('access_token', result.tokens.access, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000,
        });

        response.cookie('refresh_token', result.tokens.refresh, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return {
            user: result.user,
            restaurant: result.user.restaurant_data,
            message: 'Account created successfully',
        };
    }

    @Post('accept-invitation')
    async acceptInvitation(
        @Body() invitationData: InvitationData,
        @Res({ passthrough: true }) response: Response,
    ) {
        const result: LoginResponse = await this.backendService.acceptInvitation(
            invitationData.token,
            invitationData.user,
        );

        response.cookie('access_token', result.tokens.access, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000,
        });

        response.cookie('refresh_token', result.tokens.refresh, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return {
            user: result.user,
            message: 'Invitation accepted successfully',
        };
    }

    @Post('logout')
    async logout(@Res({ passthrough: true }) response: Response) {
        response.clearCookie('access_token');
        response.clearCookie('refresh_token');

        return {
            message: 'Logout successful',
        };
    }

    @Post('refresh')
    async refreshToken(@Req() request: Request) {
        const refreshToken = request.cookies['refresh_token'];

        if (!refreshToken) {
            throw new UnauthorizedException('No refresh token provided');
        }

        const result = await this.backendService.refreshToken(refreshToken);
        return { access_token: result.access };
    }

    @UseGuards(JwtAuthGuard)
    @Get('profile')
    async getProfile(@Req() request: Request) {
        const accessToken = request.cookies['access_token'];
        return await this.backendService.getUserProfile(accessToken);
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    async getCurrentUser(@Req() request: Request) {
        // Return current user from request (set by JwtAuthGuard)
        return request.user;
    }
}
