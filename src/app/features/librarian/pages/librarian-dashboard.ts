import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ChartCard } from '@/app/shared/components/chart-card';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatCard } from '@/app/shared/components/stat-card';
import { LibraryDataService } from '@/app/core/services/library-data.service';
import type { ChartData, ChartOptions } from 'chart.js';
import type { Loan } from '@/app/core/models/library.models';

@Component({
    selector: 'app-librarian-dashboard',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, ButtonModule, CardModule, SelectModule, TableModule, TagModule, ChartCard, PageHeader, StatCard],
    template: `
        <app-page-header title="Library Operations Dashboard" subtitle="Book availability, circulation, overdue loans and member activity">
            <p-select [ngModel]="branchFilter()" (ngModelChange)="branchFilter.set($event)" [options]="branchOptions()" optionLabel="label" optionValue="value" placeholder="All branches" [showClear]="true" appendTo="body" styleClass="w-64"></p-select>
            <p-button label="Circulation Desk" icon="pi pi-send" routerLink="/librarian/circulation"></p-button>
        </app-page-header>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 auto-rows-fr">
            <app-stat-card label="Catalog Titles" [value]="bookCount()" context="active records" icon="pi pi-book"></app-stat-card>
            <app-stat-card label="Physical Copies" [value]="copyCount()" [context]="availableCount() + ' available now'" icon="pi pi-box" iconBg="primary"></app-stat-card>
            <app-stat-card label="On Loan" [value]="onLoanCount()" context="issued copies" icon="pi pi-send" iconBg="green"></app-stat-card>
            <app-stat-card label="Overdue" [value]="overdueCount()" context="past due date" icon="pi pi-exclamation-triangle" iconBg="orange"></app-stat-card>
            <app-stat-card label="Members" [value]="memberCount()" [context]="activeMemberCount() + ' active memberships'" icon="pi pi-users" iconBg="green"></app-stat-card>
            <app-stat-card label="Pending Approvals" [value]="approvalCount()" context="borrow, reservation, renewal" icon="pi pi-inbox" iconBg="orange"></app-stat-card>
            <app-stat-card label="Unpaid Fines" [value]="formatCurrency(unpaidFineTotal())" context="outstanding balances" icon="pi pi-wallet" iconBg="red"></app-stat-card>
            <app-stat-card label="Lost / Damaged" [value]="issueCount()" context="inventory exceptions" icon="pi pi-exclamation-circle" iconBg="red"></app-stat-card>
        </div>

        <div class="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            <app-chart-card title="Circulation by Branch" subtitle="active loans" type="bar" [data]="branchLoanChart()" [options]="barOptions"></app-chart-card>
            <app-chart-card title="Collection Status" subtitle="filtered branches" type="doughnut" [data]="statusChart()" [options]="doughnutOptions"></app-chart-card>
            <app-chart-card title="Monthly Circulation" subtitle="issued vs returned" type="line" [data]="trendChart()" [options]="lineOptions"></app-chart-card>
            <app-chart-card title="Fine Status" subtitle="records" type="doughnut" [data]="fineChart()" [options]="doughnutOptions"></app-chart-card>
        </div>

        <div class="mt-6 grid gap-4 xl:grid-cols-3">
            <p-card styleClass="xl:col-span-2">
                <ng-template pTemplate="header">
                    <div class="flex items-center justify-between gap-3 px-4 pt-4">
                        <div>
                            <h2 class="text-lg font-semibold">Loans Due Soon</h2>
                            <p class="text-xs text-muted-color mt-0.5">Active loans ordered by due date</p>
                        </div>
                        <a class="text-primary text-sm font-medium" routerLink="/librarian/circulation">Open circulation</a>
                    </div>
                </ng-template>
                <div class="overflow-x-auto">
                    <p-table [value]="dueSoon()" dataKey="id" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '46rem' }">
                        <ng-template pTemplate="header">
                            <tr>
                                <th>Book</th>
                                <th>Member</th>
                                <th>Branch</th>
                                <th>Due Date</th>
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
                                <td class="text-sm">{{ data.branchName(row.branchId) }}</td>
                                <td class="text-sm">{{ formatDate(row.dueAt) }}</td>
                                <td>
                                    <p-tag [value]="isOverdue(row) ? 'Overdue' : 'Active'" [severity]="isOverdue(row) ? 'danger' : 'success'"></p-tag>
                                </td>
                            </tr>
                        </ng-template>
                        <ng-template pTemplate="emptymessage">
                            <tr>
                                <td colspan="5" class="text-center py-8 text-muted-color">No active loans for the selected branch.</td>
                            </tr>
                        </ng-template>
                    </p-table>
                </div>
            </p-card>

            <p-card>
                <ng-template pTemplate="header">
                    <div class="px-4 pt-4">
                        <h2 class="text-lg font-semibold">Quick Actions</h2>
                        <p class="text-xs text-muted-color mt-0.5">Common desk operations</p>
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
        </div>
    `
})
export class LibrarianDashboard {
    readonly data = inject(LibraryDataService);

    readonly branchFilter = signal<string | null>(null);

    readonly branchOptions = computed(() => this.data.branches().map((branch) => ({ label: branch.name, value: branch.id })));

