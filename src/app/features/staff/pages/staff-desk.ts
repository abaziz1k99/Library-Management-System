import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { EmptyState } from '@/app/shared/components/empty-state';
import { PageHeader } from '@/app/shared/components/page-header';
import { LibraryDataService } from '@/app/core/services/library-data.service';
import type { BookCopy, FineRecord, LibraryMember, Loan } from '@/app/core/models/library.models';

type Eligibility = ReturnType<LibraryDataService['verifyEligibility']>;

@Component({
    selector: 'app-staff-desk',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, ButtonModule, CardModule, InputTextModule, MessageModule, TableModule, TabsModule, TagModule, ToastModule, TooltipModule, EmptyState, PageHeader],
    providers: [MessageService],
    template: `
        <app-page-header [title]="'Circulation Desk — ' + branchName()" subtitle="Scan member IDs and book codes to issue, return, renew and hand over reservations">
            <p-button label="Member Verification" icon="pi pi-id-card" severity="secondary" [outlined]="true" routerLink="/staff/members"></p-button>
        </app-page-header>

        <p-tabs [value]="activeTab()" (valueChange)="activeTab.set($event)">
            <p-tablist>
                <p-tab value="issue"><i class="pi pi-send mr-2"></i>Issue Book</p-tab>
                <p-tab value="return"><i class="pi pi-replay mr-2"></i>Return Book</p-tab>
                <p-tab value="pickups"><i class="pi pi-bookmark mr-2"></i>Pickups ({{ readyPickups().length }})</p-tab>
                <p-tab value="renewals"><i class="pi pi-refresh mr-2"></i>Renewals ({{ pendingRenewals().length }})</p-tab>
            </p-tablist>
            <p-tabpanels>
                <p-tabpanel value="issue">
                    <div class="pt-4 grid gap-4 xl:grid-cols-2">
                        <p-card>
                            <ng-template pTemplate="header">
                                <div class="px-4 pt-4">
                                    <h2 class="text-lg font-semibold">Scan &amp; Verify</h2>
                                    <p class="text-xs text-muted-color mt-0.5">Scan the member card first, then the book copy.</p>
                                </div>
                            </ng-template>
                            <div class="flex flex-col gap-4">
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm font-medium">Member ID / Membership No.</label>
                                    <div class="flex gap-2">
                                        <input pInputText class="flex-1" placeholder="e.g. PUL-STU-2024-001" [ngModel]="memberScan()" (ngModelChange)="memberScan.set($event)" (keydown.enter)="scanMember()" />
                                        <p-button label="Verify" icon="pi pi-search" severity="secondary" [outlined]="true" (onClick)="scanMember()"></p-button>
                                    </div>
                                </div>

                                @if (eligibility(); as info) {
                                    <div class="rounded-lg border p-3" [ngClass]="info.eligible ? 'border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950' : 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950'">
                                        <div class="flex items-center justify-between gap-2">
                                            <div>
                                                <div class="text-sm font-semibold">{{ info.member.firstName }} {{ info.member.lastName }}</div>
                                                <div class="text-xs text-muted-color">{{ info.member.membershipNo }} · {{ info.member.memberType }}</div>
                                            </div>
                                            <p-tag [value]="info.eligible ? 'Eligible' : 'Not eligible'" [severity]="info.eligible ? 'success' : 'danger'"></p-tag>
                                        </div>
                                        <div class="grid grid-cols-3 gap-2 mt-3 text-xs">
                                            <div>
                                                <div class="text-muted-color">Active loans</div>
                                                <div class="font-medium">{{ info.activeLoans }} / {{ info.borrowLimit }}</div>
                                            </div>
                                            <div>
                                                <div class="text-muted-color">Overdue</div>
                                                <div class="font-medium">{{ info.overdueLoans }}</div>
                                            </div>
                                            <div>
                                                <div class="text-muted-color">Unpaid fines</div>
                                                <div class="font-medium">{{ formatCurrency(info.unpaidFines) }}</div>
                                            </div>
                                        </div>
                                        @if (info.reasons.length > 0) {
                                            <div class="mt-2 text-xs text-red-600 dark:text-red-300">
                                                @for (reason of info.reasons; track reason) {
                                                    <div class="flex items-start gap-1"><i class="pi pi-exclamation-circle text-[10px] mt-0.5"></i><span>{{ reason }}</span></div>
                                                }
                                            </div>
                                        }
                                    </div>
                                }

                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm font-medium">Book barcode</label>
                                    <div class="flex gap-2">
                                        <input pInputText class="flex-1" placeholder="e.g. PUL-ALG-0001" [ngModel]="copyScan()" (ngModelChange)="copyScan.set($event)" (keydown.enter)="scanCopy()" />
                                        <p-button label="Find" icon="pi pi-search" severity="secondary" [outlined]="true" (onClick)="scanCopy()"></p-button>
                                    </div>
                                </div>

                                @if (selectedCopy(); as copy) {
                                    <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                                        <div class="flex items-center justify-between gap-2">
                                            <div class="text-sm font-semibold">{{ data.bookTitle(copy.bookId) }}</div>
                                            <p-tag [value]="copy.status" [severity]="copy.status === 'AVAILABLE' ? 'success' : 'warn'"></p-tag>
                                        </div>
                                        <div class="text-xs text-muted-color mt-1 font-mono">{{ copy.barcode }}</div>
                                        <div class="text-xs text-muted-color mt-0.5">{{ data.branchName(copy.branchId) }} · Shelf {{ copy.shelfLocation }}</div>
                                    </div>
                                }

                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm font-medium">Desk note</label>
                                    <input pInputText [ngModel]="issueNotes()" (ngModelChange)="issueNotes.set($event)" placeholder="Optional" />
                                </div>

                                <p-button label="Issue Book" icon="pi pi-send" [disabled]="!issueReady()" (onClick)="issueBook()"></p-button>
                            </div>
                        </p-card>

                        <p-card>
                            <ng-template pTemplate="header">
                                <div class="px-4 pt-4">
                                    <h2 class="text-lg font-semibold">Confirmation</h2>
                                    <p class="text-xs text-muted-color mt-0.5">Digital borrowing receipt</p>
                                </div>
                            </ng-template>
                            @if (issueConfirmation(); as loan) {
                                <div class="flex flex-col gap-3">
                                    <p-message severity="success" icon="pi pi-check-circle" styleClass="w-full">Book issued successfully.</p-message>
                                    <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3 text-sm flex flex-col gap-2">
                                        <div class="flex justify-between"><span class="text-muted-color">Book</span><span class="font-medium text-right">{{ data.bookTitle(loan.bookId) }}</span></div>
                                        <div class="flex justify-between"><span class="text-muted-color">Copy</span><span class="font-mono">{{ copyBarcode(loan.copyId) }}</span></div>
                                        <div class="flex justify-between"><span class="text-muted-color">Member</span><span class="font-medium">{{ data.memberName(loan.memberId) }}</span></div>
                                        <div class="flex justify-between"><span class="text-muted-color">Issued</span><span>{{ formatDate(loan.issuedAt) }}</span></div>
                                        <div class="flex justify-between"><span class="text-muted-color">Due</span><span class="font-medium">{{ formatDate(loan.dueAt) }}</span></div>
                                    </div>
                                    <p-button label="Send Borrowing Confirmation" icon="pi pi-envelope" severity="secondary" [outlined]="true" (onClick)="sendIssueConfirmation(loan)"></p-button>
                                    <p-button label="New Issue" icon="pi pi-plus" [text]="true" (onClick)="resetIssue()"></p-button>
                                </div>
                            } @else {
                                <app-empty-state icon="pi pi-receipt" title="No receipt yet" message="Issue a book to generate a digital borrowing receipt." />
                            }
                        </p-card>
                    </div>
                </p-tabpanel>

                <p-tabpanel value="return">
                    <div class="pt-4 grid gap-4 xl:grid-cols-2">
                        <p-card>
                            <ng-template pTemplate="header">
                                <div class="px-4 pt-4">
                                    <h2 class="text-lg font-semibold">Return a Book</h2>
                                    <p class="text-xs text-muted-color mt-0.5">Scan the copy barcode to find the active loan.</p>
                                </div>
                            </ng-template>
                            <div class="flex flex-col gap-4">
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm font-medium">Book barcode</label>
                                    <div class="flex gap-2">
                                        <input pInputText class="flex-1" placeholder="e.g. PUL-ALG-0002" [ngModel]="returnScan()" (ngModelChange)="returnScan.set($event)" (keydown.enter)="findReturn()" />
                                        <p-button label="Find Loan" icon="pi pi-search" severity="secondary" [outlined]="true" (onClick)="findReturn()"></p-button>
                                    </div>
                                </div>

                                @if (returnLoan(); as loan) {
                                    <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3 text-sm flex flex-col gap-2">
                                        <div class="flex justify-between"><span class="text-muted-color">Book</span><span class="font-medium text-right">{{ data.bookTitle(loan.bookId) }}</span></div>
                                        <div class="flex justify-between"><span class="text-muted-color">Member</span><span>{{ data.memberName(loan.memberId) }}</span></div>
                                        <div class="flex justify-between"><span class="text-muted-color">Issued</span><span>{{ formatDate(loan.issuedAt) }}</span></div>
                                        <div class="flex justify-between"><span class="text-muted-color">Due</span><span>{{ formatDate(loan.dueAt) }}</span></div>
                                        @if (isOverdue(loan)) {
                                            <div class="text-xs text-red-500">{{ overdueDays(loan) }} day(s) overdue — a fine will be calculated.</div>
                                        }
                                    </div>
                                    <p-button label="Record Return" icon="pi pi-replay" severity="success" (onClick)="returnBook()"></p-button>
                                } @else if (returnScanResult()) {
                                    <p-message [severity]="returnScanResult()?.ok ? 'info' : 'warn'" [text]="returnScanResult()?.message ?? ''" styleClass="w-full"></p-message>
                                }
                            </div>
                        </p-card>

                        <p-card>
                            <ng-template pTemplate="header">
                                <div class="px-4 pt-4">
                                    <h2 class="text-lg font-semibold">Return Receipt</h2>
                                    <p class="text-xs text-muted-color mt-0.5">Fine calculation and confirmation</p>
                                </div>
                            </ng-template>
                            @if (returnConfirmation(); as result) {
                                <div class="flex flex-col gap-3">
                                    <p-message severity="success" icon="pi pi-check-circle" styleClass="w-full">Book returned successfully.</p-message>
                                    <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3 text-sm flex flex-col gap-2">
                                        <div class="flex justify-between"><span class="text-muted-color">Book</span><span class="font-medium text-right">{{ data.bookTitle(result.loan.bookId) }}</span></div>
                                        <div class="flex justify-between"><span class="text-muted-color">Member</span><span class="font-medium">{{ data.memberName(result.loan.memberId) }}</span></div>
                                        <div class="flex justify-between"><span class="text-muted-color">Returned</span><span>{{ result.loan.returnedAt ? formatDate(result.loan.returnedAt) : '—' }}</span></div>
                                        <div class="flex justify-between">
                                            <span class="text-muted-color">Overdue fine</span>
                                            <span class="font-medium" [ngClass]="result.fine ? 'text-red-500' : ''">{{ result.fine ? formatCurrency(result.fine.amount) : 'None' }}</span>
                                        </div>
                                    </div>
                                    <p-button label="Send Return Confirmation" icon="pi pi-envelope" severity="secondary" [outlined]="true" (onClick)="sendReturnConfirmation(result.loan)"></p-button>
                                    <p-button label="New Return" icon="pi pi-plus" [text]="true" (onClick)="resetReturn()"></p-button>
                                </div>
                            } @else {
                                <app-empty-state icon="pi pi-receipt" title="No receipt yet" message="Return a book to generate the return receipt." />
                            }
                        </p-card>
                    </div>
                </p-tabpanel>

                <p-tabpanel value="pickups">
                    <div class="pt-4">
                        <p-card>
                            @if (readyPickups().length === 0) {
                                <app-empty-state icon="pi pi-bookmark" title="No ready pickups" message="Reservations marked ready at your branch will appear here." />
                            } @else {
                                <div class="overflow-x-auto">
                                    <p-table [value]="readyPickups()" dataKey="id" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '52rem' }">
                                        <ng-template pTemplate="header">
                                            <tr>
                                                <th>Book</th>
                                                <th>Member</th>
                                                <th>Hold Expires</th>
                                                <th>Status</th>
                                                <th style="width: 12rem">Action</th>
                                            </tr>
                                        </ng-template>
                                        <ng-template pTemplate="body" let-row>
                                            <tr>
                                                <td class="font-medium">{{ data.bookTitle(row.bookId) }}</td>
                                                <td class="text-sm">{{ data.memberName(row.memberId) }}</td>
                                                <td class="text-sm">{{ row.expiresAt ? formatDate(row.expiresAt) : '—' }}</td>
                                                <td><p-tag value="Ready" severity="success"></p-tag></td>
                                                <td>
                                                    <div class="flex items-center gap-1">
                                                        <p-button label="Issue to Member" size="small" (onClick)="issuePickup(row.id)"></p-button>
                                                        <p-button icon="pi pi-times" [rounded]="true" [text]="true" severity="danger" pTooltip="Cancel hold" tooltipPosition="top" (onClick)="cancelPickup(row.id)"></p-button>
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

                <p-tabpanel value="renewals">
                    <div class="pt-4">
                        <p-card>
                            @if (renewalRows().length === 0) {
                                <app-empty-state icon="pi pi-refresh" title="No renewal requests" message="Renewal requests for your branch will appear here." />
                            } @else {
                                <div class="overflow-x-auto">
                                    <p-table [value]="renewalRows()" dataKey="id" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '56rem' }">
                                        <ng-template pTemplate="header">
                                            <tr>
                                                <th>Book</th>
                                                <th>Member</th>
                                                <th>Current Due</th>
                                                <th>Requested</th>
                                                <th>Status</th>
                                                <th style="width: 10rem">Action</th>
                                            </tr>
                                        </ng-template>
                                        <ng-template pTemplate="body" let-row>
                                            <tr>
                                                <td class="font-medium">{{ data.bookTitle(loanBookId(row.loanId)) }}</td>
                                                <td class="text-sm">{{ data.memberName(row.memberId) }}</td>
                                                <td class="text-sm">{{ loanDue(row.loanId) }}</td>
                                                <td class="text-sm">{{ formatDate(row.requestedAt) }}</td>
                                                <td><p-tag [value]="row.status" [severity]="row.status === 'PENDING' ? 'warn' : row.status === 'APPROVED' ? 'success' : 'danger'"></p-tag></td>
                                                <td>
                                                    @if (row.status === 'PENDING') {
                                                        <p-button label="Approve & Process" size="small" severity="success" [outlined]="true" (onClick)="processRenewal(row.id)"></p-button>
                                                    } @else {
                                                        <span class="text-xs text-muted-color">Processed</span>
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
export class StaffDesk {
    readonly data = inject(LibraryDataService);
    private readonly msg = inject(MessageService);

    readonly branchId = this.data.assignedBranchId();
    readonly branchName = computed(() => this.data.branches().find((branch) => branch.id === this.branchId)?.name ?? 'All branches');

    readonly activeTab = signal<string | number | undefined>('issue');

    readonly memberScan = signal('');
    readonly copyScan = signal('');
    readonly issueNotes = signal('');
    readonly selectedCopy = signal<BookCopy | null>(null);
    readonly eligibility = signal<Eligibility | null>(null);
    readonly issueConfirmation = signal<Loan | null>(null);

    readonly returnScan = signal('');
    readonly returnLoan = signal<Loan | null>(null);
    readonly returnScanResult = signal<{ ok: boolean; message: string } | null>(null);
    readonly returnConfirmation = signal<{ loan: Loan; fine: FineRecord | null } | null>(null);

    readonly readyPickups = computed(() =>
        this.data.reservations().filter((reservation) => reservation.status === 'READY' && (!this.branchId || reservation.branchId === this.branchId))
    );

    readonly renewalRows = computed(() =>
        this.data
            .renewalRequests()
            .filter((request) => {
                if (request.status === 'REJECTED') return false;
                const loan = this.data.loans().find((item) => item.id === request.loanId);
                return !!loan && (!this.branchId || loan.branchId === this.branchId);
            })
            .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())
    );

    readonly pendingRenewals = computed(() => this.renewalRows().filter((request) => request.status === 'PENDING'));

    readonly issueReady = computed(() => !!this.eligibility()?.eligible && !!this.selectedCopy() && this.selectedCopy()?.status === 'AVAILABLE');

    scanMember(): void {
        const member = this.data.memberByMembershipNo(this.memberScan());
        if (!member) {
            this.eligibility.set(null);
            this.msg.add({ severity: 'warn', summary: 'Member not found', detail: 'No membership matches that ID.' });
            return;
        }
        if (this.branchId && member.branchId !== this.branchId) {
            this.msg.add({ severity: 'warn', summary: 'Wrong branch', detail: `${member.firstName} belongs to ${this.data.branchName(member.branchId)}.` });
        }
        try {
            this.eligibility.set(this.data.verifyEligibility(member.id));
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Verification failed', detail: this.errorText(error) });
        }
    }

    scanCopy(): void {
        const copy = this.data.copyByBarcode(this.copyScan());
        if (!copy) {
            this.selectedCopy.set(null);
            this.msg.add({ severity: 'warn', summary: 'Copy not found', detail: 'No copy matches that barcode.' });
            return;
        }
        if (this.branchId && copy.branchId !== this.branchId) {
            this.selectedCopy.set(null);
            this.msg.add({ severity: 'warn', summary: 'Wrong branch', detail: `This copy belongs to ${this.data.branchName(copy.branchId)}.` });
            return;
        }
        if (copy.status !== 'AVAILABLE') {
            this.selectedCopy.set(null);
            this.msg.add({ severity: 'warn', summary: 'Not available', detail: `${copy.barcode} is ${copy.status.toLowerCase()}.` });
            return;
        }
        this.selectedCopy.set(copy);
    }

    issueBook(): void {
        const info = this.eligibility();
        const copy = this.selectedCopy();
        if (!info || !copy) return;
        try {
            const loan = this.data.issueLoan(copy.id, info.member.id, this.issueNotes());
            this.issueConfirmation.set(loan);
            this.msg.add({ severity: 'success', summary: 'Book issued', detail: `Due ${this.formatDate(loan.dueAt)}.` });
            this.eligibility.set(null);
            this.selectedCopy.set(null);
            this.memberScan.set('');
            this.copyScan.set('');
            this.issueNotes.set('');
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Issue failed', detail: this.errorText(error) });
        }
    }

    resetIssue(): void {
        this.issueConfirmation.set(null);
    }

    sendIssueConfirmation(loan: Loan): void {
        try {
            this.msg.add({ severity: 'success', summary: 'Confirmation sent', detail: this.data.sendConfirmation(loan.id, 'ISSUE') });
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Send failed', detail: this.errorText(error) });
        }
    }

    findReturn(): void {
        this.returnScanResult.set(null);
        this.returnLoan.set(null);
        const copy = this.data.copyByBarcode(this.returnScan());
        if (!copy) {
            this.returnScanResult.set({ ok: false, message: 'No copy matches that barcode.' });
            return;
        }
        const loan = this.data.activeLoanForCopy(copy.id);
        if (!loan) {
            this.returnScanResult.set({ ok: false, message: `Copy ${copy.barcode} has no active loan.` });
            return;
        }
        this.returnLoan.set(loan);
    }

    returnBook(): void {
        const loan = this.returnLoan();
        if (!loan) return;
        try {
            const fine = this.data.returnLoan(loan.id);
            const updated = this.data.loans().find((item) => item.id === loan.id) ?? loan;
            this.returnConfirmation.set({ loan: updated, fine });
            this.msg.add({ severity: 'success', summary: 'Book returned', detail: fine ? `Overdue fine ${this.formatCurrency(fine.amount)}.` : 'No overdue fine.' });
            this.returnLoan.set(null);
            this.returnScan.set('');
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Return failed', detail: this.errorText(error) });
        }
    }

    resetReturn(): void {
        this.returnConfirmation.set(null);
        this.returnScanResult.set(null);
    }

    sendReturnConfirmation(loan: Loan): void {
        try {
            this.msg.add({ severity: 'success', summary: 'Confirmation sent', detail: this.data.sendConfirmation(loan.id, 'RETURN') });
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Send failed', detail: this.errorText(error) });
        }
    }

    issuePickup(id: string): void {
        try {
            const loan = this.data.issueReservationPickup(id);
            this.msg.add({ severity: 'success', summary: 'Reservation issued', detail: `Due ${this.formatDate(loan.dueAt)}.` });
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Pickup failed', detail: this.errorText(error) });
        }
    }

    cancelPickup(id: string): void {
        try {
            this.data.cancelReservation(id);
            this.msg.add({ severity: 'success', summary: 'Hold cancelled', detail: 'The reservation was cancelled.' });
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Cancel failed', detail: this.errorText(error) });
        }
    }

    processRenewal(id: string): void {
        try {
            this.data.approveRenewalRequest(id);
            this.msg.add({ severity: 'success', summary: 'Renewal processed', detail: 'The loan due date was extended.' });
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Renewal failed', detail: this.errorText(error) });
        }
    }

    loanBookId(loanId: string): string {
        return this.data.loans().find((loan) => loan.id === loanId)?.bookId ?? '';
    }

    loanDue(loanId: string): string {
        const loan = this.data.loans().find((item) => item.id === loanId);
        return loan ? this.formatDate(loan.dueAt) : '—';
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

    formatCurrency(value: number): string {
        const currency = this.data.settings().currency;
        try {
            return new Intl.NumberFormat('en-BD', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
        } catch {
            return `${currency} ${value.toLocaleString('en-US')}`;
        }
    }

    private errorText(error: unknown): string {
        return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
    }
}
