import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { BackendService } from '../services/backend.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(private readonly backendService: BackendService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const accessToken = request.cookies['access_token'];

        if (!accessToken) {
            throw new UnauthorizedException('No access token provided');
        }

        try {
            // Verify token by fetching user profile
            const user = await this.backendService.getUserProfile(accessToken);

            // Set user in request for RolesGuard to use
            request.user = user;
            return true;
        } catch (error) {
            throw new UnauthorizedException('Invalid or expired token');
        }
    }
}