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
import { StatusTag } from '@/app/shared/components/status-tag';
import { LibraryDashboardService } from '@/app/core/services/library-dashboard.service';
import { LibraryDataService } from '@/app/core/services/library-data.service';
import type { ChartData, ChartOptions } from 'chart.js';
import type { AuditAction } from '@/app/core/models/library.models';

@Component({
    selector: 'app-system-reports',
    standalone: true,
    imports: [CommonModule, ButtonModule, CardModule, TableModule, TagModule, ToastModule, ChartCard, PageHeader, StatCard, StatusTag],
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
        <app-page-header class="no-print" title="System-Wide Reports" subtitle="Circulation, membership, overdue and fine reporting across every library branch">
            <p-button label="Print" icon="pi pi-print" severity="secondary" [outlined]="true" (onClick)="printReport()"></p-button>
            <p-button label="Export CSV" icon="pi pi-download" (onClick)="exportBranchReport()"></p-button>
        </app-page-header>

        <div class="print-only mb-4">
            <h1 class="text-xl font-bold">{{ data.settings().libraryName }} — System-Wide Report</h1>
            <p class="text-sm">Generated {{ generatedLabel() }} · All branches</p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
            <app-stat-card label="Branches" [value]="summary().totalBranches" [context]="summary().activeBranches + ' active'" icon="pi pi-building"></app-stat-card>
            <app-stat-card label="Book Copies" [value]="formatNumber(summary().totalCopies)" [context]="formatNumber(summary().availableCopies) + ' available'" icon="pi pi-book"></app-stat-card>
            <app-stat-card label="Members" [value]="formatNumber(summary().totalMembers)" context="registered borrowers" icon="pi pi-users"></app-stat-card>
            <app-stat-card label="Outstanding Fines" [value]="formatCurrency(summary().finesOutstanding)" context="unpaid balances" icon="pi pi-wallet" iconBg="red"></app-stat-card>
        </div>

        <section class="report-section mb-8">
            <div class="flex items-center justify-between gap-2 mb-3">
                <div>
                    <h2 class="text-lg font-semibold">1 · Branch Performance</h2>
                    <p class="text-sm text-muted-color">Inventory, membership, circulation, overdue and fine totals by branch.</p>
                </div>
                <p-button class="no-print" label="Export CSV" icon="pi pi-download" size="small" severity="secondary" [outlined]="true" (onClick)="exportBranchReport()"></p-button>
            </div>
            <p-card>
                <div class="overflow-x-auto">
                    <p-table [value]="dashboard.branchOverview()" dataKey="branch.id" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '68rem' }">
                        <ng-template pTemplate="header">
                            <tr>
                                <th>Branch</th>
                                <th class="text-right">Titles</th>
                                <th class="text-right">Copies</th>
                                <th class="text-right">Available</th>
                                <th class="text-right">Members</th>
                                <th class="text-right">On Loan</th>
                                <th class="text-right">Overdue</th>
                                <th class="text-right">Fines</th>
                                <th>Status</th>
                            </tr>
                        </ng-template>
                        <ng-template pTemplate="body" let-row>
                            <tr>
                                <td>
                                    <div class="font-medium">{{ row.branch.name }}</div>
                                    <div class="text-xs text-muted-color font-mono">{{ row.branch.code }}</div>
                                </td>
                                <td class="text-right">{{ formatNumber(row.metric.totalTitles) }}</td>
                                <td class="text-right">{{ formatNumber(row.metric.totalCopies) }}</td>
                                <td class="text-right">{{ formatNumber(row.metric.availableCopies) }}</td>
                                <td class="text-right">{{ formatNumber(row.metric.totalMembers) }}</td>
                                <td class="text-right">{{ formatNumber(row.metric.activeLoans) }}</td>
                                <td class="text-right">{{ formatNumber(row.metric.overdueLoans) }}</td>
                                <td class="text-right whitespace-nowrap">{{ formatCurrency(row.metric.finesOutstanding) }}</td>
                                <td><app-status-tag [status]="row.branch.status"></app-status-tag></td>
                            </tr>
                        </ng-template>
                        <ng-template pTemplate="footer">
                            <tr>
                                <td class="font-semibold">Total</td>
                                <td class="text-right font-semibold">{{ formatNumber(summary().totalTitles) }}</td>
                                <td class="text-right font-semibold">{{ formatNumber(summary().totalCopies) }}</td>
                                <td class="text-right font-semibold">{{ formatNumber(summary().availableCopies) }}</td>
                                <td class="text-right font-semibold">{{ formatNumber(summary().totalMembers) }}</td>
                                <td class="text-right font-semibold">{{ formatNumber(summary().activeLoans) }}</td>
                                <td class="text-right font-semibold">{{ formatNumber(summary().overdueLoans) }}</td>
                                <td class="text-right font-semibold whitespace-nowrap">{{ formatCurrency(summary().finesOutstanding) }}</td>
                                <td></td>
                            </tr>
                        </ng-template>
                    </p-table>
                </div>
            </p-card>
        </section>

        <section class="report-section mb-8">
            <div class="mb-3">
                <h2 class="text-lg font-semibold">2 · Collection &amp; Circulation</h2>
                <p class="text-sm text-muted-color">Availability status and six-month circulation movement.</p>
            </div>
            <div class="grid gap-4 xl:grid-cols-3">
                <app-chart-card title="Collection Status" subtitle="all branches" type="doughnut" [data]="statusChartData()" [options]="doughnutOptions"></app-chart-card>
                <app-chart-card title="Circulation Trend" subtitle="issued vs returned" type="line" [data]="trendChartData()" [options]="lineOptions"></app-chart-card>
                <app-chart-card title="On Loan by Branch" subtitle="active loans" type="bar" [data]="loanChartData()" [options]="barOptions"></app-chart-card>
            </div>
        </section>

        <section class="report-section mb-8">
            <div class="mb-3">
                <h2 class="text-lg font-semibold">3 · Fines &amp; Overdue</h2>
                <p class="text-sm text-muted-color">Outstanding fine balances and overdue loans by branch.</p>
            </div>
            <div class="grid gap-4 xl:grid-cols-2">
                <app-chart-card title="Outstanding Fines" subtitle="by branch" type="bar" [data]="fineChartData()" [options]="barOptions"></app-chart-card>
                <p-card>
                    <div class="overflow-x-auto">
                        <p-table [value]="dashboard.branchOverview()" dataKey="branch.id" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '30rem' }">
                            <ng-template pTemplate="header">
                                <tr>
                                    <th>Branch</th>
                                    <th class="text-right">Overdue Loans</th>
                                    <th class="text-right">Outstanding Fines</th>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="body" let-row>
                                <tr>
                                    <td>{{ row.branch.name }}</td>
                                    <td class="text-right">{{ formatNumber(row.metric.overdueLoans) }}</td>
                                    <td class="text-right whitespace-nowrap">{{ formatCurrency(row.metric.finesOutstanding) }}</td>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="footer">
                                <tr>
                                    <td class="font-semibold">Total</td>
                                    <td class="text-right font-semibold">{{ formatNumber(summary().overdueLoans) }}</td>
                                    <td class="text-right font-semibold whitespace-nowrap">{{ formatCurrency(summary().finesOutstanding) }}</td>
                                </tr>
                            </ng-template>
                        </p-table>
                    </div>
                </p-card>
            </div>
        </section>

        <section class="report-section mb-8">
            <div class="mb-3">
                <h2 class="text-lg font-semibold">4 · Accounts &amp; Access</h2>
                <p class="text-sm text-muted-color">Provisioned accounts by role and recent governance activity.</p>
            </div>
            <div class="grid gap-4 xl:grid-cols-2">
                <p-card>
                    <div class="overflow-x-auto">
                        <p-table [value]="dashboard.roleDistribution()" dataKey="role" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '22rem' }">
                            <ng-template pTemplate="header">
                                <tr>
                                    <th>Role</th>
                                    <th class="text-right">Accounts</th>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="body" let-row>
                                <tr>
                                    <td>{{ row.label }}</td>
                                    <td class="text-right font-medium">{{ row.count }}</td>
                                </tr>
                            </ng-template>
                        </p-table>
                    </div>
                </p-card>
                <p-card>
                    <div class="overflow-x-auto">
                        <p-table [value]="actionSummary()" dataKey="action" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '22rem' }">
                            <ng-template pTemplate="header">
                                <tr>
                                    <th>Audit Action</th>
                                    <th class="text-right">Events</th>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="body" let-row>
                                <tr>
                                    <td><p-tag [value]="row.action" [severity]="actionSeverity(row.action)"></p-tag></td>
                                    <td class="text-right font-medium">{{ row.count }}</td>
                                </tr>
                            </ng-template>
                        </p-table>
                    </div>
                </p-card>
            </div>
        </section>

        <section class="report-section">
            <div class="mb-3">
                <h2 class="text-lg font-semibold">5 · Digital Resources</h2>
                <p class="text-sm text-muted-color">E-books, journals, research papers and theses available per branch.</p>
            </div>
            <div class="grid gap-4 xl:grid-cols-2">
                <app-chart-card title="Digital Resources" subtitle="by branch" type="bar" [data]="digitalChartData()" [options]="barOptions"></app-chart-card>
                <p-card>
                    <div class="overflow-x-auto">
                        <p-table [value]="dashboard.branchOverview()" dataKey="branch.id" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '24rem' }">
                            <ng-template pTemplate="header">
                                <tr>
                                    <th>Branch</th>
                                    <th class="text-right">Records</th>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="body" let-row>
                                <tr>
                                    <td>{{ row.branch.name }}</td>
                                    <td class="text-right font-medium">{{ formatNumber(row.metric.digitalResources) }}</td>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="footer">
                                <tr>
                                    <td class="font-semibold">Total</td>
                                    <td class="text-right font-semibold">{{ formatNumber(summary().digitalResources) }}</td>
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
export class SystemReports {
    readonly data = inject(LibraryDataService);
    readonly dashboard = inject(LibraryDashboardService);
    private readonly msg = inject(MessageService);

