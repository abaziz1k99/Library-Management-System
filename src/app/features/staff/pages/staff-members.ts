import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { EmptyState } from '@/app/shared/components/empty-state';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatCard } from '@/app/shared/components/stat-card';
import { StatusTag } from '@/app/shared/components/status-tag';
import { LibraryDataService } from '@/app/core/services/library-data.service';
import type { LibraryMember, MemberStatus, MemberType } from '@/app/core/models/library.models';

@Component({
    selector: 'app-staff-members',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, ButtonModule, CardModule, DialogModule, InputTextModule, MessageModule, SelectModule, TableModule, TagModule, EmptyState, PageHeader, StatCard, StatusTag],
    template: `
        <app-page-header [title]="'Member Verification — ' + branchName()" subtitle="Verify memberships, check borrowing eligibility and assist with account inquiries">
            <p-button label="Circulation Desk" icon="pi pi-send" severity="secondary" [outlined]="true" routerLink="/staff/desk"></p-button>
        </app-page-header>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
            <app-stat-card label="Members" [value]="branchMembers().length" context="at this branch" icon="pi pi-users"></app-stat-card>
            <app-stat-card label="Active" [value]="activeCount()" context="eligible to borrow" icon="pi pi-check-circle" iconBg="green"></app-stat-card>
            <app-stat-card label="Suspended / Expired" [value]="blockedCount()" context="borrowing blocked" icon="pi pi-ban" iconBg="red"></app-stat-card>
            <app-stat-card label="With Unpaid Fines" [value]="withFinesCount()" context="outstanding balances" icon="pi pi-wallet" iconBg="orange"></app-stat-card>
        </div>

        <p-card>
            <div class="grid gap-3 lg:grid-cols-4 mb-4">
                <span class="relative block lg:col-span-2">
                    <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-color"></i>
                    <input pInputText type="text" placeholder="Search name, membership no., email or phone" class="w-full pl-10" [ngModel]="search()" (ngModelChange)="search.set($event)" />
                </span>
                <p-select [ngModel]="typeFilter()" (ngModelChange)="typeFilter.set($event)" [options]="typeFilterOptions" optionLabel="label" optionValue="value" placeholder="Member type" [showClear]="true" appendTo="body" styleClass="w-full"></p-select>
                <p-select [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)" [options]="statusFilterOptions" optionLabel="label" optionValue="value" placeholder="Status" [showClear]="true" appendTo="body" styleClass="w-full"></p-select>
            </div>

            @if (filteredMembers().length === 0) {
                <app-empty-state icon="pi pi-users" title="No members found" message="No memberships match the current search." actionLabel="Clear filters" (action)="clearFilters()"></app-empty-state>
            } @else {
                <div class="overflow-x-auto">
                    <p-table [value]="filteredMembers()" dataKey="id" [paginator]="true" [rows]="10" [tableStyle]="{ 'min-width': '68rem' }" styleClass="w-full">
                        <ng-template pTemplate="header">
                            <tr>
                                <th>Member</th>
                                <th>Membership No.</th>
                                <th>Type</th>
                                <th>Contact</th>
                                <th>Status</th>
                                <th class="text-right">Active Loans</th>
                                <th class="text-right">Unpaid Fines</th>
                                <th style="width: 7rem">Action</th>
                            </tr>
                        </ng-template>
                        <ng-template pTemplate="body" let-member>
                            <tr>
                                <td>
                                    <div class="font-medium">{{ member.firstName }} {{ member.lastName }}</div>
                                    <div class="text-xs text-muted-color">{{ member.department || '—' }}</div>
                                </td>
                                <td class="font-mono text-xs">{{ member.membershipNo }}</td>
                                <td><p-tag [value]="typeLabel(member.memberType)" severity="secondary"></p-tag></td>
                                <td class="text-sm">
                                    <div>{{ member.phone || '—' }}</div>
                                    <div class="text-xs text-muted-color">{{ member.email }}</div>
                                </td>
                                <td><app-status-tag [status]="member.status"></app-status-tag></td>
                                <td class="text-right text-sm">{{ memberActiveLoans(member.id) }}</td>
                                <td class="text-right text-sm">{{ formatCurrency(memberUnpaid(member.id)) }}</td>
                                <td><p-button label="Verify" size="small" [outlined]="true" (onClick)="openDetails(member)"></p-button></td>
                            </tr>
                        </ng-template>
                    </p-table>
                </div>
            }
        </p-card>

        <p-dialog [header]="dialogTitle()" [visible]="detailsVisible()" (visibleChange)="detailsVisible.set($event)" [modal]="true" [dismissableMask]="true" [style]="{ width: '760px', 'max-width': '96vw' }">
            @if (selectedMember(); as member) {
                <div class="flex flex-col gap-4">
                    <div class="flex items-start justify-between gap-3">
                        <div>
                            <div class="text-lg font-semibold">{{ member.firstName }} {{ member.lastName }}</div>
                            <div class="text-sm text-muted-color">{{ member.membershipNo }} · {{ typeLabel(member.memberType) }}</div>
                            <div class="text-xs text-muted-color mt-0.5">{{ member.email }} · {{ member.phone || 'No phone' }}</div>
                        </div>
                        <app-status-tag [status]="member.status"></app-status-tag>
                    </div>

                    @if (eligibility(); as info) {
                        <div class="rounded-lg border p-3" [ngClass]="info.eligible ? 'border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950' : 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950'">
                            <div class="flex items-center justify-between gap-2">
                                <div class="text-sm font-semibold">Borrowing eligibility</div>
                                <p-tag [value]="info.eligible ? 'Eligible' : 'Not eligible'" [severity]="info.eligible ? 'success' : 'danger'"></p-tag>
                            </div>
                            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs">
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
                                <div>
                                    <div class="text-muted-color">Expires</div>
                                    <div class="font-medium">{{ formatDate(member.expiresAt) }}</div>
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

                    <div>
                        <h3 class="text-sm font-semibold mb-2">Active loans</h3>
                        @if (activeLoans().length === 0) {
                            <p class="text-sm text-muted-color py-2">No active loans.</p>
                        } @else {
                            <div class="overflow-x-auto">
                                <p-table [value]="activeLoans()" dataKey="id" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '30rem' }">
                                    <ng-template pTemplate="header">
                                        <tr><th>Book</th><th>Due</th><th>Status</th></tr>
                                    </ng-template>
                                    <ng-template pTemplate="body" let-loan>
                                        <tr>
                                            <td class="text-sm">{{ data.bookTitle(loan.bookId) }}</td>
                                            <td class="text-sm">{{ formatDate(loan.dueAt) }}</td>
                                            <td><p-tag [value]="isOverdue(loan) ? 'Overdue' : 'Active'" [severity]="isOverdue(loan) ? 'danger' : 'success'"></p-tag></td>
                                        </tr>
                                    </ng-template>
                                </p-table>
                            </div>
                        }
                    </div>

                    <div>
                        <h3 class="text-sm font-semibold mb-2">Fine history</h3>
                        @if (memberFines().length === 0) {
                            <p class="text-sm text-muted-color py-2">No fines on record.</p>
                        } @else {
                            <div class="overflow-x-auto">
                                <p-table [value]="memberFines()" dataKey="id" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '30rem' }">
                                    <ng-template pTemplate="header">
                                        <tr><th>Reason</th><th class="text-right">Amount</th><th>Status</th></tr>
                                    </ng-template>
                                    <ng-template pTemplate="body" let-fine>
                                        <tr>
                                            <td class="text-sm">{{ fine.reason }}</td>
                                            <td class="text-right text-sm">{{ formatCurrency(fine.amount) }}</td>
                                            <td><p-tag [value]="fine.status" [severity]="fine.status === 'UNPAID' ? 'danger' : fine.status === 'PAID' ? 'success' : 'info'"></p-tag></td>
                                        </tr>
                                    </ng-template>
                                </p-table>
                            </div>
                        }
                    </div>

                    <div class="flex justify-end gap-2">
                        <p-button label="Close" severity="secondary" [text]="true" (onClick)="detailsVisible.set(false)"></p-button>
                        <p-button label="Go to Circulation Desk" icon="pi pi-send" routerLink="/staff/desk"></p-button>
                    </div>
                </div>
            }
        </p-dialog>
    `
})
export class StaffMembers {
    readonly data = inject(LibraryDataService);

