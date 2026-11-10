import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { EmptyState } from '@/app/shared/components/empty-state';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatCard } from '@/app/shared/components/stat-card';
import { LibraryDataService } from '@/app/core/services/library-data.service';
import type { LibraryAuditLog, Loan } from '@/app/core/models/library.models';

@Component({
    selector: 'app-staff-confirmations',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, ButtonModule, CardModule, InputTextModule, MessageModule, SelectModule, TableModule, TagModule, ToastModule, EmptyState, PageHeader, StatCard],
    providers: [MessageService],
    template: `
        <app-page-header title="Borrowing & Return Confirmations" subtitle="Trigger digital receipts for members and review recently sent confirmations">
            <p-button label="Circulation Desk" icon="pi pi-send" severity="secondary" [outlined]="true" routerLink="/staff/desk"></p-button>
        </app-page-header>

        <div class="grid gap-4 sm:grid-cols-3 mb-6">
            <app-stat-card label="Active Loans" [value]="activeCount()" context="borrowing confirmations available" icon="pi pi-send"></app-stat-card>
            <app-stat-card label="Returned Loans" [value]="returnedCount()" context="return confirmations available" icon="pi pi-replay" iconBg="primary"></app-stat-card>
            <app-stat-card label="Sent Today" [value]="sentToday()" context="confirmation messages" icon="pi pi-envelope" iconBg="green"></app-stat-card>
        </div>

        <p-message severity="info" icon="pi pi-info-circle" styleClass="w-full mb-4">
            This prototype records each confirmation and writes it to the audit log. Production delivery would use the member's email or SMS gateway.
        </p-message>

        <p-card>
            <div class="grid gap-3 lg:grid-cols-3 mb-4">
                <span class="relative block lg:col-span-2">
                    <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-color"></i>
                    <input pInputText type="text" placeholder="Search book, member or barcode" class="w-full pl-10" [ngModel]="search()" (ngModelChange)="search.set($event)" />
                </span>
                <p-select [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)" [options]="statusOptions" optionLabel="label" optionValue="value" placeholder="Loan status" [showClear]="true" appendTo="body" styleClass="w-full"></p-select>
            </div>

            @if (filteredLoans().length === 0) {
                <app-empty-state icon="pi pi-envelope" title="No loans found" message="No loans match the current filters." />
            } @else {
                <div class="overflow-x-auto">
                    <p-table [value]="filteredLoans()" dataKey="id" [paginator]="true" [rows]="10" [tableStyle]="{ 'min-width': '64rem' }" styleClass="w-full">
                        <ng-template pTemplate="header">
                            <tr>
                                <th>Book / Copy</th>
                                <th>Member</th>
                                <th>Issued</th>
                                <th>Due</th>
                                <th>Returned</th>
                                <th>Status</th>
                                <th style="width: 14rem">Confirmation</th>
                            </tr>
                        </ng-template>
                        <ng-template pTemplate="body" let-loan>
                            <tr>
                                <td>
                                    <div class="font-medium">{{ data.bookTitle(loan.bookId) }}</div>
                                    <div class="text-xs text-muted-color font-mono">{{ copyBarcode(loan.copyId) }}</div>
                                </td>
                                <td class="text-sm">{{ data.memberName(loan.memberId) }}</td>
                                <td class="text-sm whitespace-nowrap">{{ formatDate(loan.issuedAt) }}</td>
                                <td class="text-sm whitespace-nowrap">{{ formatDate(loan.dueAt) }}</td>
                                <td class="text-sm whitespace-nowrap">{{ loan.returnedAt ? formatDate(loan.returnedAt) : '—' }}</td>
                                <td><p-tag [value]="loan.returnedAt ? 'Returned' : 'Active'" [severity]="loan.returnedAt ? 'success' : 'info'"></p-tag></td>
                                <td>
                                    <div class="flex flex-col gap-1">
                                        <p-button label="Send Borrowing Receipt" size="small" severity="secondary" [outlined]="true" (onClick)="send(loan, 'ISSUE')"></p-button>
                                        @if (loan.returnedAt) {
                                            <p-button label="Send Return Receipt" size="small" severity="success" [outlined]="true" (onClick)="send(loan, 'RETURN')"></p-button>
                                        }
                                    </div>
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>
                </div>
            }
        </p-card>

        <p-card styleClass="mt-4">
            <ng-template pTemplate="header">
                <div class="px-4 pt-4">
                    <h2 class="text-lg font-semibold">Recent Confirmations</h2>
                    <p class="text-xs text-muted-color mt-0.5">Messages triggered from the service desk</p>
                </div>
            </ng-template>
            @if (confirmations().length === 0) {
                <app-empty-state icon="pi pi-envelope" title="No confirmations sent" message="Send a receipt to see it recorded here." />
            } @else {
                <div class="flex flex-col gap-2">
                    @for (entry of confirmations(); track entry.id) {
                        <div class="flex items-start gap-3 rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                            <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-primary-100 dark:bg-primary-950 text-primary shrink-0">
                                <i class="pi pi-envelope text-xs"></i>
                            </div>
                            <div class="min-w-0 flex-1">
                                <div class="text-sm">{{ entry.detail }}</div>
                                <div class="text-xs text-muted-color mt-0.5">{{ entry.actor }} · {{ formatDateTime(entry.createdAt) }}</div>
                            </div>
                        </div>
                    }
                </div>
            }
        </p-card>

        <p-toast></p-toast>
    `
})
export class StaffConfirmations {
    readonly data = inject(LibraryDataService);
    private readonly msg = inject(MessageService);