    readonly summary = this.dashboard.summary;

    readonly statusChartData = computed<ChartData>(() => {
        const status = this.dashboard.collectionStatus();
        return {
            labels: ['Available', 'On loan', 'Overdue'],
            datasets: [{ data: [status.available, status.onLoan, status.overdue], backgroundColor: ['#10b981', '#3b82f6', '#f59e0b'] }]
        };
    });

    readonly trendChartData = computed<ChartData>(() => {
        const trend = this.data.circulationTrend();
        return {
            labels: trend.map((point) => point.month),
            datasets: [
                { label: 'Issued', data: trend.map((point) => point.issued), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.15)', fill: true, tension: 0.3 },
                { label: 'Returned', data: trend.map((point) => point.returned), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.15)', fill: true, tension: 0.3 }
            ]
        };
    });

    readonly loanChartData = computed<ChartData>(() => {
        const rows = this.dashboard.branchOverview();
        return {
            labels: rows.map((row) => row.branch.code),
            datasets: [{ label: 'Active loans', data: rows.map((row) => row.metric.activeLoans), backgroundColor: 'rgba(59,130,246,0.75)' }]
        };
    });

    readonly fineChartData = computed<ChartData>(() => {
        const rows = this.dashboard.branchOverview();
        return {
            labels: rows.map((row) => row.branch.code),
            datasets: [{ label: 'Outstanding fines', data: rows.map((row) => row.metric.finesOutstanding), backgroundColor: 'rgba(239,68,68,0.7)' }]
        };
    });

