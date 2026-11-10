import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { EmptyState } from '@/app/shared/components/empty-state';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatCard } from '@/app/shared/components/stat-card';
import { LibraryDataService } from '@/app/core/services/library-data.service';
import type { BorrowRequestStatus, RenewalRequestStatus, ReservationStatus } from '@/app/core/models/library.models';

@Component({
    selector: 'app-requests',
    standalone: true,
    imports: [CommonModule, ButtonModule, CardModule, TableModule, TabsModule, TagModule, ToastModule, TooltipModule, EmptyState, PageHeader, StatCard],
    providers: [MessageService],
    template: `
        <app-page-header title="Requests & Approvals" subtitle="Approve or reject borrowing, reservation and renewal requests"></app-page-header>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
            <app-stat-card label="Borrow Requests" [value]="data.pendingBorrowRequests().length" context="awaiting approval" icon="pi pi-inbox"></app-stat-card>
            <app-stat-card label="Reservations" [value]="data.pendingReservations().length" context="pending or ready" icon="pi pi-bookmark" iconBg="orange"></app-stat-card>
            <app-stat-card label="Renewal Requests" [value]="data.pendingRenewalRequests().length" context="awaiting review" icon="pi pi-refresh" iconBg="primary"></app-stat-card>
            <app-stat-card label="Approved Today" [value]="approvedToday()" context="processed requests" icon="pi pi-check-circle" iconBg="green"></app-stat-card>
        </div>

        <p-tabs [value]="activeTab()" (valueChange)="activeTab.set($event)">
            <p-tablist>
                <p-tab value="borrow">Borrowing Requests</p-tab>
                <p-tab value="reservations">Reservations</p-tab>
                <p-tab value="renewals">Renewal Requests</p-tab>
            </p-tablist>
            <p-tabpanels>
                <p-tabpanel value="borrow">
                    <div class="pt-4">
                        <p-card>
                            @if (borrowRows().length === 0) {
                                <app-empty-state icon="pi pi-inbox" title="No borrowing requests" message="New borrowing requests will appear here." />
                            } @else {
                                <div class="overflow-x-auto">
                                    <p-table [value]="borrowRows()" dataKey="id" [paginator]="true" [rows]="10" [tableStyle]="{ 'min-width': '64rem' }" styleClass="w-full">
                                        <ng-template pTemplate="header">
                                            <tr>
                                                <th>Book</th>
                                                <th>Member</th>
                                                <th>Branch</th>
                                                <th>Requested</th>
                                                <th>Note</th>
                                                <th>Status</th>
                                                <th style="width: 9rem">Actions</th>
                                            </tr>
                                        </ng-template>
                                        <ng-template pTemplate="body" let-row>
                                            <tr>
                                                <td class="font-medium">{{ data.bookTitle(row.bookId) }}</td>
                                                <td class="text-sm">{{ data.memberName(row.memberId) }}</td>
                                                <td class="text-sm">{{ data.branchName(row.branchId) }}</td>
                                                <td class="text-sm whitespace-nowrap">{{ formatDate(row.requestedAt) }}</td>
                                                <td class="text-sm max-w-[20rem]">{{ row.notes || '—' }}</td>
                                                <td><p-tag [value]="borrowLabel(row.status)" [severity]="borrowSeverity(row.status)"></p-tag></td>
                                                <td>
                                                    @if (row.status === 'PENDING') {
                                                        <div class="flex items-center gap-1">
                                                            <p-button icon="pi pi-check" [rounded]="true" [text]="true" severity="success" pTooltip="Approve" tooltipPosition="top" (onClick)="approveBorrow(row.id)"></p-button>
                                                            <p-button icon="pi pi-times" [rounded]="true" [text]="true" severity="danger" pTooltip="Reject" tooltipPosition="top" (onClick)="rejectBorrow(row.id)"></p-button>
                                                        </div>
                                                    } @else {
                                                        <span class="text-xs text-muted-color">{{ row.reviewedBy || '—' }}</span>
                                                    }
                                                </td>
                                            </tr>
                                        </ng-template>
                                    </p-table>
                                </div>
                            }
                        </p-card>
                    </div>
                </p-tabpanel>

                <p-tabpanel value="reservations">
                    <div class="pt-4">
                        <p-card>
                            @if (reservationRows().length === 0) {
                                <app-empty-state icon="pi pi-bookmark" title="No reservations" message="Online reservations and waitlists will appear here." />
                            } @else {
                                <div class="overflow-x-auto">
                                    <p-table [value]="reservationRows()" dataKey="id" [paginator]="true" [rows]="10" [tableStyle]="{ 'min-width': '66rem' }" styleClass="w-full">
                                        <ng-template pTemplate="header">
                                            <tr>
                                                <th>Book</th>
                                                <th>Member</th>
                                                <th>Branch</th>
                                                <th>Requested</th>
                                                <th>Ready / Expires</th>
                                                <th>Status</th>
                                                <th style="width: 12rem">Actions</th>
                                            </tr>
                                        </ng-template>
                                        <ng-template pTemplate="body" let-row>
                                            <tr>
                                                <td class="font-medium">{{ data.bookTitle(row.bookId) }}</td>
                                                <td class="text-sm">{{ data.memberName(row.memberId) }}</td>
                                                <td class="text-sm">{{ data.branchName(row.branchId) }}</td>
                                                <td class="text-sm whitespace-nowrap">{{ formatDate(row.requestedAt) }}</td>
                                                <td class="text-sm whitespace-nowrap">
                                                    @if (row.expiresAt) {
                                                        {{ formatDate(row.expiresAt) }}
                                                    } @else {
                                                        <span class="text-muted-color">Not ready</span>
                                                    }
                                                </td>
                                                <td><p-tag [value]="reservationLabel(row.status)" [severity]="reservationSeverity(row.status)"></p-tag></td>
                                                <td>
                                                    @if (row.status === 'PENDING') {
                                                        <div class="flex items-center gap-1">
                                                            <p-button label="Ready" size="small" severity="success" [outlined]="true" (onClick)="approveReservation(row.id)"></p-button>
                                                            <p-button icon="pi pi-times" [rounded]="true" [text]="true" severity="danger" pTooltip="Cancel" tooltipPosition="top" (onClick)="cancelReservation(row.id)"></p-button>
                                                        </div>
                                                    } @else if (row.status === 'READY') {
                                                        <div class="flex items-center gap-1">
                                                            <p-button label="Fulfil" size="small" severity="success" (onClick)="fulfillReservation(row.id)"></p-button>
                                                            <p-button icon="pi pi-times" [rounded]="true" [text]="true" severity="danger" pTooltip="Cancel" tooltipPosition="top" (onClick)="cancelReservation(row.id)"></p-button>
                                                        </div>
                                                    } @else {
                                                        <span class="text-xs text-muted-color">—</span>
                                                    }
                                                </td>
                                            </tr>
                                        </ng-template>
                                    </p-table>
                                </div>
                            }
                        </p-card>
                    </div>
                </p-tabpanel>

                <p-tabpanel value="renewals">
                    <div class="pt-4">
                        <p-card>
                            @if (renewalRows().length === 0) {
                                <app-empty-state icon="pi pi-refresh" title="No renewal requests" message="Renewal requests from members will appear here." />
                            } @else {
                                <div class="overflow-x-auto">
                                    <p-table [value]="renewalRows()" dataKey="id" [paginator]="true" [rows]="10" [tableStyle]="{ 'min-width': '64rem' }" styleClass="w-full">
                                        <ng-template pTemplate="header">
                                            <tr>
                                                <th>Book</th>
                                                <th>Member</th>
                                                <th>Current Due</th>
                                                <th>Requested</th>
                                                <th>Note</th>
                                                <th>Status</th>
                                                <th style="width: 9rem">Actions</th>
                                            </tr>
                                        </ng-template>
                                        <ng-template pTemplate="body" let-row>
                                            <tr>
                                                <td class="font-medium">{{ data.bookTitle(loanBookId(row.loanId)) }}</td>
                                                <td class="text-sm">{{ data.memberName(row.memberId) }}</td>
                                                <td class="text-sm">{{ loanDue(row.loanId) }}</td>
                                                <td class="text-sm whitespace-nowrap">{{ formatDate(row.requestedAt) }}</td>
                                                <td class="text-sm max-w-[18rem]">{{ row.notes || '—' }}</td>
                                                <td><p-tag [value]="renewalLabel(row.status)" [severity]="renewalSeverity(row.status)"></p-tag></td>
                                                <td>
                                                    @if (row.status === 'PENDING') {
                                                        <div class="flex items-center gap-1">
                                                            <p-button icon="pi pi-check" [rounded]="true" [text]="true" severity="success" pTooltip="Approve renewal" tooltipPosition="top" (onClick)="approveRenewal(row.id)"></p-button>
                                                            <p-button icon="pi pi-times" [rounded]="true" [text]="true" severity="danger" pTooltip="Reject renewal" tooltipPosition="top" (onClick)="rejectRenewal(row.id)"></p-button>
                                                        </div>
                                                    } @else {
                                                        <span class="text-xs text-muted-color">{{ row.reviewedBy || '—' }}</span>
                                                    }
                                                </td>
                                            </tr>
                                        </ng-template>
                                    </p-table>
                                </div>
                            }
                        </p-card>
                    </div>
                </p-tabpanel>
            </p-tabpanels>
        </p-tabs>

        <p-toast></p-toast>
    `
})
export class RequestsPage {
    readonly data = inject(LibraryDataService);
    private readonly msg = inject(MessageService);

