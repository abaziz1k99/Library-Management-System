import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { EmptyState } from '@/app/shared/components/empty-state';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatCard } from '@/app/shared/components/stat-card';
import { LibraryDataService } from '@/app/core/services/library-data.service';
import type { AuditAction } from '@/app/core/models/library.models';

@Component({
    selector: 'app-activity-logs',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, CardModule, InputTextModule, SelectModule, TableModule, TagModule, ToastModule, EmptyState, PageHeader, StatCard],
    providers: [MessageService],
    template: `
        <app-page-header title="Activity Monitor & Audit Log" subtitle="Review system-wide account, branch, policy and permission changes across all library branches">
            <p-button label="Export CSV" icon="pi pi-download" severity="secondary" [outlined]="true" [disabled]="filteredLogs().length === 0" (onClick)="exportCsv()"></p-button>
        </app-page-header>

        <div class="grid gap-4 sm:grid-cols-3 mb-6">
            <app-stat-card label="Audit Entries" [value]="data.auditLogs().length" context="retained system events" icon="pi pi-list"></app-stat-card>
            <app-stat-card label="Entries Today" [value]="todayCount()" context="activity in the last 24 hours" icon="pi pi-calendar"></app-stat-card>
            <app-stat-card label="Unique Actors" [value]="actorCount()" context="accounts that performed actions" icon="pi pi-users"></app-stat-card>
        </div>

        <p-card>
            <div class="grid gap-3 lg:grid-cols-3 mb-4">
                <span class="relative block">
                    <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-color"></i>
                    <input pInputText type="text" placeholder="Search actor, record or detail" class="w-full pl-10" [ngModel]="search()" (ngModelChange)="search.set($event)" />
                </span>
                <p-select [ngModel]="actionFilter()" (ngModelChange)="actionFilter.set($event)" [options]="actionFilterOptions" optionLabel="label" optionValue="value" placeholder="Action" [showClear]="true" appendTo="body" styleClass="w-full"></p-select>
                <p-select [ngModel]="branchFilter()" (ngModelChange)="branchFilter.set($event)" [options]="branchFilterOptions()" optionLabel="label" optionValue="value" placeholder="Branch" [showClear]="true" [filter]="true" appendTo="body" styleClass="w-full"></p-select>
            </div>

            <div class="flex flex-wrap items-center gap-3 mb-3 text-xs text-muted-color">
                <span>Showing {{ filteredLogs().length }} of {{ data.auditLogs().length }} entries</span>
                @if (hasFilters()) {
                    <a class="text-primary cursor-pointer underline" (click)="clearFilters()">Clear filters</a>
                }
            </div>

            @if (filteredLogs().length === 0) {
                <app-empty-state icon="pi pi-history" title="No audit entries" message="No activity matches the current filters." actionLabel="Clear filters" (action)="clearFilters()"></app-empty-state>
            } @else {
                <div class="overflow-x-auto">
                    <p-table [value]="filteredLogs()" dataKey="id" [paginator]="true" [rows]="15" [rowsPerPageOptions]="[15, 25, 50]" [tableStyle]="{ 'min-width': '72rem' }" styleClass="w-full" sortMode="single">
                        <ng-template pTemplate="header">
                            <tr>
                                <th pSortableColumn="createdAt" style="width: 12rem">Timestamp <p-sortIcon field="createdAt"></p-sortIcon></th>
                                <th>Actor</th>
                                <th style="width: 8rem">Action</th>
                                <th>Entity</th>
                                <th>Detail</th>
                                <th>Branch</th>
                                <th style="width: 8rem">IP</th>
                            </tr>
                        </ng-template>
                        <ng-template pTemplate="body" let-row>
                            <tr>
                                <td class="whitespace-nowrap text-sm">
                                    <div>{{ formatDate(row.createdAt) }}</div>
                                    <div class="text-xs text-muted-color">{{ formatTime(row.createdAt) }}</div>
                                </td>
                                <td>
                                    <div class="text-sm font-medium">{{ row.actor }}</div>
                                    <div class="text-xs text-muted-color">{{ data.roleLabel(row.actorRole) }}</div>
                                </td>
                                <td><p-tag [value]="row.action" [severity]="actionSeverity(row.action)"></p-tag></td>
                                <td class="text-sm">
                                    <div>{{ row.entity }}</div>
                                    <div class="text-[11px] text-muted-color font-mono">{{ row.entityId }}</div>
                                </td>
                                <td class="text-sm max-w-[26rem]">{{ row.detail }}</td>
                                <td class="text-sm">{{ data.branchName(row.branchId) }}</td>
                                <td class="text-xs font-mono text-muted-color">{{ row.ipAddress }}</td>
                            </tr>
                        </ng-template>
                    </p-table>
                </div>
            }
        </p-card>

        <p-toast></p-toast>
    `
})
export class ActivityLogs {
    readonly data = inject(LibraryDataService);
    private readonly msg = inject(MessageService);

