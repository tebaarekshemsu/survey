// roles.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true; // no roles required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user; // <- populated by BetterAuthGuard

    if (!user) {
      throw new ForbiddenException("User not authenticated");
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException("You do not have permission");
    }

    return true;
  }
}