    private readonly scopedCopies = computed(() => {
        const branchId = this.branchFilter();
        return this.data.bookCopies().filter((copy) => !branchId || copy.branchId === branchId);
    });

    private readonly scopedLoans = computed(() => {
        const branchId = this.branchFilter();
        return this.data.loans().filter((loan) => !branchId || loan.branchId === branchId);
    });

    private readonly scopedMembers = computed(() => {
        const branchId = this.branchFilter();
        return this.data.members().filter((member) => !branchId || member.branchId === branchId);
    });

    readonly bookCount = computed(() => this.data.books().filter((book) => book.status === 'ACTIVE').length);
    readonly copyCount = computed(() => this.scopedCopies().length);
    readonly availableCount = computed(() => this.scopedCopies().filter((copy) => copy.status === 'AVAILABLE').length);
    readonly onLoanCount = computed(() => this.scopedCopies().filter((copy) => copy.status === 'ISSUED').length);
    readonly overdueCount = computed(() => this.scopedLoans().filter((loan) => !loan.returnedAt && new Date(loan.dueAt).getTime() < Date.now()).length);
    readonly memberCount = computed(() => this.scopedMembers().length);
    readonly activeMemberCount = computed(() => this.scopedMembers().filter((member) => member.status === 'ACTIVE').length);
    readonly approvalCount = computed(() => {
        const branchId = this.branchFilter();
        return (
            this.data.borrowRequests().filter((request) => request.status === 'PENDING' && (!branchId || request.branchId === branchId)).length +
            this.data.renewalRequests().filter((request) => request.status === 'PENDING').length +
            this.data.reservations().filter((reservation) => reservation.status === 'PENDING' && (!branchId || reservation.branchId === branchId)).length
        );
    });
    readonly unpaidFineTotal = computed(() => this.data.unpaidFines().reduce((sum, fine) => sum + fine.amount, 0));
    readonly issueCount = computed(() => this.data.openInventoryIssues().length);

    readonly dueSoon = computed<Loan[]>(() =>
        this.scopedLoans()
            .filter((loan) => !loan.returnedAt)
            .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
            .slice(0, 6)
    );

    readonly quickActions = [
        { label: 'Issue Book', hint: 'Loan a copy', icon: 'pi pi-send', link: '/librarian/circulation' },
        { label: 'Return Book', hint: 'Close a loan', icon: 'pi pi-replay', link: '/librarian/circulation' },
        { label: 'Approvals', hint: 'Pending requests', icon: 'pi pi-inbox', link: '/librarian/requests' },
        { label: 'Add Member', hint: 'New membership', icon: 'pi pi-user-plus', link: '/librarian/members' },
        { label: 'Fines', hint: 'Pay or waive', icon: 'pi pi-wallet', link: '/librarian/fines' },
        { label: 'Announcement', hint: 'Notify members', icon: 'pi pi-megaphone', link: '/librarian/announcements' }
    ];

    readonly barOptions: ChartOptions = { scales: { y: { beginAtZero: true } } };
    readonly lineOptions: ChartOptions = { scales: { y: { beginAtZero: true } } };
    readonly doughnutOptions: ChartOptions = {};

    readonly branchLoanChart = computed<ChartData>(() => {
        const branches = this.data.branches();
        return {
            labels: branches.map((branch) => branch.code),
            datasets: [
                {
                    label: 'Active loans',
                    data: branches.map((branch) => this.data.loans().filter((loan) => loan.branchId === branch.id && !loan.returnedAt).length),
                    backgroundColor: 'rgba(59,130,246,0.75)'
                }
            ]
        };
    });

    readonly statusChart = computed<ChartData>(() => ({
        labels: ['Available', 'Issued', 'Reserved', 'Damaged/Lost'],
        datasets: [
            {
                data: [
                    this.scopedCopies().filter((copy) => copy.status === 'AVAILABLE').length,
                    this.scopedCopies().filter((copy) => copy.status === 'ISSUED').length,
                    this.scopedCopies().filter((copy) => copy.status === 'RESERVED').length,
                    this.scopedCopies().filter((copy) => copy.status === 'DAMAGED' || copy.status === 'LOST').length
                ],
                backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444']
            }
        ]
    }));

    readonly trendChart = computed<ChartData>(() => {
        const trend = this.data.circulationTrend();
        return {
            labels: trend.map((point) => point.month),
            datasets: [
                { label: 'Issued', data: trend.map((point) => point.issued), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.15)', fill: true, tension: 0.3 },
                { label: 'Returned', data: trend.map((point) => point.returned), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.15)', fill: true, tension: 0.3 }
            ]
        };
    });

    readonly fineChart = computed<ChartData>(() => {
        const fines = this.data.fines();
        return {
            labels: ['Unpaid', 'Paid', 'Waived'],
            datasets: [
                {
                    data: [
                        fines.filter((fine) => fine.status === 'UNPAID').length,
                        fines.filter((fine) => fine.status === 'PAID').length,
                        fines.filter((fine) => fine.status === 'WAIVED').length
                    ],
                    backgroundColor: ['#ef4444', '#10b981', '#6366f1']
                }
            ]
        };
    });

    copyBarcode(copyId: string): string {
        return this.data.bookCopies().find((copy) => copy.id === copyId)?.barcode ?? copyId;
    }

    isOverdue(loan: Loan): boolean {
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
