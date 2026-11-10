import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ChartCard } from '@/app/shared/components/chart-card';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatCard } from '@/app/shared/components/stat-card';
import { StatusTag } from '@/app/shared/components/status-tag';
import { LibraryDashboardService } from '@/app/core/services/library-dashboard.service';
import { LibraryDataService } from '@/app/core/services/library-data.service';
import type { ChartData, ChartOptions } from 'chart.js';

@Component({
    selector: 'app-super-admin-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, CardModule, TableModule, TagModule, ChartCard, PageHeader, StatCard, StatusTag],
    template: `
        <app-page-header title="Library Network Dashboard" subtitle="System-wide overview of branches, circulation, members and outstanding fines">
            <p-button label="Manage Branches" icon="pi pi-building" [outlined]="true" severity="secondary" routerLink="/admin/branches"></p-button>
            <p-button label="Audit Log" icon="pi pi-history" routerLink="/admin/activity"></p-button>
        </app-page-header>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 auto-rows-fr">
            <app-stat-card label="Library Branches" [value]="summary().totalBranches" [context]="summary().activeBranches + ' active · ' + summary().inactiveBranches + ' inactive'" icon="pi pi-building" iconBg="primary"></app-stat-card>
            <app-stat-card label="Book Copies" [value]="formatNumber(summary().totalCopies)" [context]="formatNumber(summary().totalTitles) + ' titles'" icon="pi pi-book" iconBg="primary"></app-stat-card>
            <app-stat-card label="Members" [value]="formatNumber(summary().totalMembers)" context="registered across branches" icon="pi pi-users" iconBg="green"></app-stat-card>
            <app-stat-card label="Active Loans" [value]="formatNumber(summary().activeLoans)" [context]="summary().utilization.toFixed(1) + '% of collection on loan'" icon="pi pi-send" iconBg="green"></app-stat-card>
            <app-stat-card label="Overdue Loans" [value]="formatNumber(summary().overdueLoans)" context="requires follow-up" icon="pi pi-exclamation-triangle" iconBg="orange"></app-stat-card>
            <app-stat-card label="Reservations" [value]="formatNumber(summary().reservations)" context="active holds and waitlists" icon="pi pi-bookmark" iconBg="primary"></app-stat-card>
            <app-stat-card label="Outstanding Fines" [value]="formatCurrency(summary().finesOutstanding)" context="across all branches" icon="pi pi-wallet" iconBg="red"></app-stat-card>
            <app-stat-card label="Digital Resources" [value]="formatNumber(summary().digitalResources)" context="e-books, journals and papers" icon="pi pi-cloud" iconBg="primary"></app-stat-card>
        </div>

        <div class="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            <app-chart-card title="Collection by Branch" subtitle="available vs on loan" type="bar" [data]="branchChartData()" [options]="stackedBarOptions"></app-chart-card>
            <app-chart-card title="Circulation Trend" subtitle="last 6 months" type="line" [data]="trendChartData()" [options]="lineOptions"></app-chart-card>
            <app-chart-card title="Collection Status" subtitle="all branches" type="doughnut" [data]="statusChartData()" [options]="doughnutOptions"></app-chart-card>
            <app-chart-card title="Outstanding Fines" subtitle="by branch" type="bar" [data]="fineChartData()" [options]="barOptions"></app-chart-card>
        </div>

        <div class="mt-6 grid gap-4 xl:grid-cols-3">
            <p-card styleClass="xl:col-span-2">
                <ng-template pTemplate="header">
                    <div class="flex items-center justify-between gap-3 px-4 pt-4">
                        <div>
                            <h2 class="text-lg font-semibold">Branch Performance</h2>
                            <p class="text-xs text-muted-color mt-0.5">Inventory, membership and circulation by branch</p>
                        </div>
                        <a class="text-primary text-sm font-medium" routerLink="/admin/branches">View all</a>
                    </div>
                </ng-template>
                <div class="overflow-x-auto">
                    <p-table [value]="dashboard.branchOverview()" dataKey="branch.id" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '52rem' }">
                        <ng-template pTemplate="header">
                            <tr>
                                <th>Branch</th>
                                <th class="text-right">Copies</th>
                                <th class="text-right">Members</th>
                                <th class="text-right">On loan</th>
                                <th style="width: 10rem">Utilization</th>
                                <th>Status</th>
                            </tr>
                        </ng-template>
                        <ng-template pTemplate="body" let-row>
                            <tr>
                                <td>
                                    <div class="font-medium">{{ row.branch.name }}</div>
                                    <div class="text-xs text-muted-color">{{ row.branch.code }}</div>
                                </td>
                                <td class="text-right">{{ formatNumber(row.metric.totalCopies) }}</td>
                                <td class="text-right">{{ formatNumber(row.metric.totalMembers) }}</td>
                                <td class="text-right">{{ formatNumber(row.metric.activeLoans) }}</td>
                                <td>
                                    <div class="flex items-center gap-2">
                                        <div class="h-2 flex-1 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
                                            <div class="h-full rounded-full bg-primary" [style.width.%]="row.utilization"></div>
                                        </div>
                                        <span class="text-xs text-muted-color w-10 text-right">{{ row.utilization.toFixed(0) }}%</span>
                                    </div>
                                </td>
                                <td><app-status-tag [status]="row.branch.status"></app-status-tag></td>
                            </tr>
                        </ng-template>
                        <ng-template pTemplate="emptymessage">
                            <tr>
                                <td colspan="6" class="text-center py-8 text-muted-color">No branches have been configured yet.</td>
                            </tr>
                        </ng-template>
                    </p-table>
                </div>
            </p-card>

            <p-card>
                <ng-template pTemplate="header">
                    <div class="px-4 pt-4">
                        <h2 class="text-lg font-semibold">Recent Activity</h2>
                        <p class="text-xs text-muted-color mt-0.5">Latest system-wide audit events</p>
                    </div>
                </ng-template>
                @if (dashboard.recentActivity().length === 0) {
                    <p class="text-sm text-muted-color py-4">No activity recorded yet.</p>
                } @else {
                    <div class="flex flex-col gap-3">
                        @for (entry of dashboard.recentActivity(); track entry.id) {
                            <div class="flex gap-3">
                                <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" [ngClass]="actionClass(entry.action)">
                                    <i class="pi text-xs" [ngClass]="actionIcon(entry.action)"></i>
                                </div>
                                <div class="min-w-0">
                                    <p class="text-sm leading-snug">{{ entry.detail }}</p>
                                    <p class="text-xs text-muted-color mt-0.5">{{ entry.actor }} · {{ relativeTime(entry.createdAt) }}</p>
                                </div>
                            </div>
                        }
                    </div>
                }
                <div class="mt-4 pt-3 border-t border-surface-200 dark:border-surface-700">
                    <a class="text-primary text-sm font-medium inline-flex items-center gap-1" routerLink="/admin/activity">
                        Open audit log <i class="pi pi-arrow-right text-xs"></i>
                    </a>
                </div>
            </p-card>
        </div>

        <p-card styleClass="mt-6">
            <ng-template pTemplate="header">
                <div class="px-4 pt-4">
                    <h2 class="text-lg font-semibold">Account Roles</h2>
                    <p class="text-xs text-muted-color mt-0.5">Accounts currently provisioned in the library system</p>
                </div>
            </ng-template>
            <div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
                @for (role of dashboard.roleDistribution(); track role.role) {
                    <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                        <div class="text-xs text-muted-color">{{ role.label }}</div>
                        <div class="text-xl font-semibold mt-1">{{ role.count }}</div>
                    </div>
                }
            </div>
        </p-card>
    `,
})
export class SuperAdminDashboard {
    readonly dashboard = inject(LibraryDashboardService);
    private readonly data = inject(LibraryDataService);