    readonly activeTab = signal<string | number | undefined>('borrow');

    readonly borrowRows = computed(() =>
        [...this.data.borrowRequests()].sort((a, b) => {
            if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
            if (b.status === 'PENDING' && a.status !== 'PENDING') return 1;
            return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
        })
    );

    readonly reservationRows = computed(() =>
        [...this.data.reservations()].sort((a, b) => {
            const rank = (status: ReservationStatus): number => (status === 'PENDING' ? 0 : status === 'READY' ? 1 : 2);
            return rank(a.status) - rank(b.status) || new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
        })
    );

    readonly renewalRows = computed(() =>
        [...this.data.renewalRequests()].sort((a, b) => {
            if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
            if (b.status === 'PENDING' && a.status !== 'PENDING') return 1;
            return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
        })
    );

    readonly approvedToday = computed(() => {
        const today = new Date().toDateString();
        const borrow = this.data.borrowRequests().filter((request) => request.status === 'APPROVED' && request.reviewedAt && new Date(request.reviewedAt).toDateString() === today).length;
        const renewals = this.data.renewalRequests().filter((request) => request.status === 'APPROVED' && request.reviewedAt && new Date(request.reviewedAt).toDateString() === today).length;
        return borrow + renewals;
    });

    approveBorrow(id: string): void {
        this.run(() => this.data.approveBorrowRequest(id), 'Borrowing approved', 'The member can now collect the book.');
    }

