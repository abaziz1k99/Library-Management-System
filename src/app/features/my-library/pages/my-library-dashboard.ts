import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { CodeLabel } from '@/app/shared/components/code-label';
import { EmptyState } from '@/app/shared/components/empty-state';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatCard } from '@/app/shared/components/stat-card';
import { StatusTag } from '@/app/shared/components/status-tag';
import { AuthService } from '@/app/core/services/auth.service';
import { LibraryDataService } from '@/app/core/services/library-data.service';
import type { Loan, Reservation } from '@/app/core/models/library.models';

interface NotificationRow {
    id: string;
    icon: string;
    severity: 'success' | 'warn' | 'danger' | 'info';
    title: string;
    detail: string;
    link: string;
}

@Component({
    selector: 'app-my-library-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, CardModule, TableModule, TagModule, CodeLabel, EmptyState, PageHeader, StatCard, StatusTag],
    template: `
        @if (member(); as me) {
            <app-page-header [title]="'Welcome, ' + me.firstName" subtitle="Your personal library dashboard — loans, reservations, fines and alerts">
                <p-button label="Search Catalog" icon="pi pi-search" routerLink="/my-library/catalog"></p-button>
                <p-button label="Digital Card" icon="pi pi-id-card" severity="secondary" [outlined]="true" routerLink="/my-library/card"></p-button>
            </app-page-header>

            <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
                <app-stat-card label="Borrowed Books" [value]="activeLoans().length" context="currently on loan" icon="pi pi-send"></app-stat-card>
                <app-stat-card label="Due Soon" [value]="dueSoonCount()" context="within 7 days" icon="pi pi-clock" iconBg="orange"></app-stat-card>
                <app-stat-card label="Reservations" [value]="activeReservations().length" context="pending or ready" icon="pi pi-bookmark" iconBg="primary"></app-stat-card>
                <app-stat-card label="Unpaid Fines" [value]="formatCurrency(unpaidFineTotal())" context="payable at the library" icon="pi pi-wallet" iconBg="red"></app-stat-card>
            </div>

            <div class="grid gap-4 xl:grid-cols-3">
                <p-card>
                    <ng-template pTemplate="header">
                        <div class="px-4 pt-4">
                            <h2 class="text-lg font-semibold">Membership Card</h2>
                            <p class="text-xs text-muted-color mt-0.5">Show this code at the circulation desk</p>
                        </div>
                    </ng-template>
                    <div class="rounded-xl border border-surface-200 dark:border-surface-700 p-4">
                        <div class="flex items-center justify-between gap-2">
                            <div>
                                <div class="text-sm font-semibold">{{ me.firstName }} {{ me.lastName }}</div>
                                <div class="text-xs text-muted-color">{{ me.membershipNo }}</div>
                            </div>
                            <app-status-tag [status]="me.status"></app-status-tag>
                        </div>
                        <div class="flex items-center justify-center py-3">
                            <app-code-label kind="qr" [value]="cardQr(me.membershipNo, me.memberType, me.branchId)" [size]="108"></app-code-label>
                        </div>
                        <div class="grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <div class="text-muted-color">Member type</div>
                                <div class="font-medium">{{ me.memberType }}</div>
                            </div>
                            <div>
                                <div class="text-muted-color">Branch</div>
                                <div class="font-medium">{{ data.branchName(me.branchId) }}</div>
                            </div>
                            <div>
                                <div class="text-muted-color">Valid until</div>
                                <div class="font-medium">{{ formatDate(me.expiresAt) }}</div>
                            </div>
                            <div>
                                <div class="text-muted-color">Department</div>
                                <div class="font-medium truncate">{{ me.department || '—' }}</div>
                            </div>
                        </div>
                        <div class="mt-3 text-right">
                            <a class="text-primary text-sm font-medium" routerLink="/my-library/card">Open full card</a>
                        </div>
                    </div>
                </p-card>

                <p-card styleClass="xl:col-span-2">
                    <ng-template pTemplate="header">
                        <div class="flex items-center justify-between gap-3 px-4 pt-4">
                            <div>
                                <h2 class="text-lg font-semibold">Current Borrowed Books</h2>
                                <p class="text-xs text-muted-color mt-0.5">Due dates and loan status</p>
                            </div>
                            <a class="text-primary text-sm font-medium" routerLink="/my-library/loans">All loans</a>
                        </div>
                    </ng-template>
                    @if (activeLoans().length === 0) {
                        <app-empty-state icon="pi pi-book" title="No books borrowed" message="Search the catalog to find your next read." actionLabel="Search Catalog" (action)="openCatalog()"></app-empty-state>
                    } @else {
                        <div class="overflow-x-auto">
                            <p-table [value]="activeLoans()" dataKey="id" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '44rem' }">
                                <ng-template pTemplate="header">
                                    <tr>
                                        <th>Book</th>
                                        <th>Due Date</th>
                                        <th>Renewals</th>
                                        <th>Status</th>
                                    </tr>
                                </ng-template>
                                <ng-template pTemplate="body" let-loan>
                                    <tr>
                                        <td>
                                            <div class="font-medium">{{ data.bookTitle(loan.bookId) }}</div>
                                            <div class="text-xs text-muted-color font-mono">{{ copyBarcode(loan.copyId) }}</div>
                                        </td>
                                        <td class="text-sm">
                                            <div>{{ formatDate(loan.dueAt) }}</div>
                                            @if (isOverdue(loan)) {
                                                <div class="text-xs text-red-500">{{ overdueDays(loan) }} day(s) overdue</div>
                                            }
                                        </td>
                                        <td class="text-sm">{{ loan.renewalCount }}</td>
                                        <td><p-tag [value]="isOverdue(loan) ? 'Overdue' : 'Active'" [severity]="isOverdue(loan) ? 'danger' : 'success'"></p-tag></td>
                                    </tr>
                                </ng-template>
                            </p-table>
                        </div>
                    }
                </p-card>
            </div>

            <div class="mt-6 grid gap-4 xl:grid-cols-2">
                <p-card>
                    <ng-template pTemplate="header">
                        <div class="px-4 pt-4">
                            <h2 class="text-lg font-semibold">Alerts</h2>
                            <p class="text-xs text-muted-color mt-0.5">Due dates, reservations and fines that need attention</p>
                        </div>
                    </ng-template>
                    @if (notifications().length === 0) {
                        <app-empty-state icon="pi pi-bell" title="No alerts" message="You are all caught up." />
                    } @else {
                        <div class="flex flex-col gap-3">
                            @for (alert of notifications(); track alert.id) {
                                <a [routerLink]="alert.link" class="flex items-start gap-3 rounded-lg border border-surface-200 dark:border-surface-700 p-3 hover:bg-surface-hover">
                                    <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" [ngClass]="alertClass(alert.severity)">
                                        <i class="pi text-xs" [ngClass]="alert.icon"></i>
                                    </div>
                                    <div class="min-w-0">
                                        <div class="text-sm font-medium">{{ alert.title }}</div>
                                        <div class="text-xs text-muted-color mt-0.5">{{ alert.detail }}</div>
                                    </div>
                                </a>
                            }
                        </div>
                    }
                </p-card>

                <p-card>
                    <ng-template pTemplate="header">
                        <div class="flex items-center justify-between gap-3 px-4 pt-4">
                            <div>
                                <h2 class="text-lg font-semibold">Library Announcements</h2>
                                <p class="text-xs text-muted-color mt-0.5">Notices for your branch and role</p>
                            </div>
                            <a class="text-primary text-sm font-medium" routerLink="/my-library/notifications">View all</a>
                        </div>
                    </ng-template>
                    @if (announcements().length === 0) {
                        <app-empty-state icon="pi pi-megaphone" title="No announcements" message="New library announcements will appear here." />
                    } @else {
                        <div class="flex flex-col gap-3">
                            @for (announcement of announcements(); track announcement.id) {
                                <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                                    <div class="flex items-center justify-between gap-2">
                                        <div class="text-sm font-medium">{{ announcement.title }}</div>
                                        <span class="text-xs text-muted-color whitespace-nowrap">{{ formatDate(announcement.sentAt || announcement.createdAt) }}</span>
                                    </div>
                                    <p class="text-xs text-muted-color mt-1 line-clamp-2">{{ announcement.message }}</p>
                                </div>
                            }
                        </div>
                    }
                </p-card>
            </div>
        } @else {
            <app-page-header title="My Library" subtitle="A library membership is required to use the self-service workspace"></app-page-header>
            <p-card>
                <app-empty-state icon="pi pi-id-card" title="No membership linked" message="Ask the library administration to link a membership to your account." />
            </p-card>
        }
    `
})
export class MyLibraryDashboard {
    readonly data = inject(LibraryDataService);
    readonly auth = inject(AuthService);
    private readonly router = inject(Router);

