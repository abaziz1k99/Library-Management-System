import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { EmptyState } from '@/app/shared/components/empty-state';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatCard } from '@/app/shared/components/stat-card';
import { LibraryDataService } from '@/app/core/services/library-data.service';
import type { Loan } from '@/app/core/models/library.models';

@Component({
    selector: 'app-circulation',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        ButtonModule,
        CardModule,
        ConfirmDialogModule,
        InputTextModule,
        MessageModule,
        SelectModule,
        TableModule,
        TabsModule,
        TagModule,
        ToastModule,
        TooltipModule,
        EmptyState,
        PageHeader,
        StatCard
    ],
    providers: [ConfirmationService, MessageService],
    template: `
        <app-page-header title="Circulation Desk" subtitle="Issue books, record returns, renew loans and report lost copies">
            <p-button label="Requests & Approvals" icon="pi pi-inbox" severity="secondary" [outlined]="true" routerLink="/librarian/requests"></p-button>
        </app-page-header>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
            <app-stat-card label="Active Loans" [value]="data.activeLoans().length" context="currently borrowed" icon="pi pi-send"></app-stat-card>
            <app-stat-card label="Overdue" [value]="data.overdueLoans().length" context="past due date" icon="pi pi-exclamation-triangle" iconBg="orange"></app-stat-card>
            <app-stat-card label="Available Copies" [value]="availableCopies().length" context="ready for issue" icon="pi pi-box" iconBg="green"></app-stat-card>
            <app-stat-card label="Returned Today" [value]="returnedToday()" context="closed loans" icon="pi pi-replay" iconBg="primary"></app-stat-card>
        </div>

        <p-tabs [value]="activeTab()" (valueChange)="activeTab.set($event)">
            <p-tablist>
                <p-tab value="active"><i class="pi pi-send mr-2"></i>Active Loans</p-tab>
                <p-tab value="issue"><i class="pi pi-plus-circle mr-2"></i>Issue Book</p-tab>
                <p-tab value="history"><i class="pi pi-history mr-2"></i>Return History</p-tab>
            </p-tablist>
            <p-tabpanels>
                <p-tabpanel value="active">
                    <div class="pt-4">
                        <p-card>
                            <div class="flex flex-col sm:flex-row gap-3 mb-4">
                                <span class="relative block flex-1">
                                    <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-color"></i>
                                    <input pInputText type="text" placeholder="Search book, member or barcode" class="w-full pl-10" [ngModel]="loanSearch()" (ngModelChange)="loanSearch.set($event)" />
                                </span>
                                <p-select [ngModel]="branchFilter()" (ngModelChange)="branchFilter.set($event)" [options]="branchFilterOptions()" optionLabel="label" optionValue="value" placeholder="All branches" [showClear]="true" appendTo="body" styleClass="w-full sm:w-64"></p-select>
                            </div>

                            @if (activeRows().length === 0) {
                                <app-empty-state icon="pi pi-check-circle" title="No active loans" message="All borrowed copies have been returned." />
                            } @else {
                                <div class="overflow-x-auto">
                                    <p-table [value]="activeRows()" dataKey="id" [paginator]="true" [rows]="10" [tableStyle]="{ 'min-width': '68rem' }" styleClass="w-full">
                                        <ng-template pTemplate="header">
                                            <tr>
                                                <th>Book / Copy</th>
                                                <th>Member</th>
                                                <th>Branch</th>
                                                <th>Issued</th>
                                                <th>Due</th>
                                                <th class="text-center">Renewals</th>
                                                <th>Status</th>
                                                <th style="width: 10rem">Actions</th>
                                            </tr>
                                        </ng-template>
                                        <ng-template pTemplate="body" let-row>
                                            <tr>
                                                <td>
                                                    <div class="font-medium">{{ data.bookTitle(row.bookId) }}</div>
                                                    <div class="text-xs text-muted-color font-mono">{{ copyBarcode(row.copyId) }}</div>
                                                </td>
                                                <td class="text-sm">{{ data.memberName(row.memberId) }}</td>
                                                <td class="text-sm">{{ data.branchName(row.branchId) }}</td>
                                                <td class="text-sm">{{ formatDate(row.issuedAt) }}</td>
                                                <td class="text-sm">
                                                    <div>{{ formatDate(row.dueAt) }}</div>
                                                    @if (isOverdue(row)) {
                                                        <div class="text-xs text-red-500">{{ overdueDays(row) }} day(s) overdue</div>
                                                    }
                                                </td>
                                                <td class="text-center text-sm">{{ row.renewalCount }}</td>
                                                <td><p-tag [value]="isOverdue(row) ? 'Overdue' : 'Active'" [severity]="isOverdue(row) ? 'danger' : 'success'"></p-tag></td>
                                                <td>
                                                    <div class="flex items-center gap-1">
                                                        <p-button label="Return" size="small" severity="success" [outlined]="true" (onClick)="returnLoan(row)"></p-button>
                                                        <p-button icon="pi pi-refresh" [rounded]="true" [text]="true" severity="info" pTooltip="Renew loan" tooltipPosition="top" (onClick)="renewLoan(row)"></p-button>
                                                        <p-button icon="pi pi-exclamation-circle" [rounded]="true" [text]="true" severity="danger" pTooltip="Mark lost" tooltipPosition="top" (onClick)="markLost(row)"></p-button>
                                                    </div>
                                                </td>
                                            </tr>
                                        </ng-template>
                                    </p-table>
                                </div>
                            }
                        </p-card>
                    </div>
                </p-tabpanel>

                <p-tabpanel value="issue">
                    <div class="pt-4">
                        <div class="grid gap-4 xl:grid-cols-3">
                            <p-card styleClass="xl:col-span-2">
                                <ng-template pTemplate="header">
                                    <div class="px-4 pt-4">
                                        <h2 class="text-lg font-semibold">Issue a Book</h2>
                                        <p class="text-xs text-muted-color mt-0.5">Select a member and an available copy, or scan a barcode.</p>
                                    </div>
                                </ng-template>
                                <div class="flex flex-col gap-4">
                                    <div class="flex flex-col gap-1.5">
                                        <label class="text-sm font-medium">Scan / enter barcode</label>
                                        <div class="flex gap-2">
                                            <input pInputText class="flex-1" placeholder="e.g. PUL-ALG-0001" [ngModel]="scanValue()" (ngModelChange)="scanValue.set($event)" (keydown.enter)="findByBarcode()" />
                                            <p-button label="Find" icon="pi pi-search" severity="secondary" [outlined]="true" (onClick)="findByBarcode()"></p-button>
                                        </div>
                                    </div>

                                    <div class="flex flex-col gap-1.5">
                                        <label class="text-sm font-medium">Member *</label>
                                        <p-select [ngModel]="issueMemberId()" (ngModelChange)="issueMemberId.set($event)" [options]="memberOptions()" optionLabel="label" optionValue="value" placeholder="Select an active member" [filter]="true" filterBy="label" appendTo="body" styleClass="w-full"></p-select>
                                    </div>

                                    <div class="flex flex-col gap-1.5">
                                        <label class="text-sm font-medium">Available copy *</label>
                                        <p-select [ngModel]="issueCopyId()" (ngModelChange)="issueCopyId.set($event)" [options]="copyOptions()" optionLabel="label" optionValue="value" placeholder="Select an available copy" [filter]="true" filterBy="label" appendTo="body" styleClass="w-full"></p-select>
                                        <small class="text-muted-color">{{ copyOptions().length }} available copy(ies)</small>
                                    </div>

                                    <div class="flex flex-col gap-1.5">
                                        <label class="text-sm font-medium" for="issueNotes">Notes</label>
                                        <input pInputText id="issueNotes" [ngModel]="issueNotes()" (ngModelChange)="issueNotes.set($event)" placeholder="Optional desk note" />
                                    </div>

                                    @if (selectedMemberSummary(); as summary) {
                                        <p-message severity="info" icon="pi pi-user" styleClass="w-full">{{ summary }}</p-message>
                                    }

                                    <div class="flex justify-end">
                                        <p-button label="Issue Book" icon="pi pi-send" [disabled]="!issueMemberId() || !issueCopyId()" (onClick)="issue()"></p-button>
                                    </div>
                                </div>
                            </p-card>

                            <p-card>
                                <ng-template pTemplate="header">
                                    <div class="px-4 pt-4">
                                        <h2 class="text-lg font-semibold">Borrowing Rules</h2>
                                        <p class="text-xs text-muted-color mt-0.5">Applied automatically when issuing</p>
                                    </div>
                                </ng-template>
                                <div class="flex flex-col gap-3">
                                    @for (policy of data.policies(); track policy.memberType) {
                                        <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                                            <div class="flex items-center justify-between">
                                                <span class="text-sm font-medium">{{ policy.memberType }}</span>
                                                <p-tag [value]="policy.borrowLimit + ' books'" severity="secondary"></p-tag>
                                            </div>
                                            <div class="text-xs text-muted-color mt-1">{{ policy.loanPeriodDays }} day loan · {{ policy.renewalLimit }} renewals · {{ policy.finePerDay }} fine/day</div>
                                        </div>
                                    }
                                    <a class="text-primary text-sm font-medium" routerLink="/librarian/policies">Configure borrowing rules</a>
                                </div>
                            </p-card>
                        </div>
                    </div>
                </p-tabpanel>

                <p-tabpanel value="history">
                    <div class="pt-4">
                        <p-card>
                            @if (returnedLoans().length === 0) {
                                <app-empty-state icon="pi pi-history" title="No returns yet" message="Returned loans will appear here." />
                            } @else {
                                <div class="overflow-x-auto">
                                    <p-table [value]="returnedLoans()" dataKey="id" [paginator]="true" [rows]="10" [tableStyle]="{ 'min-width': '58rem' }" styleClass="w-full">
                                        <ng-template pTemplate="header">
                                            <tr>
                                                <th>Book / Copy</th>
                                                <th>Member</th>
                                                <th>Issued</th>
                                                <th>Due</th>
                                                <th>Returned</th>
                                                <th>Status</th>
                                            </tr>
                                        </ng-template>
                                        <ng-template pTemplate="body" let-row>
                                            <tr>
                                                <td>
                                                    <div class="font-medium">{{ data.bookTitle(row.bookId) }}</div>
                                                    <div class="text-xs text-muted-color font-mono">{{ copyBarcode(row.copyId) }}</div>
                                                </td>
                                                <td class="text-sm">{{ data.memberName(row.memberId) }}</td>
                                                <td class="text-sm">{{ formatDate(row.issuedAt) }}</td>
                                                <td class="text-sm">{{ formatDate(row.dueAt) }}</td>
                                                <td class="text-sm">{{ row.returnedAt ? formatDate(row.returnedAt) : '—' }}</td>
                                                <td><p-tag [value]="row.status" [severity]="row.status === 'RETURNED' ? 'success' : 'danger'"></p-tag></td>
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
        <p-confirmDialog></p-confirmDialog>
    `
})
export class CirculationPage {
    readonly data = inject(LibraryDataService);
    private readonly confirm = inject(ConfirmationService);
    private readonly msg = inject(MessageService);