    readonly search = signal('');
    readonly actionFilter = signal<AuditAction | null>(null);
    readonly branchFilter = signal<string | null>(null);

    readonly actions: AuditAction[] = ['CREATE', 'UPDATE', 'DELETE', 'STATUS', 'LOGIN', 'POLICY', 'ROLE', 'SETTINGS', 'PAYMENT', 'WAIVE', 'SEND'];

    readonly actionFilterOptions = [{ label: 'All Actions', value: null }, ...this.actions.map((action) => ({ label: action, value: action }))];
    readonly branchFilterOptions = computed(() => [{ label: 'All Branches', value: null }, ...this.data.branches().map((branch) => ({ label: branch.name, value: branch.id }))]);

    readonly hasFilters = computed(() => !!this.search().trim() || !!this.actionFilter() || !!this.branchFilter());

    readonly actorCount = computed(() => new Set(this.data.auditLogs().map((log) => log.actor)).size);

    readonly todayCount = computed(() => {
        const today = new Date();
        return this.data.auditLogs().filter((log) => {
            const date = new Date(log.createdAt);
            return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
        }).length;
    });

    readonly filteredLogs = computed(() => {
        const query = this.search().trim().toLowerCase();
        const action = this.actionFilter();
        const branchId = this.branchFilter();
        return this.data
            .auditLogs()
            .filter((log) => {
                const matchesAction = !action || log.action === action;
                const matchesBranch = !branchId || log.branchId === branchId;
                const matchesQuery =
                    !query ||
                    log.actor.toLowerCase().includes(query) ||
                    log.detail.toLowerCase().includes(query) ||
                    log.entity.toLowerCase().includes(query) ||
                    log.entityId.toLowerCase().includes(query);
                return matchesAction && matchesBranch && matchesQuery;
            })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    });

    clearFilters(): void {
        this.search.set('');
        this.actionFilter.set(null);
        this.branchFilter.set(null);
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
            case 'LOGIN':
                return 'secondary';
            default:
                return 'secondary';
        }
    }

    formatDate(value: string): string {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '—';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    formatTime(value: string): string {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }

    exportCsv(): void {
        const rows = this.filteredLogs();
        const header = ['Timestamp', 'Actor', 'Role', 'Action', 'Entity', 'Entity ID', 'Detail', 'Branch', 'IP Address'];
        const lines = rows.map((log) => [
            log.createdAt,
            log.actor,
            this.data.roleLabel(log.actorRole),
            log.action,
            log.entity,
            log.entityId,
            log.detail,
            this.data.branchName(log.branchId),
            log.ipAddress
        ]);
        const csv = [header, ...lines]
            .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'library-audit-log.csv';
        link.click();
        URL.revokeObjectURL(url);
        this.msg.add({ severity: 'success', summary: 'CSV exported', detail: `${rows.length} audit entr${rows.length === 1 ? 'y' : 'ies'} exported.` });
    }
}
