import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DatePickerModule } from 'primeng/datepicker';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { EmptyState } from '@/app/shared/components/empty-state';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatCard } from '@/app/shared/components/stat-card';
import { LibraryDataService } from '@/app/core/services/library-data.service';
import type { Loan } from '@/app/core/models/library.models';

@Component({
    selector: 'app-staff-reports',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, CardModule, DatePickerModule, TableModule, TagModule, ToastModule, EmptyState, PageHeader, StatCard],
    providers: [MessageService],
    styles: [
        `
            .print-only {
                display: none;
            }

            @media print {
                .no-print {
                    display: none !important;
                }

                .print-only {
                    display: block !important;
                }

                @page {
                    margin: 12mm;
                }
            }
        `
    ],
    template: `
        <app-page-header class="no-print" [title]="'Daily Reports — ' + branchName()" subtitle="Issue, return and overdue activity for your assigned branch">
            <p-datepicker [ngModel]="selectedDate()" (ngModelChange)="selectedDate.set($event)" dateFormat="yy-mm-dd" [showIcon]="true" appendTo="body" styleClass="w-48"></p-datepicker>
            <p-button label="Print" icon="pi pi-print" severity="secondary" [outlined]="true" (onClick)="printReport()"></p-button>
            <p-button label="Export CSV" icon="pi pi-download" (onClick)="exportCsv()"></p-button>
        </app-page-header>

        <div class="print-only mb-4">
            <h1 class="text-xl font-bold">{{ data.settings().libraryName }} — Daily Operations Report</h1>
            <p class="text-sm">{{ branchName() }} · {{ dateLabel() }}</p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
            <app-stat-card label="Issued" [value]="issuedLoans().length" [context]="dateLabel()" icon="pi pi-send" iconBg="green"></app-stat-card>
            <app-stat-card label="Returned" [value]="returnedLoans().length" [context]="dateLabel()" icon="pi pi-replay" iconBg="primary"></app-stat-card>
            <app-stat-card label="Active Loans" [value]="activeLoans().length" context="currently open" icon="pi pi-book" iconBg="primary"></app-stat-card>
            <app-stat-card label="Overdue" [value]="overdueLoans().length" context="requires follow-up" icon="pi pi-exclamation-triangle" iconBg="red"></app-stat-card>
        </div>

        <div class="grid gap-4 xl:grid-cols-2">
            <p-card>
                <ng-template pTemplate="header">
                    <div class="px-4 pt-4">
                        <h2 class="text-lg font-semibold">Issued on {{ dateLabel() }}</h2>
                        <p class="text-xs text-muted-color mt-0.5">New loans recorded at the desk</p>
                    </div>
                </ng-template>
                @if (issuedLoans().length === 0) {
                    <app-empty-state icon="pi pi-send" title="No issues" message="No books were issued on this date." />
                } @else {
                    <div class="overflow-x-auto">
                        <p-table [value]="issuedLoans()" dataKey="id" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '34rem' }">
                            <ng-template pTemplate="header">
                                <tr><th>Book</th><th>Member</th><th>Due</th></tr>
                            </ng-template>
                            <ng-template pTemplate="body" let-loan>
                                <tr>
                                    <td>
                                        <div class="text-sm">{{ data.bookTitle(loan.bookId) }}</div>
                                        <div class="text-xs text-muted-color font-mono">{{ copyBarcode(loan.copyId) }}</div>
                                    </td>
                                    <td class="text-sm">{{ data.memberName(loan.memberId) }}</td>
                                    <td class="text-sm">{{ formatDate(loan.dueAt) }}</td>
                                </tr>
                            </ng-template>
                        </p-table>
                    </div>
                }
            </p-card>

            <p-card>
                <ng-template pTemplate="header">
                    <div class="px-4 pt-4">
                        <h2 class="text-lg font-semibold">Returned on {{ dateLabel() }}</h2>
                        <p class="text-xs text-muted-color mt-0.5">Loans closed at the desk</p>
                    </div>
                </ng-template>
                @if (returnedLoans().length === 0) {
                    <app-empty-state icon="pi pi-replay" title="No returns" message="No books were returned on this date." />
                } @else {
                    <div class="overflow-x-auto">
                        <p-table [value]="returnedLoans()" dataKey="id" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '34rem' }">
                            <ng-template pTemplate="header">
                                <tr><th>Book</th><th>Member</th><th>Returned</th></tr>
                            </ng-template>
                            <ng-template pTemplate="body" let-loan>
                                <tr>
                                    <td>
                                        <div class="text-sm">{{ data.bookTitle(loan.bookId) }}</div>
                                        <div class="text-xs text-muted-color font-mono">{{ copyBarcode(loan.copyId) }}</div>
                                    </td>
                                    <td class="text-sm">{{ data.memberName(loan.memberId) }}</td>
                                    <td class="text-sm">{{ loan.returnedAt ? formatDate(loan.returnedAt) : '—' }}</td>
                                </tr>
                            </ng-template>
                        </p-table>
                    </div>
                }
            </p-card>
        </div>

        <p-card styleClass="mt-4">
            <ng-template pTemplate="header">
                <div class="px-4 pt-4">
                    <h2 class="text-lg font-semibold">Overdue Loans</h2>
                    <p class="text-xs text-muted-color mt-0.5">Current overdue items at this branch</p>
                </div>
            </ng-template>
            @if (overdueLoans().length === 0) {
                <app-empty-state icon="pi pi-check-circle" title="No overdue loans" message="All active loans are within their due dates." />
            } @else {
                <div class="overflow-x-auto">
                    <p-table [value]="overdueLoans()" dataKey="id" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '46rem' }">
                        <ng-template pTemplate="header">
                            <tr><th>Book</th><th>Member</th><th>Due</th><th class="text-right">Days Overdue</th></tr>
                        </ng-template>
                        <ng-template pTemplate="body" let-loan>
                            <tr>
                                <td>
                                    <div class="text-sm">{{ data.bookTitle(loan.bookId) }}</div>
                                    <div class="text-xs text-muted-color font-mono">{{ copyBarcode(loan.copyId) }}</div>
                                </td>
                                <td class="text-sm">{{ data.memberName(loan.memberId) }}</td>
                                <td class="text-sm">{{ formatDate(loan.dueAt) }}</td>
                                <td class="text-right text-sm text-red-500 font-medium">{{ overdueDays(loan) }}</td>
                            </tr>
                        </ng-template>
                    </p-table>
                </div>
            }
        </p-card>

        <p-toast></p-toast>
    `
})
export class StaffReports {
    readonly data = inject(LibraryDataService);
    private readonly msg = inject(MessageService);