    readonly summary = this.dashboard.summary;

    readonly branchChartData = computed<ChartData>(() => {
        const rows = this.dashboard.branchOverview();
        return {
            labels: rows.map((row) => row.branch.code),
            datasets: [
                { label: 'Available', data: rows.map((row) => row.metric.availableCopies), backgroundColor: 'rgba(16, 185, 129, 0.75)' },
                { label: 'On loan', data: rows.map((row) => row.metric.issuedCopies), backgroundColor: 'rgba(59, 130, 246, 0.75)' }
            ]
        };
    });

    readonly trendChartData = computed<ChartData>(() => {
        const trend = this.data.circulationTrend();
        return {
            labels: trend.map((point) => point.month),
            datasets: [
                { label: 'Issued', data: trend.map((point) => point.issued), borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.18)', fill: true, tension: 0.3 },
                { label: 'Returned', data: trend.map((point) => point.returned), borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.18)', fill: true, tension: 0.3 }
            ]
        };
    });

    readonly statusChartData = computed<ChartData>(() => {
        const status = this.dashboard.collectionStatus();
        return {
            labels: ['Available', 'On loan', 'Overdue'],
            datasets: [{ data: [status.available, status.onLoan, status.overdue], backgroundColor: ['#10b981', '#3b82f6', '#f59e0b'] }]
        };
    });

    readonly fineChartData = computed<ChartData>(() => {
        const rows = this.dashboard.branchOverview();
        return {
            labels: rows.map((row) => row.branch.code),
            datasets: [{ label: 'Outstanding', data: rows.map((row) => row.metric.finesOutstanding), backgroundColor: 'rgba(239, 68, 68, 0.7)' }]
        };
    });

    readonly stackedBarOptions: ChartOptions = { scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } } };
    readonly barOptions: ChartOptions = { scales: { y: { beginAtZero: true } } };
    readonly lineOptions: ChartOptions = { scales: { y: { beginAtZero: true } } };
    readonly doughnutOptions: ChartOptions = {};

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

    relativeTime(value: string): string {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '—';
        const minutes = Math.round((Date.now() - date.getTime()) / 60000);
        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.round(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.round(hours / 24);
        if (days < 30) return `${days}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    actionIcon(action: string): string {
        switch (action) {
            case 'CREATE':
                return 'pi-plus';
            case 'DELETE':
                return 'pi-trash';
            case 'STATUS':
                return 'pi-power-off';
            case 'POLICY':
                return 'pi-sliders-h';
            case 'ROLE':
                return 'pi-shield';
            case 'SETTINGS':
                return 'pi-cog';
            case 'PAYMENT':
                return 'pi-wallet';
            case 'WAIVE':
                return 'pi-undo';
            case 'SEND':
                return 'pi-send';
            case 'LOGIN':
                return 'pi-sign-in';
            default:
                return 'pi-pencil';
        }
    }

    actionClass(action: string): string {
        switch (action) {
            case 'CREATE':
                return 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300';
            case 'DELETE':
                return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300';
            case 'STATUS':
                return 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300';
            case 'POLICY':
            case 'ROLE':
            case 'SETTINGS':
            case 'PAYMENT':
            case 'SEND':
                return 'bg-primary-100 text-primary dark:bg-primary-950';
            case 'WAIVE':
                return 'bg-surface-100 text-surface-700 dark:bg-surface-800 dark:text-surface-300';
            default:
                return 'bg-surface-100 text-surface-700 dark:bg-surface-800 dark:text-surface-300';
        }
    }
}