    readonly branchId = this.data.assignedBranchId();
    readonly search = signal('');
    readonly statusFilter = signal<'ACTIVE' | 'RETURNED' | null>(null);

    readonly statusOptions = [
        { label: 'All Loans', value: null },
        { label: 'Active', value: 'ACTIVE' },
        { label: 'Returned', value: 'RETURNED' }
    ];

    readonly branchLoans = computed(() => this.data.loans().filter((loan) => !this.branchId || loan.branchId === this.branchId));
    readonly activeCount = computed(() => this.branchLoans().filter((loan) => !loan.returnedAt).length);
    readonly returnedCount = computed(() => this.branchLoans().filter((loan) => !!loan.returnedAt).length);

    readonly filteredLoans = computed(() => {
        const query = this.search().trim().toLowerCase();
        const status = this.statusFilter();
        return this.branchLoans()
            .filter((loan) => {
                const matchesStatus = !status || (status === 'RETURNED' ? !!loan.returnedAt : !loan.returnedAt);
                const haystack = `${this.data.bookTitle(loan.bookId)} ${this.data.memberName(loan.memberId)} ${this.copyBarcode(loan.copyId)}`.toLowerCase();
                return matchesStatus && (!query || haystack.includes(query));
            })
            .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());
    });

    readonly confirmations = computed<LibraryAuditLog[]>(() =>
        this.data
            .auditLogs()
            .filter((log) => log.entity === 'Confirmation' && (!this.branchId || log.branchId === this.branchId))
            .slice(0, 20)
    );

    readonly sentToday = computed(() => this.confirmations().filter((log) => new Date(log.createdAt).toDateString() === new Date().toDateString()).length);

    send(loan: Loan, kind: 'ISSUE' | 'RETURN'): void {
        try {
            this.msg.add({ severity: 'success', summary: 'Confirmation sent', detail: this.data.sendConfirmation(loan.id, kind) });
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Send failed', detail: error instanceof Error ? error.message : 'Something went wrong.' });
        }
    }

    copyBarcode(copyId: string): string {
        return this.data.bookCopies().find((copy) => copy.id === copyId)?.barcode ?? copyId;
    }

    formatDate(value: string): string {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '—';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    formatDateTime(value: string): string {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '—';
        return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    }
}
