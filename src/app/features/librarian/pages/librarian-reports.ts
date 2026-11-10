import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ChartCard } from '@/app/shared/components/chart-card';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatCard } from '@/app/shared/components/stat-card';
import { LibraryDataService } from '@/app/core/services/library-data.service';
import type { ChartData, ChartOptions } from 'chart.js';

@Component({
    selector: 'app-librarian-reports',
    standalone: true,
    imports: [CommonModule, ButtonModule, CardModule, TableModule, TagModule, ToastModule, ChartCard, PageHeader, StatCard],
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

                .report-section {
                    break-inside: avoid;
                    page-break-inside: avoid;
                }

                * {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }

                @page {
                    margin: 12mm;
                }
            }
        `
    ],
    template: `
        <app-page-header class="no-print" title="Library Reports" subtitle="Circulation, membership, inventory and fine reporting for your library branch">
            <p-button label="Print" icon="pi pi-print" severity="secondary" [outlined]="true" (onClick)="printReport()"></p-button>
            <p-button label="Export Circulation CSV" icon="pi pi-download" (onClick)="exportCirculation()"></p-button>
        </app-page-header>

        <div class="print-only mb-4">
            <h1 class="text-xl font-bold">{{ data.settings().libraryName }} — Library Report</h1>
            <p class="text-sm">Generated {{ generatedLabel() }}</p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
            <app-stat-card label="Active Loans" [value]="data.activeLoans().length" context="currently borrowed" icon="pi pi-send"></app-stat-card>
            <app-stat-card label="Overdue Loans" [value]="data.overdueLoans().length" context="past due date" icon="pi pi-exclamation-triangle" iconBg="orange"></app-stat-card>
            <app-stat-card label="Members" [value]="data.members().length" [context]="activeMembers() + ' active'" icon="pi pi-users" iconBg="green"></app-stat-card>
            <app-stat-card label="Unpaid Fines" [value]="formatCurrency(unpaidFineTotal())" context="outstanding balance" icon="pi pi-wallet" iconBg="red"></app-stat-card>
        </div>

        <section class="report-section mb-8">
            <div class="flex items-center justify-between gap-2 mb-3">
                <div>
                    <h2 class="text-lg font-semibold">1 · Circulation</h2>
                    <p class="text-sm text-muted-color">Active, overdue and returned loans by branch.</p>
                </div>
                <p-button class="no-print" label="Export CSV" icon="pi pi-download" size="small" severity="secondary" [outlined]="true" (onClick)="exportCirculation()"></p-button>
            </div>
            <div class="grid gap-4 xl:grid-cols-3">
                <app-chart-card title="Loans by Branch" subtitle="active vs overdue" type="bar" [data]="loanChart()" [options]="barOptions"></app-chart-card>
                <app-chart-card title="Loan Status" subtitle="all records" type="doughnut" [data]="loanStatusChart()" [options]="doughnutOptions"></app-chart-card>
                <p-card>
                    <div class="overflow-x-auto">
                        <p-table [value]="branchRows()" dataKey="branch.id" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '24rem' }">
                            <ng-template pTemplate="header">
                                <tr>
                                    <th>Branch</th>
                                    <th class="text-right">Active</th>
                                    <th class="text-right">Overdue</th>
                                    <th class="text-right">Returned</th>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="body" let-row>
                                <tr>
                                    <td>{{ row.branch.name }}</td>
                                    <td class="text-right">{{ row.active }}</td>
                                    <td class="text-right">{{ row.overdue }}</td>
                                    <td class="text-right">{{ row.returned }}</td>
                                </tr>
                            </ng-template>
                        </p-table>
                    </div>
                </p-card>
            </div>
        </section>

        <section class="report-section mb-8">
            <div class="flex items-center justify-between gap-2 mb-3">
                <div>
                    <h2 class="text-lg font-semibold">2 · Memberships</h2>
                    <p class="text-sm text-muted-color">Members by type and status.</p>
                </div>
            </div>
            <div class="grid gap-4 xl:grid-cols-3">
                <app-chart-card title="Members by Type" subtitle="student, teacher, staff" type="doughnut" [data]="memberTypeChart()" [options]="doughnutOptions"></app-chart-card>
                <app-chart-card title="Membership Status" subtitle="all members" type="bar" [data]="memberStatusChart()" [options]="barOptions"></app-chart-card>
                <p-card>
                    <div class="overflow-x-auto">
                        <p-table [value]="memberRows()" dataKey="type" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '18rem' }">
                            <ng-template pTemplate="header">
                                <tr>
                                    <th>Type</th>
                                    <th class="text-right">Members</th>
                                    <th class="text-right">Active</th>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="body" let-row>
                                <tr>
                                    <td>{{ row.label }}</td>
                                    <td class="text-right">{{ row.total }}</td>
                                    <td class="text-right">{{ row.active }}</td>
                                </tr>
                            </ng-template>
                        </p-table>
                    </div>
                </p-card>
            </div>
        </section>

        <section class="report-section mb-8">
            <div class="flex items-center justify-between gap-2 mb-3">
                <div>
                    <h2 class="text-lg font-semibold">3 · Inventory</h2>
                    <p class="text-sm text-muted-color">Physical copies by status with open exceptions.</p>
                </div>
            </div>
            <div class="grid gap-4 xl:grid-cols-2">
                <app-chart-card title="Copy Status" subtitle="all branches" type="doughnut" [data]="copyStatusChart()" [options]="doughnutOptions"></app-chart-card>
                <p-card>
                    <div class="overflow-x-auto">
                        <p-table [value]="data.openInventoryIssues()" dataKey="id" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '26rem' }">
                            <ng-template pTemplate="header">
                                <tr>
                                    <th>Copy</th>
                                    <th>Book</th>
                                    <th>Issue</th>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="body" let-row>
                                <tr>
                                    <td class="font-mono text-xs">{{ copyBarcode(row.copyId) }}</td>
                                    <td class="text-sm">{{ data.bookTitle(row.bookId) }}</td>
                                    <td><p-tag [value]="row.status" [severity]="row.status === 'MISSING' ? 'danger' : 'warn'"></p-tag></td>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="emptymessage">
                                <tr>
                                    <td colspan="3" class="text-center py-6 text-muted-color">No open inventory exceptions.</td>
                                </tr>
                            </ng-template>
                        </p-table>
                    </div>
                </p-card>
            </div>
        </section>

        <section class="report-section mb-8">
            <div class="flex items-center justify-between gap-2 mb-3">
                <div>
                    <h2 class="text-lg font-semibold">4 · Fines &amp; Payments</h2>
                    <p class="text-sm text-muted-color">Collected, unpaid and waived fine totals.</p>
                </div>
            </div>
            <div class="grid gap-4 xl:grid-cols-2">
                <app-chart-card title="Fine Status" subtitle="record count" type="doughnut" [data]="fineChart()" [options]="doughnutOptions"></app-chart-card>
                <p-card>
                    <div class="overflow-x-auto">
                        <p-table [value]="fineRows()" dataKey="status" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '22rem' }">
                            <ng-template pTemplate="header">
                                <tr>
                                    <th>Status</th>
                                    <th class="text-right">Records</th>
                                    <th class="text-right">Amount</th>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="body" let-row>
                                <tr>
                                    <td><p-tag [value]="row.status" [severity]="row.status === 'UNPAID' ? 'danger' : row.status === 'PAID' ? 'success' : 'info'"></p-tag></td>
                                    <td class="text-right">{{ row.count }}</td>
                                    <td class="text-right whitespace-nowrap">{{ formatCurrency(row.amount) }}</td>
                                </tr>
                            </ng-template>
                        </p-table>
                    </div>
                </p-card>
            </div>
        </section>

        <section class="report-section">
            <div class="mb-3">
                <h2 class="text-lg font-semibold">5 · Acquisitions</h2>
                <p class="text-sm text-muted-color">Purchase requests by status and estimated spend.</p>
            </div>
            <div class="grid gap-4 xl:grid-cols-2">
                <app-chart-card title="Requests by Status" subtitle="acquisition pipeline" type="bar" [data]="acquisitionChart()" [options]="barOptions"></app-chart-card>
                <p-card>
                    <div class="overflow-x-auto">
                        <p-table [value]="acquisitionRows()" dataKey="status" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '20rem' }">
                            <ng-template pTemplate="header">
                                <tr>
                                    <th>Status</th>
                                    <th class="text-right">Requests</th>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="body" let-row>
                                <tr>
                                    <td>{{ row.label }}</td>
                                    <td class="text-right">{{ row.count }}</td>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="footer">
                                <tr>
                                    <td class="font-semibold">Open estimated spend</td>
                                    <td class="text-right font-semibold whitespace-nowrap">{{ formatCurrency(openSpend()) }}</td>
                                </tr>
                            </ng-template>
                        </p-table>
                    </div>
                </p-card>
            </div>
        </section>

        <p-toast></p-toast>
    `
})
export class LibrarianReports {
    readonly data = inject(LibraryDataService);
    private readonly msg = inject(MessageService);

    readonly barOptions: ChartOptions = { scales: { y: { beginAtZero: true } } };
    readonly doughnutOptions: ChartOptions = {};

    readonly activeMembers = computed(() => this.data.members().filter((member) => member.status === 'ACTIVE').length);
    readonly unpaidFineTotal = computed(() => this.data.unpaidFines().reduce((sum, fine) => sum + fine.amount, 0));

    readonly branchRows = computed(() =>
        this.data.branches().map((branch) => ({
            branch,
            active: this.data.loans().filter((loan) => loan.branchId === branch.id && !loan.returnedAt).length,
            overdue: this.data.loans().filter((loan) => loan.branchId === branch.id && !loan.returnedAt && new Date(loan.dueAt).getTime() < Date.now()).length,
            returned: this.data.loans().filter((loan) => loan.branchId === branch.id && !!loan.returnedAt).length
        }))
    );

    readonly memberRows = computed(() =>
        (['STUDENT', 'TEACHER', 'STAFF'] as const).map((type) => ({
            type,
            label: type === 'STUDENT' ? 'Student' : type === 'TEACHER' ? 'Teacher' : 'Staff',
            total: this.data.members().filter((member) => member.memberType === type).length,
            active: this.data.members().filter((member) => member.memberType === type && member.status === 'ACTIVE').length
        }))
    );

    readonly fineRows = computed(() =>
        (['UNPAID', 'PAID', 'WAIVED'] as const).map((status) => ({
            status,
            count: this.data.fines().filter((fine) => fine.status === status).length,
            amount: this.data.fines().filter((fine) => fine.status === status).reduce((sum, fine) => sum + fine.amount, 0)
        }))
    );

    readonly acquisitionRows = computed(() =>
        (['PENDING', 'APPROVED', 'REJECTED', 'ORDERED', 'RECEIVED'] as const).map((status) => ({
            status,
            label: status.charAt(0) + status.slice(1).toLowerCase(),
            count: this.data.acquisitions().filter((request) => request.status === status).length
        }))
    );

    readonly openSpend = computed(() =>
        this.data
            .acquisitions()
            .filter((request) => request.status === 'PENDING' || request.status === 'APPROVED' || request.status === 'ORDERED')
            .reduce((sum, request) => sum + request.estimatedCost, 0)
    );

    readonly loanChart = computed<ChartData>(() => ({
        labels: this.branchRows().map((row) => row.branch.code),
        datasets: [
            { label: 'Active', data: this.branchRows().map((row) => row.active), backgroundColor: 'rgba(59,130,246,0.75)' },
            { label: 'Overdue', data: this.branchRows().map((row) => row.overdue), backgroundColor: 'rgba(239,68,68,0.7)' }
        ]
    }));

    readonly loanStatusChart = computed<ChartData>(() => ({
        labels: ['Active', 'Overdue', 'Returned'],
        datasets: [
            {
                data: [
                    this.data.loans().filter((loan) => !loan.returnedAt && new Date(loan.dueAt).getTime() >= Date.now()).length,
                    this.data.loans().filter((loan) => !loan.returnedAt && new Date(loan.dueAt).getTime() < Date.now()).length,
                    this.data.loans().filter((loan) => !!loan.returnedAt).length
                ],
                backgroundColor: ['#10b981', '#ef4444', '#3b82f6']
            }
        ]
    }));

    readonly memberTypeChart = computed<ChartData>(() => ({
        labels: this.memberRows().map((row) => row.label),
        datasets: [{ data: this.memberRows().map((row) => row.total), backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'] }]
    }));

    readonly memberStatusChart = computed<ChartData>(() => ({
        labels: ['Active', 'Inactive', 'Suspended', 'Expired', 'Pending'],
        datasets: [
            {
                data: [
                    this.data.members().filter((member) => member.status === 'ACTIVE').length,
                    this.data.members().filter((member) => member.status === 'INACTIVE').length,
                    this.data.members().filter((member) => member.status === 'SUSPENDED').length,
                    this.data.members().filter((member) => member.status === 'EXPIRED').length,
                    this.data.members().filter((member) => member.status === 'PENDING').length
                ],
                backgroundColor: ['#10b981', '#94a3b8', '#ef4444', '#f59e0b', '#6366f1']
            }
        ]
    }));

    readonly copyStatusChart = computed<ChartData>(() => ({
        labels: ['Available', 'Issued', 'Reserved', 'Lost', 'Damaged'],
        datasets: [
            {
                data: [
                    this.data.bookCopies().filter((copy) => copy.status === 'AVAILABLE').length,
                    this.data.bookCopies().filter((copy) => copy.status === 'ISSUED').length,
                    this.data.bookCopies().filter((copy) => copy.status === 'RESERVED').length,
                    this.data.bookCopies().filter((copy) => copy.status === 'LOST').length,
                    this.data.bookCopies().filter((copy) => copy.status === 'DAMAGED').length
                ],
                backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7']
            }
        ]
    }));

    readonly fineChart = computed<ChartData>(() => ({
        labels: this.fineRows().map((row) => row.status),
        datasets: [{ data: this.fineRows().map((row) => row.count), backgroundColor: ['#ef4444', '#10b981', '#6366f1'] }]
    }));

    readonly acquisitionChart = computed<ChartData>(() => ({
        labels: this.acquisitionRows().map((row) => row.label),
        datasets: [{ label: 'Requests', data: this.acquisitionRows().map((row) => row.count), backgroundColor: 'rgba(99,102,241,0.75)' }]
    }));

    readonly generatedLabel = computed(() => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));

    printReport(): void {
        window.print();
    }

    exportCirculation(): void {
        const header = ['Branch', 'Code', 'Active Loans', 'Overdue', 'Returned'];
        const rows = this.branchRows().map((row) => [row.branch.name, row.branch.code, row.active, row.overdue, row.returned]);
        const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'library-circulation-report.csv';
        link.click();
        URL.revokeObjectURL(url);
        this.msg.add({ severity: 'success', summary: 'CSV exported', detail: `${rows.length} branch row(s) exported.` });
    }

    copyBarcode(copyId: string): string {
        return this.data.bookCopies().find((copy) => copy.id === copyId)?.barcode ?? copyId;
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
