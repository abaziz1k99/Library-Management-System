import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { RippleModule } from 'primeng/ripple';
import { AppFloatingConfigurator } from '../../layouts/app.floatingconfigurator';
import { AuthService } from '@/app/core/services/auth.service';

interface DemoAccount {
    label: string;
    username: string;
    password: string;
    icon: string;
}

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [ButtonModule, InputTextModule, PasswordModule, FormsModule, RouterModule, RippleModule, MessageModule, AppFloatingConfigurator],
    template: `
        <app-floating-configurator />
        <div class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-screen overflow-hidden">
            <div class="flex flex-col items-center justify-center">
                <div style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, var(--primary-color) 10%, rgba(33, 150, 243, 0) 30%)">
                    <div class="w-full bg-surface-0 dark:bg-surface-900 py-12 px-8 sm:px-14" style="border-radius: 53px">
                        <div class="text-center mb-8">
                            <img src="/assets/images/paperless-library-logo.png" alt="Paperless Library logo" class="mx-auto mb-6 w-40 h-40 object-contain" />
                            <div class="text-surface-900 dark:text-surface-0 text-3xl font-semibold tracking-tight mb-3">Paperless Library</div>
                            <span class="text-muted-color font-medium">One catalog. Every branch. Zero paper.</span>
                        </div>

                        <div>
                            <label for="username" class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2">Username</label>
                            <input pInputText id="username" type="text" placeholder="superadmin" class="w-full mb-6" [(ngModel)]="username" (keydown.enter)="signIn()" />

                            <label for="password" class="block text-surface-900 dark:text-surface-0 font-medium text-xl mb-2">Password</label>
                            <p-password id="password" [(ngModel)]="password" placeholder="Password" [toggleMask]="true" styleClass="mb-4" [fluid]="true" [feedback]="false" (keydown.enter)="signIn()"></p-password>
                            @if (error) {
                                <p-message severity="error" [text]="error" styleClass="w-full mb-4"></p-message>
                            }

                            <p-button label="Sign In" icon="pi pi-sign-in" styleClass="w-full mt-2" (onClick)="signIn()"></p-button>
                        </div>

                        <div class="mt-8 pt-6 border-t border-surface-200 dark:border-surface-700">
                            <p class="text-xs font-semibold uppercase tracking-wide text-muted-color mb-3">Demo accounts — click to fill</p>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                @for (account of demoAccounts; track account.username) {
                                    <button type="button" class="flex items-center gap-2 rounded-lg border border-surface-200 dark:border-surface-700 px-3 py-2 text-left hover:bg-surface-hover" (click)="useDemo(account)">
                                        <i [class]="account.icon" class="text-primary"></i>
                                        <span class="min-w-0">
                                            <span class="block text-sm font-medium">{{ account.label }}</span>
                                            <span class="block text-[11px] text-muted-color font-mono">{{ account.username }} / {{ account.password }}</span>
                                        </span>
                                    </button>
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
})
export class Login {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);

    username = '';
    password = '';
    error: string | null = null;

    readonly demoAccounts: DemoAccount[] = [
        { label: 'Super Admin', username: 'superadmin', password: 'Admin@123', icon: 'pi pi-shield' },
        { label: 'Library Admin', username: 'librarian', password: 'Librarian@123', icon: 'pi pi-building-columns' },
        { label: 'Library Staff', username: 'staff', password: 'Staff@123', icon: 'pi pi-id-card' },
        { label: 'Teacher / Faculty', username: 'teacher1', password: 'Teacher@123', icon: 'pi pi-graduation-cap' },
        { label: 'Student', username: 'student1', password: 'Student@123', icon: 'pi pi-user' }
    ];

    useDemo(account: DemoAccount): void {
        this.username = account.username;
        this.password = account.password;
        this.error = null;
    }

    signIn(): void {
        if (this.auth.login(this.username.trim(), this.password)) {
            this.error = null;
            this.router.navigate([this.auth.homeRoute()]);
        } else {
            this.error = 'Unauthorized: invalid username or password.';
        }
    }
}
