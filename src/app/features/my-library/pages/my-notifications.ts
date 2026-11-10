import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { EmptyState } from '@/app/shared/components/empty-state';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatCard } from '@/app/shared/components/stat-card';
import { AuthService } from '@/app/core/services/auth.service';
import { LibraryDataService } from '@/app/core/services/library-data.service';
import type { Announcement, Loan, Reservation } from '@/app/core/models/library.models';

interface AlertRow {
    id: string;
    icon: string;
    severity: 'success' | 'warn' | 'danger' | 'info';
    title: string;
    detail: string;
    link: string;
}

@Component({
    selector: 'app-my-notifications',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, CardModule, TagModule, EmptyState, PageHeader, StatCard],
    template: `
        <app-page-header title="Notifications & Alerts" subtitle="Due-date reminders, reservation alerts, fine notices and library announcements">
            <p-button label="My Loans" icon="pi pi-send" severity="secondary" [outlined]="true" routerLink="/my-library/loans"></p-button>
        </app-page-header>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
            <app-stat-card label="Account Alerts" [value]="alerts().length" context="due dates, holds and fines" icon="pi pi-bell" iconBg="orange"></app-stat-card>
            <app-stat-card label="Announcements" [value]="announcements().length" context="for your role and branch" icon="pi pi-megaphone"></app-stat-card>
            <app-stat-card label="Overdue" [value]="overdueCount()" context="loans past due" icon="pi pi-exclamation-triangle" iconBg="red"></app-stat-card>
            <app-stat-card label="Ready Holds" [value]="readyCount()" context="waiting for pickup" icon="pi pi-bookmark" iconBg="green"></app-stat-card>
        </div>

        <div class="grid gap-4 xl:grid-cols-2">
            <p-card>
                <ng-template pTemplate="header">
                    <div class="px-4 pt-4">
                        <h2 class="text-lg font-semibold">Account Alerts</h2>
                        <p class="text-xs text-muted-color mt-0.5">Items generated from your loans, reservations and fines</p>
                    </div>
                </ng-template>
                @if (alerts().length === 0) {
                    <app-empty-state icon="pi pi-check-circle" title="No account alerts" message="Your loans and reservations are in good standing." />
                } @else {
                    <div class="flex flex-col gap-3">
                        @for (alert of alerts(); track alert.id) {
                            <a [routerLink]="alert.link" class="flex items-start gap-3 rounded-lg border border-surface-200 dark:border-surface-700 p-3 hover:bg-surface-hover">
                                <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" [ngClass]="alertClass(alert.severity)">
                                    <i class="pi" [ngClass]="alert.icon"></i>
                                </div>
                                <div class="min-w-0">
                                    <div class="text-sm font-medium">{{ alert.title }}</div>
                                    <div class="text-xs text-muted-color mt-0.5">{{ alert.detail }}</div>
                                </div>
                                <i class="pi pi-arrow-right text-xs text-muted-color ml-auto mt-1"></i>
                            </a>
                        }
                    </div>
                }
            </p-card>

            <p-card>
                <ng-template pTemplate="header">
                    <div class="px-4 pt-4">
                        <h2 class="text-lg font-semibold">Library Announcements</h2>
                        <p class="text-xs text-muted-color mt-0.5">Sent by library administration</p>
                    </div>
                </ng-template>
                @if (announcements().length === 0) {
                    <app-empty-state icon="pi pi-megaphone" title="No announcements" message="New library notices will appear here." />
                } @else {
                    <div class="flex flex-col gap-3">
                        @for (announcement of announcements(); track announcement.id) {
                            <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                                <div class="flex items-center justify-between gap-2">
                                    <div class="text-sm font-semibold">{{ announcement.title }}</div>
                                    <p-tag [value]="announcement.audience" severity="secondary"></p-tag>
                                </div>
                                <p class="text-sm text-muted-color mt-1">{{ announcement.message }}</p>
                                <div class="text-xs text-muted-color mt-2">
                                    {{ formatDate(announcement.sentAt || announcement.createdAt) }}
                                    @if (announcement.branchId) {
                                        <span> · {{ data.branchName(announcement.branchId) }}</span>
                                    }
                                </div>
                            </div>
                        }
                    </div>
                }
            </p-card>
        </div>
    `
})
export class MyNotifications {
    readonly data = inject(LibraryDataService);
    readonly auth = inject(AuthService);