    readonly activeTab = signal<string | number | undefined>('active');
    readonly loanSearch = signal('');
    readonly branchFilter = signal<string | null>(null);
    readonly issueMemberId = signal<string | null>(null);
    readonly issueCopyId = signal<string | null>(null);
    readonly issueNotes = signal('');
    readonly scanValue = signal('');

    readonly branchFilterOptions = computed(() => [{ label: 'All Branches', value: null }, ...this.data.branches().map((branch) => ({ label: branch.name, value: branch.id }))]);

    readonly availableCopies = computed(() => this.data.bookCopies().filter((copy) => copy.status === 'AVAILABLE'));

    readonly copyOptions = computed(() =>
        this.availableCopies()
            .map((copy) => ({
                label: `${copy.barcode} — ${this.data.bookTitle(copy.bookId)} (${this.data.branchName(copy.branchId)})`,
                value: copy.id
            }))
            .sort((a, b) => a.label.localeCompare(b.label))
    );

    readonly memberOptions = computed(() =>
        this.data
            .members()
            .filter((member) => member.status === 'ACTIVE')
            .map((member) => ({
                label: `${member.firstName} ${member.lastName} — ${member.membershipNo} (${member.memberType})`,
                value: member.id
            }))
            .sort((a, b) => a.label.localeCompare(b.label))
    );