    rejectBorrow(id: string): void {
        this.run(() => this.data.rejectBorrowRequest(id), 'Borrowing rejected', 'The request was rejected.');
    }

    approveReservation(id: string): void {
        this.run(() => this.data.approveReservation(id), 'Reservation ready', 'The member can collect the reserved copy.');
    }

    cancelReservation(id: string): void {
        this.run(() => this.data.cancelReservation(id), 'Reservation cancelled', 'The reservation was cancelled.');
    }

    fulfillReservation(id: string): void {
        this.run(() => this.data.fulfillReservation(id), 'Reservation fulfilled', 'The reservation was marked as fulfilled.');
    }

    approveRenewal(id: string): void {
        this.run(() => this.data.approveRenewalRequest(id), 'Renewal approved', 'The loan due date was extended.');
    }

    rejectRenewal(id: string): void {
        this.run(() => this.data.rejectRenewalRequest(id), 'Renewal rejected', 'The renewal request was rejected.');
    }

    loanBookId(loanId: string): string {
        return this.data.loans().find((loan) => loan.id === loanId)?.bookId ?? '';
    }

    loanDue(loanId: string): string {
        const loan = this.data.loans().find((item) => item.id === loanId);
        return loan ? this.formatDate(loan.dueAt) : '—';
    }

    borrowLabel(status: BorrowRequestStatus): string {
        return status === 'PENDING' ? 'Pending' : status === 'APPROVED' ? 'Approved' : status === 'FULFILLED' ? 'Fulfilled' : 'Rejected';
    }

    borrowSeverity(status: BorrowRequestStatus): 'warn' | 'success' | 'danger' | 'secondary' {
        return status === 'PENDING' ? 'warn' : status === 'APPROVED' || status === 'FULFILLED' ? 'success' : 'danger';
    }

    reservationLabel(status: ReservationStatus): string {
        return status === 'PENDING' ? 'Pending' : status === 'READY' ? 'Ready' : status === 'FULFILLED' ? 'Fulfilled' : status === 'CANCELLED' ? 'Cancelled' : 'Expired';
    }

    reservationSeverity(status: ReservationStatus): 'warn' | 'success' | 'danger' | 'secondary' {
        return status === 'PENDING' ? 'warn' : status === 'READY' || status === 'FULFILLED' ? 'success' : 'secondary';
    }

    renewalLabel(status: RenewalRequestStatus): string {
        return status === 'PENDING' ? 'Pending' : status === 'APPROVED' ? 'Approved' : 'Rejected';
    }

    renewalSeverity(status: RenewalRequestStatus): 'warn' | 'success' | 'danger' {
        return status === 'PENDING' ? 'warn' : status === 'APPROVED' ? 'success' : 'danger';
    }

    formatDate(value: string): string {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '—';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    private run(action: () => void, summary: string, detail: string): void {
        try {
            action();
            this.msg.add({ severity: 'success', summary, detail });
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Action failed', detail: error instanceof Error ? error.message : 'Something went wrong.' });
        }
    }
}
