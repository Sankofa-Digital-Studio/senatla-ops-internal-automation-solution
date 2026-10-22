import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Route, Router, UrlSegment, UrlTree } from '@angular/router';
import { AppRole } from '../models/app.models';
import { AuthService } from '../services/auth.service';

type RoleRequirement = AppRole | AppRole[] | undefined;

function sanitizeRequestedUrl(url: string) {
  if (!url || !url.startsWith('/')) return '/';
  if (url.startsWith('//') || url.startsWith('/login')) return '/';
  return url;
}

function loginRole(requirement: RoleRequirement): AppRole | undefined {
  return Array.isArray(requirement) ? undefined : requirement;
}

function getLoginTree(router: Router, expectedRole: RoleRequirement, requestedUrl: string, preferredLoginRole?: AppRole): UrlTree {
  const role = preferredLoginRole ?? loginRole(expectedRole);
  return router.createUrlTree(role ? ['/login', role] : ['/login'], {
    queryParams: { redirect: sanitizeRequestedUrl(requestedUrl) },
  });
}

function roleAllowed(actualRole: AppRole | null, requirement: RoleRequirement) {
  if (!actualRole) return false;
  if (!requirement) return true;
  return Array.isArray(requirement) ? requirement.includes(actualRole) : actualRole === requirement;
}

async function hasAccess(expectedRole?: RoleRequirement, requestedUrl: string = '/', preferredLoginRole?: AppRole) {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ensureReady();

  if (!auth.canAccess()) {
    return getLoginTree(router, expectedRole, requestedUrl, preferredLoginRole);
  }

  if (!roleAllowed(auth.role(), expectedRole)) {
    const userRole = auth.role();
    if (userRole) {
      const homePath = userRole === 'site' ? '/site-manager' : userRole === 'office' ? '/office-admin' : '/director';
      return router.createUrlTree([homePath]);
    }
    return getLoginTree(router, expectedRole, requestedUrl, preferredLoginRole);
  }

  return true;
}

export function roleCanMatch(expectedRole?: RoleRequirement, preferredLoginRole?: AppRole): CanMatchFn {
  return async (_route: Route, segments: UrlSegment[]) => {
    const requestedUrl = '/' + segments.map((segment) => segment.path).join('/');
    return await hasAccess(expectedRole, requestedUrl, preferredLoginRole);
  };
}

export function roleCanActivate(expectedRole?: RoleRequirement, preferredLoginRole?: AppRole): CanActivateFn {
  return async (_route, state) => await hasAccess(expectedRole, state.url || '/', preferredLoginRole);
}
