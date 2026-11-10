import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { EmptyState } from '@/app/shared/components/empty-state';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatCard } from '@/app/shared/components/stat-card';
import { AuthService } from '@/app/core/services/auth.service';
import { LibraryDataService } from '@/app/core/services/library-data.service';
import type { Loan, RenewalRequest } from '@/app/core/models/library.models';

@Component({
    selector: 'app-my-loans',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, CardModule, MessageModule, TableModule, TabsModule, TagModule, ToastModule, EmptyState, PageHeader, StatCard],
    providers: [MessageService],
    template: `
        <app-page-header title="My Borrowed Books" subtitle="Track due dates, request renewals and review your borrowing history">
            <p-button label="Search Catalog" icon="pi pi-search" routerLink="/my-library/catalog"></p-button>
        </app-page-header>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
            <app-stat-card label="Active Loans" [value]="activeLoans().length" context="currently borrowed" icon="pi pi-send"></app-stat-card>
            <app-stat-card label="Overdue" [value]="overdueCount()" context="return as soon as possible" icon="pi pi-exclamation-triangle" iconBg="red"></app-stat-card>
            <app-stat-card label="Due Soon" [value]="dueSoonCount()" context="within 7 days" icon="pi pi-clock" iconBg="orange"></app-stat-card>
            <app-stat-card label="Total History" [value]="history().length" context="returned loans" icon="pi pi-history" iconBg="primary"></app-stat-card>
        </div>

        <p-tabs [value]="activeTab()" (valueChange)="activeTab.set($event)">
            <p-tablist>
                <p-tab value="current">Current Loans</p-tab>
                <p-tab value="history">Borrowing History</p-tab>
            </p-tablist>
            <p-tabpanels>
                <p-tabpanel value="current">
                    <div class="pt-4">
                        <p-card>
                            @if (activeLoans().length === 0) {
                                <app-empty-state icon="pi pi-book" title="No active loans" message="You have no books on loan right now." actionLabel="Browse Catalog" (action)="openCatalog()"></app-empty-state>
                            } @else {
                                <div class="overflow-x-auto">
                                    <p-table [value]="activeLoans()" dataKey="id" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '64rem' }">
                                        <ng-template pTemplate="header">
                                            <tr>
                                                <th>Book</th>
                                                <th>Branch</th>
                                                <th>Issued</th>
                                                <th>Due Date</th>
                                                <th class="text-center">Renewals</th>
                                                <th>Status</th>
                                                <th style="width: 11rem">Renewal</th>
                                            </tr>
                                        </ng-template>
                                        <ng-template pTemplate="body" let-loan>
                                            <tr>
                                                <td>
                                                    <div class="font-medium">{{ data.bookTitle(loan.bookId) }}</div>
                                                    <div class="text-xs text-muted-color font-mono">{{ copyBarcode(loan.copyId) }}</div>
                                                </td>
                                                <td class="text-sm">{{ data.branchName(loan.branchId) }}</td>
                                                <td class="text-sm">{{ formatDate(loan.issuedAt) }}</td>
                                                <td class="text-sm">
                                                    <div>{{ formatDate(loan.dueAt) }}</div>
                                                    @if (isOverdue(loan)) {
                                                        <div class="text-xs text-red-500">{{ overdueDays(loan) }} day(s) overdue</div>
                                                    }
                                                </td>
                                                <td class="text-center text-sm">{{ loan.renewalCount }}</td>
                                                <td><p-tag [value]="isOverdue(loan) ? 'Overdue' : 'Active'" [severity]="isOverdue(loan) ? 'danger' : 'success'"></p-tag></td>
                                                <td>
                                                    @if (renewalFor(loan); as request) {
                                                        <p-tag [value]="renewalLabel(request.status)" [severity]="renewalSeverity(request.status)"></p-tag>
                                                    } @else {
                                                        <p-button label="Request Renewal" size="small" [outlined]="true" (onClick)="requestRenewal(loan)"></p-button>
                                                    }
                                                </td>
                                            </tr>
                                        </ng-template>
                                    </p-table>
                                </div>
                                <p-message severity="info" icon="pi pi-info-circle" styleClass="w-full mt-4">
                                    Renewal requests are reviewed by library staff. Your due date changes only after approval.
                                </p-message>
                            }
                        </p-card>
                    </div>
                </p-tabpanel>

                <p-tabpanel value="history">
                    <div class="pt-4">
                        <p-card>
                            @if (history().length === 0) {
                                <app-empty-state icon="pi pi-history" title="No borrowing history" message="Returned loans will appear here." />
                            } @else {
                                <div class="overflow-x-auto">
                                    <p-table [value]="history()" dataKey="id" [paginator]="true" [rows]="10" [tableStyle]="{ 'min-width': '52rem' }" styleClass="w-full">
                                        <ng-template pTemplate="header">
                                            <tr>
                                                <th>Book</th>
                                                <th>Branch</th>
                                                <th>Issued</th>
                                                <th>Due</th>
                                                <th>Returned</th>
                                                <th>Status</th>
                                            </tr>
                                        </ng-template>
                                        <ng-template pTemplate="body" let-loan>
                                            <tr>
                                                <td>
                                                    <div class="font-medium">{{ data.bookTitle(loan.bookId) }}</div>
                                                    <div class="text-xs text-muted-color font-mono">{{ copyBarcode(loan.copyId) }}</div>
                                                </td>
                                                <td class="text-sm">{{ data.branchName(loan.branchId) }}</td>
                                                <td class="text-sm">{{ formatDate(loan.issuedAt) }}</td>
                                                <td class="text-sm">{{ formatDate(loan.dueAt) }}</td>
                                                <td class="text-sm">{{ loan.returnedAt ? formatDate(loan.returnedAt) : '—' }}</td>
                                                <td><p-tag [value]="loan.status" [severity]="loan.status === 'RETURNED' ? 'success' : 'danger'"></p-tag></td>
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
export class MyLoans {
    readonly data = inject(LibraryDataService);
    readonly auth = inject(AuthService);
    private readonly msg = inject(MessageService);
    private readonly router = inject(Router);

    readonly activeTab = signal<string | number | undefined>('current');
    readonly member = computed(() => this.data.memberForUsername(this.auth.username()));

    readonly myLoans = computed(() => {
        const me = this.member();
        return me ? this.data.loans().filter((loan) => loan.memberId === me.id) : [];
    });

    readonly activeLoans = computed(() => this.myLoans().filter((loan) => !loan.returnedAt).sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()));
    readonly history = computed(() => this.myLoans().filter((loan) => !!loan.returnedAt).sort((a, b) => new Date(b.returnedAt ?? '').getTime() - new Date(a.returnedAt ?? '').getTime()));
    readonly overdueCount = computed(() => this.activeLoans().filter((loan) => this.isOverdue(loan)).length);
    readonly dueSoonCount = computed(() => {
        const threshold = Date.now() + 7 * 86400000;
        return this.activeLoans().filter((loan) => {
            const due = new Date(loan.dueAt).getTime();
            return due >= Date.now() && due <= threshold;
        }).length;
    });

    renewalFor(loan: Loan): RenewalRequest | undefined {
        return this.data
            .renewalRequests()
            .filter((request) => request.loanId === loan.id && request.status !== 'REJECTED')
            .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())[0];
    }

    requestRenewal(loan: Loan): void {
        try {
            this.data.requestRenewal(loan.id);
            this.msg.add({ severity: 'success', summary: 'Renewal requested', detail: 'Library staff will review your request.' });
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Request failed', detail: error instanceof Error ? error.message : 'Something went wrong.' });
        }
    }

    openCatalog(): void {
        this.router.navigate(['/my-library/catalog']);
    }

    copyBarcode(copyId: string): string {
        return this.data.bookCopies().find((copy) => copy.id === copyId)?.barcode ?? copyId;
    }

    isOverdue(loan: Loan): boolean {
        return !loan.returnedAt && new Date(loan.dueAt).getTime() < Date.now();
    }

    overdueDays(loan: Loan): number {
        return Math.max(0, Math.ceil((Date.now() - new Date(loan.dueAt).getTime()) / 86400000));
    }

    renewalLabel(status: RenewalRequest['status']): string {
        return status === 'PENDING' ? 'Renewal pending' : status === 'APPROVED' ? 'Renewal approved' : 'Renewal rejected';
    }

    renewalSeverity(status: RenewalRequest['status']): 'warn' | 'success' | 'danger' {
        return status === 'PENDING' ? 'warn' : status === 'APPROVED' ? 'success' : 'danger';
    }

    formatDate(value: string): string {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '—';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
}
