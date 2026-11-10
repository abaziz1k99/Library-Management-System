import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@/app/core/services/auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isLoggedIn()) {
        return router.createUrlTree(['/auth/login']);
    }

    const role = auth.role();
    const isAdminArea = state.url.startsWith('/admin');
    const isLibrarianArea = state.url.startsWith('/librarian');
    const isMyLibrary = state.url.startsWith('/my-library');
    const isStaffArea = state.url.startsWith('/staff');
    const isPortal = state.url.startsWith('/portal');

    if (role === 'SUPER_ADMIN') {
        return isPortal ? router.createUrlTree(['/admin/dashboard']) : true;
    }

    if (role === 'LIBRARY_ADMIN') {
        if (isAdminArea || isPortal || isMyLibrary) return router.createUrlTree(['/librarian/dashboard']);
        return true;
    }

    if (role === 'TEACHER' || role === 'STUDENT') {
        if (isAdminArea || isLibrarianArea || isStaffArea || isPortal) return router.createUrlTree(['/my-library/dashboard']);
        return true;
    }

    if (role === 'LIBRARY_STAFF') {
        if (isAdminArea || isLibrarianArea || isMyLibrary || isPortal) return router.createUrlTree(['/staff/dashboard']);
        return true;
    }

    return isAdminArea || isLibrarianArea || isMyLibrary || isStaffArea ? router.createUrlTree(['/portal']) : true;
};