    readonly member = computed(() => this.data.memberForUsername(this.auth.username()));

    readonly myLoans = computed<Loan[]>(() => {
        const me = this.member();
        return me ? this.data.loans().filter((loan) => loan.memberId === me.id && !loan.returnedAt) : [];
    });

    readonly myReservations = computed<Reservation[]>(() => {
        const me = this.member();
        return me ? this.data.reservations().filter((reservation) => reservation.memberId === me.id && (reservation.status === 'PENDING' || reservation.status === 'READY')) : [];
    });

    readonly overdueCount = computed(() => this.myLoans().filter((loan) => new Date(loan.dueAt).getTime() < Date.now()).length);
    readonly readyCount = computed(() => this.myReservations().filter((reservation) => reservation.status === 'READY').length);

    readonly announcements = computed<Announcement[]>(() => {
        const me = this.member();
        if (!me) return [];
        const role = this.auth.role();
        return this.data
            .announcements()
            .filter(
                (announcement) =>
                    announcement.status === 'SENT' &&
                    (announcement.audience === 'ALL' || announcement.audience === role) &&
                    (!announcement.branchId || announcement.branchId === me.branchId)
            )
            .sort((a, b) => new Date(b.sentAt ?? b.createdAt).getTime() - new Date(a.sentAt ?? a.createdAt).getTime());
    });

    readonly alerts = computed<AlertRow[]>(() => {
        const me = this.member();
        if (!me) return [];
        const rows: AlertRow[] = [];
        for (const loan of this.myLoans()) {
            const due = new Date(loan.dueAt).getTime();
            if (due < Date.now()) {
                rows.push({
                    id: `overdue-${loan.id}`,
                    icon: 'pi-exclamation-triangle',
                    severity: 'danger',
                    title: `Overdue: ${this.data.bookTitle(loan.bookId)}`,
                    detail: `${Math.ceil((Date.now() - due) / 86400000)} day(s) overdue. Return it or request a renewal.`,
                    link: '/my-library/loans'
                });
            } else if (due - Date.now() <= 7 * 86400000) {
                rows.push({
                    id: `due-${loan.id}`,
                    icon: 'pi-clock',
                    severity: 'warn',
                    title: `Due soon: ${this.data.bookTitle(loan.bookId)}`,
                    detail: `Due ${this.formatDate(loan.dueAt)}.`,
                    link: '/my-library/loans'
                });
            }
        }
        for (const reservation of this.myReservations()) {
            if (reservation.status === 'READY') {
                rows.push({
                    id: `ready-${reservation.id}`,
                    icon: 'pi-bookmark',
                    severity: 'success',
                    title: `Ready for pickup: ${this.data.bookTitle(reservation.bookId)}`,
                    detail: `Collect before ${reservation.expiresAt ? this.formatDate(reservation.expiresAt) : 'the hold expires'}.`,
                    link: '/my-library/reservations'
                });
            }
        }
        const unpaid = this.data.fines().filter((fine) => fine.memberId === me.id && fine.status === 'UNPAID');
        const unpaidTotal = unpaid.reduce((sum, fine) => sum + fine.amount, 0);
        if (unpaidTotal > 0) {
            rows.push({
                id: 'fines',
                icon: 'pi-wallet',
                severity: 'danger',
                title: 'Unpaid library fines',
                detail: `${this.formatCurrency(unpaidTotal)} outstanding.`,
                link: '/my-library/fines'
            });
        }
        return rows;
    });

    alertClass(severity: 'success' | 'warn' | 'danger' | 'info'): string {
        if (severity === 'danger') return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300';
        if (severity === 'warn') return 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300';
        if (severity === 'success') return 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300';
        return 'bg-primary-100 text-primary dark:bg-primary-950';
    }

    formatDate(value: string): string {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '—';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    formatCurrency(value: number): string {
        const currency = this.data.settings().currency;
        try {
            return new Intl.NumberFormat('en-BD', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
        } catch {
            return `${currency} ${value.toLocaleString('en-US')}`;
        }
    }
}