    readonly digitalChartData = computed<ChartData>(() => {
        const rows = this.dashboard.branchOverview();
        return {
            labels: rows.map((row) => row.branch.code),
            datasets: [{ label: 'Digital records', data: rows.map((row) => row.metric.digitalResources), backgroundColor: 'rgba(168,85,247,0.7)' }]
        };
    });

    readonly actionSummary = computed(() => {
        const logs = this.data.auditLogs();
        const actions: AuditAction[] = ['CREATE', 'UPDATE', 'DELETE', 'STATUS', 'LOGIN', 'POLICY', 'ROLE', 'SETTINGS', 'PAYMENT', 'WAIVE', 'SEND'];
        return actions.map((action) => ({ action, count: logs.filter((log) => log.action === action).length }));
    });

    readonly barOptions: ChartOptions = { scales: { y: { beginAtZero: true } } };
    readonly lineOptions: ChartOptions = { scales: { y: { beginAtZero: true } } };
    readonly doughnutOptions: ChartOptions = {};

    readonly generatedLabel = computed(() => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));

    printReport(): void {
        window.print();
    }

    exportBranchReport(): void {
        const rows = this.dashboard.branchOverview();
        const header = ['Branch', 'Code', 'Status', 'Titles', 'Copies', 'Available', 'Members', 'Active Loans', 'Overdue', 'Outstanding Fines', 'Digital Resources'];
        const lines = rows.map((row) => [
            row.branch.name,
            row.branch.code,
            row.branch.status,
            row.metric.totalTitles,
            row.metric.totalCopies,
            row.metric.availableCopies,
            row.metric.totalMembers,
            row.metric.activeLoans,
            row.metric.overdueLoans,
            row.metric.finesOutstanding,
            row.metric.digitalResources
        ]);
        const csv = [header, ...lines]
            .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'library-branch-report.csv';
        link.click();
        URL.revokeObjectURL(url);
        this.msg.add({ severity: 'success', summary: 'CSV exported', detail: `${rows.length} branch row(s) exported.` });
    }

    actionSeverity(action: AuditAction): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        switch (action) {
            case 'CREATE':
                return 'success';
            case 'DELETE':
                return 'danger';
            case 'STATUS':
                return 'warn';
            case 'POLICY':
            case 'ROLE':
            case 'SETTINGS':
            case 'PAYMENT':
            case 'WAIVE':
            case 'SEND':
                return 'info';
            default:
                return 'secondary';
        }
    }

    formatNumber(value: number): string {
        return value.toLocaleString('en-US');
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