    readonly activeRows = computed(() => {
        const query = this.loanSearch().trim().toLowerCase();
        const branchId = this.branchFilter();
        return this.data
            .loans()
            .filter((loan) => !loan.returnedAt)
            .filter((loan) => {
                const matchesBranch = !branchId || loan.branchId === branchId;
                const haystack = `${this.data.bookTitle(loan.bookId)} ${this.data.memberName(loan.memberId)} ${this.copyBarcode(loan.copyId)}`.toLowerCase();
                return matchesBranch && (!query || haystack.includes(query));
            })
            .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
    });

    readonly returnedLoans = computed(() => this.data.loans().filter((loan) => loan.returnedAt).sort((a, b) => new Date(b.returnedAt ?? '').getTime() - new Date(a.returnedAt ?? '').getTime()));

    readonly returnedToday = computed(() => {
        const today = new Date().toDateString();
        return this.data.loans().filter((loan) => loan.returnedAt && new Date(loan.returnedAt).toDateString() === today).length;
    });

    readonly selectedMemberSummary = computed(() => {
        const id = this.issueMemberId();
        if (!id) return null;
        const member = this.data.members().find((item) => item.id === id);
        if (!member) return null;
        const loans = this.data.memberActiveLoans(id).length;
        const fines = this.data.memberUnpaidFines(id);
        return `${member.firstName} ${member.lastName} · ${loans} active loan(s) · ${fines.toLocaleString()} unpaid fine(s) · ${member.memberType}`;
    });