    readonly branchId = this.data.assignedBranchId();
    readonly branchName = computed(() => this.data.branches().find((branch) => branch.id === this.branchId)?.name ?? 'All branches');

    readonly search = signal('');
    readonly typeFilter = signal<MemberType | null>(null);
    readonly statusFilter = signal<MemberStatus | null>(null);

    readonly detailsVisible = signal(false);
    readonly selectedMember = signal<LibraryMember | null>(null);
    readonly dialogTitle = computed(() => {
        const member = this.selectedMember();
        return member ? `${member.firstName} ${member.lastName}` : 'Member Verification';
    });

    readonly typeFilterOptions = [
        { label: 'All Types', value: null },
        { label: 'Student', value: 'STUDENT' },
        { label: 'Teacher / Faculty', value: 'TEACHER' },
        { label: 'Staff', value: 'STAFF' }
    ];

    readonly statusFilterOptions = [
        { label: 'All Statuses', value: null },
        { label: 'Active', value: 'ACTIVE' },
        { label: 'Inactive', value: 'INACTIVE' },
        { label: 'Suspended', value: 'SUSPENDED' },
        { label: 'Expired', value: 'EXPIRED' },
        { label: 'Pending', value: 'PENDING' }
    ];

    readonly branchMembers = computed(() => this.data.members().filter((member) => !this.branchId || member.branchId === this.branchId));
    readonly activeCount = computed(() => this.branchMembers().filter((member) => member.status === 'ACTIVE').length);
    readonly blockedCount = computed(() => this.branchMembers().filter((member) => member.status === 'SUSPENDED' || member.status === 'EXPIRED').length);
    readonly withFinesCount = computed(() => this.branchMembers().filter((member) => this.memberUnpaid(member.id) > 0).length);

