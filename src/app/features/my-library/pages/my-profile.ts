import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { EmptyState } from '@/app/shared/components/empty-state';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatusTag } from '@/app/shared/components/status-tag';
import { AuthService } from '@/app/core/services/auth.service';
import { LibraryDataService } from '@/app/core/services/library-data.service';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Component({
    selector: 'app-my-profile',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, ButtonModule, CardModule, InputTextModule, MessageModule, ToastModule, EmptyState, PageHeader, StatusTag],
    providers: [MessageService],
    template: `
        @if (member(); as me) {
            <app-page-header title="My Library Profile" subtitle="Keep your contact details current so the library can reach you about due dates and reservations">
                <p-button label="Digital Card" icon="pi pi-id-card" severity="secondary" [outlined]="true" routerLink="/my-library/card"></p-button>
            </app-page-header>

            <div class="grid gap-4 xl:grid-cols-3">
                <p-card styleClass="xl:col-span-2">
                    <ng-template pTemplate="header">
                        <div class="px-4 pt-4">
                            <h2 class="text-lg font-semibold">Contact Details</h2>
                            <p class="text-xs text-muted-color mt-0.5">Editable information on your membership record</p>
                        </div>
                    </ng-template>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div class="flex flex-col gap-1.5">
                            <label class="text-sm font-medium" for="profileEmail">Email *</label>
                            <input pInputText id="profileEmail" type="email" [ngModel]="email()" (ngModelChange)="email.set($event)" />
                            @if (emailError()) {
                                <small class="text-red-500">{{ emailError() }}</small>
                            }
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label class="text-sm font-medium" for="profilePhone">Phone</label>
                            <input pInputText id="profilePhone" [ngModel]="phone()" (ngModelChange)="phone.set($event)" />
                        </div>
                        <div class="flex flex-col gap-1.5 sm:col-span-2">
                            <label class="text-sm font-medium" for="profileDepartment">Department / Unit</label>
                            <input pInputText id="profileDepartment" [ngModel]="department()" (ngModelChange)="department.set($event)" />
                        </div>
                    </div>
                    <div class="flex justify-end gap-2 mt-5">
                        <p-button label="Reset" severity="secondary" [text]="true" (onClick)="reset()"></p-button>
                        <p-button label="Save Profile" icon="pi pi-save" [disabled]="!!emailError()" (onClick)="save()"></p-button>
                    </div>
                </p-card>

                <p-card>
                    <ng-template pTemplate="header">
                        <div class="px-4 pt-4">
                            <h2 class="text-lg font-semibold">Membership</h2>
                            <p class="text-xs text-muted-color mt-0.5">Managed by the library administration</p>
                        </div>
                    </ng-template>
                    <div class="flex flex-col gap-3">
                        <div class="flex items-center justify-between">
                            <span class="text-sm text-muted-color">Name</span>
                            <span class="text-sm font-medium">{{ me.firstName }} {{ me.lastName }}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-sm text-muted-color">Membership No.</span>
                            <span class="text-sm font-mono">{{ me.membershipNo }}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-sm text-muted-color">Type</span>
                            <span class="text-sm font-medium">{{ me.memberType }}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-sm text-muted-color">Branch</span>
                            <span class="text-sm font-medium">{{ data.branchName(me.branchId) }}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-sm text-muted-color">Status</span>
                            <app-status-tag [status]="me.status"></app-status-tag>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-sm text-muted-color">Joined</span>
                            <span class="text-sm">{{ formatDate(me.joinedAt) }}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-sm text-muted-color">Expires</span>
                            <span class="text-sm">{{ formatDate(me.expiresAt) }}</span>
                        </div>
                    </div>
                    <p-message severity="info" icon="pi pi-info-circle" styleClass="w-full mt-4">
                        To change your name, membership type or branch, contact the library desk.
                    </p-message>
                </p-card>
            </div>

            <p-toast></p-toast>
        } @else {
            <app-page-header title="My Library Profile" subtitle="No membership is linked to this account"></app-page-header>
            <p-card>
                <app-empty-state icon="pi pi-id-card" title="No membership linked" message="Ask the library administration to create a membership for your account." />
            </p-card>
        }
    `
})
export class MyProfile {
    readonly data = inject(LibraryDataService);
    readonly auth = inject(AuthService);
    private readonly msg = inject(MessageService);

    readonly member = computed(() => this.data.memberForUsername(this.auth.username()));
    readonly email = signal('');
    readonly phone = signal('');
    readonly department = signal('');

    readonly emailError = computed(() => {
        const value = this.email().trim();
        if (!value) return 'Email is required.';
        return EMAIL_PATTERN.test(value) ? null : 'Enter a valid email address.';
    });

    constructor() {
        this.reset();
    }

    reset(): void {
        const me = this.data.currentMember();
        this.email.set(me?.email ?? '');
        this.phone.set(me?.phone ?? '');
        this.department.set(me?.department ?? '');
    }

    save(): void {
        const me = this.member();
        if (!me || this.emailError()) return;
        try {
            this.data.updateMember({
                ...me,
                email: this.email().trim(),
                phone: this.phone().trim(),
                department: this.department().trim()
            });
            this.msg.add({ severity: 'success', summary: 'Profile saved', detail: 'Your library contact details were updated.' });
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Save failed', detail: error instanceof Error ? error.message : 'Something went wrong.' });
        }
    }

    formatDate(value: string): string {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '—';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
}
