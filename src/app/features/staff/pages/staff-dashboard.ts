import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { EmptyState } from '@/app/shared/components/empty-state';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatCard } from '@/app/shared/components/stat-card';
import { LibraryDataService } from '@/app/core/services/library-data.service';
import type { Loan, RenewalRequest, Reservation } from '@/app/core/models/library.models';

@Component({
    selector: 'app-staff-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, CardModule, TableModule, TagModule, EmptyState, PageHeader, StatCard],
    template: `
        <app-page-header title="Operations Dashboard" [subtitle]="'Assigned branch: ' + branchName()">
            <p-button label="Circulation Desk" icon="pi pi-send" routerLink="/staff/desk"></p-button>
        </app-page-header>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 auto-rows-fr">
            <app-stat-card label="Copies in Branch" [value]="branchCopies().length" [context]="availableCopies() + ' available'" icon="pi pi-box"></app-stat-card>
            <app-stat-card label="Active Loans" [value]="activeLoans().length" context="currently issued" icon="pi pi-send" iconBg="primary"></app-stat-card>
            <app-stat-card label="Overdue" [value]="overdueLoans().length" context="past due date" icon="pi pi-exclamation-triangle" iconBg="red"></app-stat-card>
            <app-stat-card label="Ready Pickups" [value]="readyPickups().length" context="reservations waiting" icon="pi pi-bookmark" iconBg="green"></app-stat-card>
            <app-stat-card label="Pending Renewals" [value]="pendingRenewals().length" context="awaiting processing" icon="pi pi-refresh" iconBg="orange"></app-stat-card>
            <app-stat-card label="Issued Today" [value]="issuedToday()" context="new loans" icon="pi pi-plus-circle" iconBg="green"></app-stat-card>
            <app-stat-card label="Returned Today" [value]="returnedToday()" context="closed loans" icon="pi pi-replay" iconBg="primary"></app-stat-card>
            <app-stat-card label="Members" [value]="branchMembers().length" context="registered at this branch" icon="pi pi-users"></app-stat-card>
        </div>

        <div class="mt-6 grid gap-4 xl:grid-cols-3">
            <p-card styleClass="xl:col-span-2">
                <ng-template pTemplate="header">
                    <div class="flex items-center justify-between gap-3 px-4 pt-4">
                        <div>
                            <h2 class="text-lg font-semibold">Overdue Loans</h2>
                            <p class="text-xs text-muted-color mt-0.5">Follow up with members at your branch</p>
                        </div>
                        <a class="text-primary text-sm font-medium" routerLink="/staff/desk">Open desk</a>
                    </div>
                </ng-template>
                @if (overdueLoans().length === 0) {
                    <app-empty-state icon="pi pi-check-circle" title="No overdue loans" message="All loans at this branch are within their due dates." />
                } @else {
                    <div class="overflow-x-auto">
                        <p-table [value]="overdueLoans().slice(0, 8)" dataKey="id" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '40rem' }">
                            <ng-template pTemplate="header">
                                <tr>
                                    <th>Book</th>
                                    <th>Member</th>
                                    <th>Due</th>
                                    <th class="text-right">Days Overdue</th>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="body" let-loan>
                                <tr>
                                    <td>
                                        <div class="font-medium">{{ data.bookTitle(loan.bookId) }}</div>
                                        <div class="text-xs text-muted-color font-mono">{{ copyBarcode(loan.copyId) }}</div>
                                    </td>
                                    <td class="text-sm">{{ data.memberName(loan.memberId) }}</td>
                                    <td class="text-sm whitespace-nowrap">{{ formatDate(loan.dueAt) }}</td>
                                    <td class="text-right text-sm text-red-500 font-medium">{{ overdueDays(loan) }}</td>
                                </tr>
                            </ng-template>
                        </p-table>
                    </div>
                }
            </p-card>

            <p-card>
                <ng-template pTemplate="header">
                    <div class="px-4 pt-4">
                        <h2 class="text-lg font-semibold">Ready Pickups</h2>
                        <p class="text-xs text-muted-color mt-0.5">Reservations waiting at the desk</p>
                    </div>
                </ng-template>
                @if (readyPickups().length === 0) {
                    <app-empty-state icon="pi pi-bookmark" title="No pickups" message="No reservations are ready at this branch." />
                } @else {
                    <div class="flex flex-col gap-3">
                        @for (reservation of readyPickups().slice(0, 5); track reservation.id) {
                            <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                                <div class="flex items-center justify-between gap-2">
                                    <div class="text-sm font-medium">{{ data.bookTitle(reservation.bookId) }}</div>
                                    <p-tag value="Ready" severity="success"></p-tag>
                                </div>
                                <div class="text-xs text-muted-color mt-1">{{ data.memberName(reservation.memberId) }}</div>
                                <div class="text-xs text-muted-color mt-0.5">Hold expires {{ reservation.expiresAt ? formatDate(reservation.expiresAt) : '—' }}</div>
                            </div>
                        }
                    </div>
                }
            </p-card>
        </div>

        <div class="mt-6 grid gap-4 xl:grid-cols-3">
            <p-card>
                <ng-template pTemplate="header">
                    <div class="px-4 pt-4">
                        <h2 class="text-lg font-semibold">Pending Renewals</h2>
                        <p class="text-xs text-muted-color mt-0.5">Requests awaiting processing</p>
                    </div>
                </ng-template>
                @if (pendingRenewals().length === 0) {
                    <app-empty-state icon="pi pi-refresh" title="No renewals" message="No renewal requests are pending." />
                } @else {
                    <div class="flex flex-col gap-3">
                        @for (request of pendingRenewals().slice(0, 5); track request.id) {
                            <div class="flex items-center justify-between gap-2 rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                                <div class="min-w-0">
                                    <div class="text-sm font-medium truncate">{{ data.bookTitle(loanBookId(request.loanId)) }}</div>
                                    <div class="text-xs text-muted-color">{{ data.memberName(request.memberId) }}</div>
                                </div>
                                <p-tag value="Pending" severity="warn"></p-tag>
                            </div>
                        }
                    </div>
                }
            </p-card>

            <p-card>
                <ng-template pTemplate="header">
                    <div class="px-4 pt-4">
                        <h2 class="text-lg font-semibold">Quick Actions</h2>
                        <p class="text-xs text-muted-color mt-0.5">Common service desk tasks</p>
                    </div>
                </ng-template>
                <div class="grid grid-cols-2 gap-2">
                    @for (action of quickActions; track action.label) {
                        <a [routerLink]="action.link" class="rounded-lg border border-surface-200 dark:border-surface-700 p-3 hover:bg-surface-hover">
                            <i [class]="action.icon" class="text-primary"></i>
                            <div class="text-sm font-medium mt-2">{{ action.label }}</div>
                            <div class="text-xs text-muted-color mt-0.5">{{ action.hint }}</div>
                        </a>
                    }
                </div>
            </p-card>

            <p-card>
                <ng-template pTemplate="header">
                    <div class="px-4 pt-4">
                        <h2 class="text-lg font-semibold">Branch Information</h2>
                        <p class="text-xs text-muted-color mt-0.5">Your assigned library</p>
                    </div>
                </ng-template>
                @if (branch(); as b) {
                    <div class="flex flex-col gap-3">
                        <div class="flex items-center justify-between">
                            <span class="text-sm text-muted-color">Name</span>
                            <span class="text-sm font-medium text-right">{{ b.name }}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-sm text-muted-color">Code</span>
                            <span class="text-sm font-mono">{{ b.code }}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-sm text-muted-color">Opening hours</span>
                            <span class="text-sm text-right">{{ b.openingHours }}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-sm text-muted-color">Seats / shelves</span>
                            <span class="text-sm">{{ b.seatCapacity }} / {{ b.shelfCount }}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-sm text-muted-color">Status</span>
                            <span class="text-sm font-medium">{{ b.status }}</span>
                        </div>
                    </div>
                }
                <div class="mt-4 pt-3 border-t border-surface-200 dark:border-surface-700">
                    <a class="text-primary text-sm font-medium" routerLink="/staff/reports">View daily reports</a>
                </div>
            </p-card>
        </div>
    `
})
export class StaffDashboard {
    readonly data = inject(LibraryDataService);