    readonly member = computed(() => this.data.memberForUsername(this.auth.username()));

    readonly myLoans = computed(() => {
        const me = this.member();
        return me ? this.data.loans().filter((loan) => loan.memberId === me.id) : [];
    });

    readonly activeLoans = computed(() => this.myLoans().filter((loan) => !loan.returnedAt).sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()));

    readonly dueSoonCount = computed(() => {
        const threshold = Date.now() + 7 * 86400000;
        return this.activeLoans().filter((loan) => {
            const due = new Date(loan.dueAt).getTime();
            return due >= Date.now() && due <= threshold;
        }).length;
    });

    readonly activeReservations = computed<Reservation[]>(() => {
        const me = this.member();
        return me ? this.data.reservations().filter((reservation) => reservation.memberId === me.id && (reservation.status === 'PENDING' || reservation.status === 'READY')) : [];
    });

    readonly unpaidFineTotal = computed(() => {
        const me = this.member();
        return me ? this.data.fines().filter((fine) => fine.memberId === me.id && fine.status === 'UNPAID').reduce((sum, fine) => sum + fine.amount, 0) : 0;
    });

    readonly announcements = computed(() => {
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
            .sort((a, b) => new Date(b.sentAt ?? b.createdAt).getTime() - new Date(a.sentAt ?? a.createdAt).getTime())
            .slice(0, 4);
    });

    readonly notifications = computed<NotificationRow[]>(() => {
        const rows: NotificationRow[] = [];
        for (const loan of this.activeLoans()) {
            if (this.isOverdue(loan)) {
                rows.push({
                    id: `overdue-${loan.id}`,
                    icon: 'pi-exclamation-triangle',
                    severity: 'danger',
                    title: `Overdue: ${this.data.bookTitle(loan.bookId)}`,
                    detail: `${this.overdueDays(loan)} day(s) overdue — please return it or request a renewal.`,
                    link: '/my-library/loans'
                });
            } else if (new Date(loan.dueAt).getTime() - Date.now() <= 7 * 86400000) {
                rows.push({
                    id: `due-${loan.id}`,
                    icon: 'pi-clock',
                    severity: 'warn',
                    title: `Due soon: ${this.data.bookTitle(loan.bookId)}`,
                    detail: `Return or renew by ${this.formatDate(loan.dueAt)}.`,
                    link: '/my-library/loans'
                });
            }
        }
        for (const reservation of this.activeReservations()) {
            if (reservation.status === 'READY') {
                rows.push({
                    id: `res-${reservation.id}`,
                    icon: 'pi-bookmark',
                    severity: 'success',
                    title: `Ready for pickup: ${this.data.bookTitle(reservation.bookId)}`,
                    detail: `Collect it by ${reservation.expiresAt ? this.formatDate(reservation.expiresAt) : 'the hold date'}.`,
                    link: '/my-library/reservations'
                });
            }
        }
        if (this.unpaidFineTotal() > 0) {
            rows.push({
                id: 'fines',
                icon: 'pi-wallet',
                severity: 'danger',
                title: 'Unpaid library fines',
                detail: `${this.formatCurrency(this.unpaidFineTotal())} outstanding.`,
                link: '/my-library/fines'
            });
        }
        return rows;
    });

    cardQr(membershipNo: string, type: string, branchId: string): string {
        return `PUL|MEMBER|${membershipNo}|${type}|${branchId}`;
    }

    copyBarcode(copyId: string): string {
        return this.data.bookCopies().find((copy) => copy.id === copyId)?.barcode ?? copyId;
    }

    openCatalog(): void {
        this.router.navigate(['/my-library/catalog']);
    }

    isOverdue(loan: Loan): boolean {
        return !loan.returnedAt && new Date(loan.dueAt).getTime() < Date.now();
    }

    overdueDays(loan: Loan): number {
        return Math.max(0, Math.ceil((Date.now() - new Date(loan.dueAt).getTime()) / 86400000));
    }

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
