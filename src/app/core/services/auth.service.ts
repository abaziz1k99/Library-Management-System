import { Injectable, signal } from '@angular/core';

const AUTH_KEY = 'library.auth';
const ROLE_KEY = 'library.role';
const NAME_KEY = 'library.name';
const USERNAME_KEY = 'library.username';

export type PortalRole = 'SUPER_ADMIN' | 'LIBRARY_ADMIN' | 'LIBRARY_STAFF' | 'TEACHER' | 'STUDENT';

interface DemoAccount {
    password: string;
    role: PortalRole;
    name: string;
}

const DEMO_ACCOUNTS: Record<string, DemoAccount> = {
    superadmin: { password: 'Admin@123', role: 'SUPER_ADMIN', name: 'Super Admin' },
    librarian: { password: 'Librarian@123', role: 'LIBRARY_ADMIN', name: 'Rafiqul Islam' },
    staff: { password: 'Staff@123', role: 'LIBRARY_STAFF', name: 'Mehedi Hasan' },
    teacher1: { password: 'Teacher@123', role: 'TEACHER', name: 'Dr. Ahsan Habib' },
    student1: { password: 'Student@123', role: 'STUDENT', name: 'Nusrat Jahan' }
};

export const ROLE_LABELS: Record<PortalRole, string> = {
    SUPER_ADMIN: 'Super Admin',
    LIBRARY_ADMIN: 'Library Admin',
    LIBRARY_STAFF: 'Library Staff',
    TEACHER: 'Teacher / Faculty',
    STUDENT: 'Student'
};

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly _loggedIn = signal(this.hasSession());
    private readonly _role = signal<PortalRole | null>(this.readRole());
    private readonly _name = signal<string | null>(this.readName());
    private readonly _username = signal<string | null>(this.readUsername());

    readonly isLoggedIn = this._loggedIn.asReadonly();
    readonly role = this._role.asReadonly();
    readonly name = this._name.asReadonly();
    readonly username = this._username.asReadonly();

    private hasSession(): boolean {
        try {
            return sessionStorage.getItem(AUTH_KEY) === '1';
        } catch {
            return false;
        }
    }

    private readRole(): PortalRole | null {
        try {
            if (sessionStorage.getItem(AUTH_KEY) !== '1') return null;
            const role = sessionStorage.getItem(ROLE_KEY);
            return role && role in ROLE_LABELS ? (role as PortalRole) : null;
        } catch {
            return null;
        }
    }

    private readName(): string | null {
        try {
            return sessionStorage.getItem(AUTH_KEY) === '1' ? sessionStorage.getItem(NAME_KEY) : null;
        } catch {
            return null;
        }
    }

    private readUsername(): string | null {
        try {
            return sessionStorage.getItem(AUTH_KEY) === '1' ? sessionStorage.getItem(USERNAME_KEY) : null;
        } catch {
            return null;
        }
    }

    login(username: string, password: string): boolean {
        const normalized = username.trim().toLowerCase();
        const account = DEMO_ACCOUNTS[normalized];
        if (!account || account.password !== password) {
            return false;
        }
        try {
            sessionStorage.setItem(AUTH_KEY, '1');
            sessionStorage.setItem(ROLE_KEY, account.role);
            sessionStorage.setItem(NAME_KEY, account.name);
            sessionStorage.setItem(USERNAME_KEY, normalized);
        } catch {
            // storage unavailable — still treat as logged in for this session
        }
        this._loggedIn.set(true);
        this._role.set(account.role);
        this._name.set(account.name);
        this._username.set(normalized);
        return true;
    }

    logout(): void {
        try {
            sessionStorage.removeItem(AUTH_KEY);
            sessionStorage.removeItem(ROLE_KEY);
            sessionStorage.removeItem(NAME_KEY);
            sessionStorage.removeItem(USERNAME_KEY);
        } catch {
            // ignore
        }
        this._loggedIn.set(false);
        this._role.set(null);
        this._name.set(null);
        this._username.set(null);
    }

    homeRoute(role: PortalRole | null = this._role()): string {
        if (role === 'SUPER_ADMIN') return '/admin/dashboard';
        if (role === 'LIBRARY_ADMIN') return '/librarian/dashboard';
        if (role === 'TEACHER' || role === 'STUDENT') return '/my-library/dashboard';
        if (role === 'LIBRARY_STAFF') return '/staff/dashboard';
        return '/portal';
    }
}