    readonly branchId = this.data.assignedBranchId();
    readonly branch = computed(() => this.data.branches().find((item) => item.id === this.branchId));
    readonly branchName = computed(() => this.branch()?.name ?? 'All branches');

    readonly branchCopies = computed(() => this.data.bookCopies().filter((copy) => !this.branchId || copy.branchId === this.branchId));
    readonly availableCopies = computed(() => this.branchCopies().filter((copy) => copy.status === 'AVAILABLE').length);
    readonly branchLoans = computed(() => this.data.loans().filter((loan) => !this.branchId || loan.branchId === this.branchId));
    readonly activeLoans = computed(() => this.branchLoans().filter((loan) => !loan.returnedAt));
    readonly overdueLoans = computed(() =>
        this.activeLoans()
            .filter((loan) => new Date(loan.dueAt).getTime() < Date.now())
            .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
    );
    readonly branchMembers = computed(() => this.data.members().filter((member) => !this.branchId || member.branchId === this.branchId));

    readonly readyPickups = computed<Reservation[]>(() =>
        this.data.reservations().filter((reservation) => reservation.status === 'READY' && (!this.branchId || reservation.branchId === this.branchId))
    );

    readonly pendingRenewals = computed<RenewalRequest[]>(() =>
        this.data.renewalRequests().filter((request) => {
            if (request.status !== 'PENDING') return false;
            const loan = this.data.loans().find((item) => item.id === request.loanId);
            return !!loan && (!this.branchId || loan.branchId === this.branchId);
        })
    );

    readonly issuedToday = computed(() => this.branchLoans().filter((loan) => new Date(loan.issuedAt).toDateString() === new Date().toDateString()).length);
    readonly returnedToday = computed(() => this.branchLoans().filter((loan) => loan.returnedAt && new Date(loan.returnedAt).toDateString() === new Date().toDateString()).length);

    readonly quickActions = [
        { label: 'Issue Book', hint: 'Scan member and copy', icon: 'pi pi-send', link: '/staff/desk' },
        { label: 'Return Book', hint: 'Close a loan', icon: 'pi pi-replay', link: '/staff/desk' },
        { label: 'Verify Member', hint: 'Check eligibility', icon: 'pi pi-id-card', link: '/staff/members' },
        { label: 'Stock Check', hint: 'Record inventory', icon: 'pi pi-box', link: '/staff/inventory' },
        { label: 'Daily Report', hint: 'Issues and returns', icon: 'pi pi-file-pdf', link: '/staff/reports' },
        { label: 'Confirmations', hint: 'Send receipts', icon: 'pi pi-envelope', link: '/staff/confirmations' }
    ];

    copyBarcode(copyId: string): string {
        return this.data.bookCopies().find((copy) => copy.id === copyId)?.barcode ?? copyId;
    }

    loanBookId(loanId: string): string {
        return this.data.loans().find((loan) => loan.id === loanId)?.bookId ?? '';
    }

    overdueDays(loan: Loan): number {
        return Math.max(0, Math.ceil((Date.now() - new Date(loan.dueAt).getTime()) / 86400000));
    }

    formatDate(value: string): string {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '—';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
}