    findByBarcode(): void {
        const value = this.scanValue().trim().toUpperCase();
        if (!value) return;
        const copy = this.data.bookCopies().find((item) => item.barcode.toUpperCase() === value);
        if (!copy) {
            this.msg.add({ severity: 'warn', summary: 'Not found', detail: 'No copy matches that barcode.' });
            return;
        }
        if (copy.status !== 'AVAILABLE') {
            this.msg.add({ severity: 'warn', summary: 'Not available', detail: `${copy.barcode} is currently ${copy.status.toLowerCase()}.` });
            return;
        }
        this.issueCopyId.set(copy.id);
        this.msg.add({ severity: 'success', summary: 'Copy found', detail: `${this.data.bookTitle(copy.bookId)} is ready to issue.` });
    }

    issue(): void {
        const memberId = this.issueMemberId();
        const copyId = this.issueCopyId();
        if (!memberId || !copyId) return;
        try {
            const loan = this.data.issueLoan(copyId, memberId, this.issueNotes());
            this.msg.add({ severity: 'success', summary: 'Book issued', detail: `Due ${this.formatDate(loan.dueAt)}.` });
            this.issueMemberId.set(null);
            this.issueCopyId.set(null);
            this.issueNotes.set('');
            this.scanValue.set('');
            this.activeTab.set('active');
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Issue failed', detail: this.errorText(error) });
        }
    }

    returnLoan(loan: Loan): void {
        try {
            const fine = this.data.returnLoan(loan.id);
            this.msg.add({
                severity: 'success',
                summary: 'Book returned',
                detail: fine ? `Returned with a ${fine.amount} overdue fine.` : 'Returned without an overdue fine.'
            });
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Return failed', detail: this.errorText(error) });
        }
    }

    renewLoan(loan: Loan): void {
        try {
            this.data.renewLoan(loan.id);
            this.msg.add({ severity: 'success', summary: 'Loan renewed', detail: 'The due date has been extended.' });
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Renewal failed', detail: this.errorText(error) });
        }
    }

    markLost(loan: Loan): void {
        this.confirm.confirm({
            message: `Mark "${this.data.bookTitle(loan.bookId)}" as lost? A lost-book charge will be issued to the member.`,
            header: 'Mark Book Lost',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Mark Lost',
            rejectLabel: 'Cancel',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                try {
                    this.data.markLoanLost(loan.id);
                    this.msg.add({ severity: 'success', summary: 'Marked lost', detail: 'The copy is now marked lost and a fine was issued.' });
                } catch (error) {
                    this.msg.add({ severity: 'error', summary: 'Update failed', detail: this.errorText(error) });
                }
            }
        });
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

    formatDate(value: string): string {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '—';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    private errorText(error: unknown): string {
        return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
    }
}