    readonly branchId = this.data.assignedBranchId();
    readonly branchName = computed(() => this.data.branches().find((branch) => branch.id === this.branchId)?.name ?? 'All branches');
    readonly selectedDate = signal<Date | null>(new Date());

    readonly branchLoans = computed(() => this.data.loans().filter((loan) => !this.branchId || loan.branchId === this.branchId));

    readonly issuedLoans = computed(() => this.branchLoans().filter((loan) => this.sameDay(loan.issuedAt)).sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()));
    readonly returnedLoans = computed(() => this.branchLoans().filter((loan) => !!loan.returnedAt && this.sameDay(loan.returnedAt)).sort((a, b) => new Date(b.returnedAt ?? '').getTime() - new Date(a.returnedAt ?? '').getTime()));
    readonly activeLoans = computed(() => this.branchLoans().filter((loan) => !loan.returnedAt));
    readonly overdueLoans = computed(() =>
        this.activeLoans()
            .filter((loan) => new Date(loan.dueAt).getTime() < Date.now())
            .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
    );

    readonly dateLabel = computed(() => (this.selectedDate() ? this.selectedDate()!.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Today'));

    sameDay(value: string | null): boolean {
        if (!value) return false;
        const date = this.selectedDate();
        const target = date ?? new Date();
        const parsed = new Date(value);
        return parsed.getFullYear() === target.getFullYear() && parsed.getMonth() === target.getMonth() && parsed.getDate() === target.getDate();
    }

    printReport(): void {
        window.print();
    }

    exportCsv(): void {
        const header = ['Type', 'Book', 'Copy', 'Member', 'Date', 'Due'];
        const rows = [
            ...this.issuedLoans().map((loan) => ['ISSUE', this.data.bookTitle(loan.bookId), this.copyBarcode(loan.copyId), this.data.memberName(loan.memberId), loan.issuedAt, loan.dueAt]),
            ...this.returnedLoans().map((loan) => ['RETURN', this.data.bookTitle(loan.bookId), this.copyBarcode(loan.copyId), this.data.memberName(loan.memberId), loan.returnedAt ?? '', loan.dueAt])
        ];
        const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'staff-daily-report.csv';
        link.click();
        URL.revokeObjectURL(url);
        this.msg.add({ severity: 'success', summary: 'CSV exported', detail: `${rows.length} transaction(s) exported.` });
    }

    copyBarcode(copyId: string): string {
        return this.data.bookCopies().find((copy) => copy.id === copyId)?.barcode ?? copyId;
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