    readonly filteredMembers = computed(() => {
        const query = this.search().trim().toLowerCase();
        const type = this.typeFilter();
        const status = this.statusFilter();
        return this.branchMembers()
            .filter((member) => {
                const matchesType = !type || member.memberType === type;
                const matchesStatus = !status || member.status === status;
                const haystack = `${member.firstName} ${member.lastName} ${member.membershipNo} ${member.email} ${member.phone}`.toLowerCase();
                return matchesType && matchesStatus && (!query || haystack.includes(query));
            })
            .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
    });

    readonly eligibility = computed(() => {
        const member = this.selectedMember();
        if (!member) return null;
        try {
            return this.data.verifyEligibility(member.id);
        } catch {
            return null;
        }
    });

    readonly activeLoans = computed(() => {
        const member = this.selectedMember();
        return member ? this.data.memberActiveLoans(member.id).sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()) : [];
    });

    readonly memberFines = computed(() => {
        const member = this.selectedMember();
        return member ? this.data.fines().filter((fine) => fine.memberId === member.id).sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()) : [];
    });

    memberActiveLoans(memberId: string): number {
        return this.data.memberActiveLoans(memberId).length;
    }

    memberUnpaid(memberId: string): number {
        return this.data.memberUnpaidFines(memberId);
    }

    clearFilters(): void {
        this.search.set('');
        this.typeFilter.set(null);
        this.statusFilter.set(null);
    }

    openDetails(member: LibraryMember): void {
        this.selectedMember.set(member);
        this.detailsVisible.set(true);
    }

    typeLabel(type: MemberType): string {
        return type === 'STUDENT' ? 'Student' : type === 'TEACHER' ? 'Teacher' : 'Staff';
    }

    isOverdue(loan: { dueAt: string; returnedAt: string | null }): boolean {
        return !loan.returnedAt && new Date(loan.dueAt).getTime() < Date.now();
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
