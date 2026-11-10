import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { EmptyState } from '@/app/shared/components/empty-state';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatCard } from '@/app/shared/components/stat-card';
import { AuthService } from '@/app/core/services/auth.service';
import { LibraryDataService } from '@/app/core/services/library-data.service';
import type { FineRecord, FineStatus } from '@/app/core/models/library.models';

@Component({
    selector: 'app-my-fines',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, CardModule, MessageModule, TableModule, TagModule, EmptyState, PageHeader, StatCard],
    template: `
        <app-page-header title="My Fines" subtitle="Review overdue charges, payment status and waiver history">
            <p-button label="My Loans" icon="pi pi-send" severity="secondary" [outlined]="true" routerLink="/my-library/loans"></p-button>
        </app-page-header>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
            <app-stat-card label="Outstanding" [value]="formatCurrency(unpaidTotal())" [context]="unpaidCount() + ' open charge(s)'" icon="pi pi-wallet" iconBg="red"></app-stat-card>
            <app-stat-card label="Total Fined" [value]="formatCurrency(totalFined())" context="all fine records" icon="pi pi-list" iconBg="primary"></app-stat-card>
            <app-stat-card label="Paid" [value]="formatCurrency(paidTotal())" context="settled at the desk" icon="pi pi-check-circle" iconBg="green"></app-stat-card>
            <app-stat-card label="Waived" [value]="formatCurrency(waivedTotal())" context="approved waivers" icon="pi pi-undo" iconBg="primary"></app-stat-card>
        </div>

        <p-card>
            @if (rows().length === 0) {
                <app-empty-state icon="pi pi-wallet" title="No fines" message="You have no library fines on record." />
            } @else {
                <div class="overflow-x-auto">
                    <p-table [value]="rows()" dataKey="id" [paginator]="true" [rows]="10" [tableStyle]="{ 'min-width': '52rem' }" styleClass="w-full">
                        <ng-template pTemplate="header">
                            <tr>
                                <th>Reason</th>
                                <th class="text-right">Amount</th>
                                <th>Issued</th>
                                <th>Status</th>
                                <th>Settled</th>
                                <th>Note</th>
                            </tr>
                        </ng-template>
                        <ng-template pTemplate="body" let-row>
                            <tr>
                                <td class="font-medium">{{ row.reason }}</td>
                                <td class="text-right font-medium whitespace-nowrap">{{ formatCurrency(row.amount) }}</td>
                                <td class="text-sm whitespace-nowrap">{{ formatDate(row.issuedAt) }}</td>
                                <td><p-tag [value]="statusLabel(row.status)" [severity]="statusSeverity(row.status)"></p-tag></td>
                                <td class="text-sm">
                                    @if (row.settledAt) {
                                        <div>{{ formatDate(row.settledAt) }}</div>
                                        <div class="text-xs text-muted-color">{{ row.settledBy }}</div>
                                    } @else {
                                        <span class="text-muted-color">—</span>
                                    }
                                </td>
                                <td class="text-sm max-w-[20rem]">{{ row.note || '—' }}</td>
                            </tr>
                        </ng-template>
                    </p-table>
                </div>
                <p-message severity="info" icon="pi pi-info-circle" styleClass="w-full mt-4">
                    Outstanding fines can be paid at the library circulation desk. Waivers require library administrator approval.
                </p-message>
            }
        </p-card>

        @if (policy(); as rules) {
            <p-card styleClass="mt-4">
                <ng-template pTemplate="header">
                    <div class="px-4 pt-4">
                        <h2 class="text-lg font-semibold">Your Fine Rates</h2>
                        <p class="text-xs text-muted-color mt-0.5">Based on your {{ rules.memberType.toLowerCase() }} membership</p>
                    </div>
                </ng-template>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                        <div class="text-xs text-muted-color">Fine per day</div>
                        <div class="text-lg font-semibold mt-1">{{ formatCurrency(rules.finePerDay) }}</div>
                    </div>
                    <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                        <div class="text-xs text-muted-color">Maximum fine</div>
                        <div class="text-lg font-semibold mt-1">{{ formatCurrency(rules.maxFine) }}</div>
                    </div>
                    <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                        <div class="text-xs text-muted-color">Grace period</div>
                        <div class="text-lg font-semibold mt-1">{{ rules.gracePeriodDays }} day(s)</div>
                    </div>
                    <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                        <div class="text-xs text-muted-color">Lost book charge</div>
                        <div class="text-lg font-semibold mt-1">{{ formatCurrency(rules.lostBookCharge) }}</div>
                    </div>
                </div>
            </p-card>
        }
    `
})
export class MyFines {
    readonly data = inject(LibraryDataService);
    readonly auth = inject(AuthService);

    readonly member = computed(() => this.data.memberForUsername(this.auth.username()));
    readonly rows = computed<FineRecord[]>(() => {
        const me = this.member();
        return me ? this.data.fines().filter((fine) => fine.memberId === me.id).sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()) : [];
    });

    readonly policy = computed(() => {
        const me = this.member();
        return me ? this.data.policyFor(me.memberType) : undefined;
    });

    readonly unpaidTotal = computed(() => this.rows().filter((fine) => fine.status === 'UNPAID').reduce((sum, fine) => sum + fine.amount, 0));
    readonly unpaidCount = computed(() => this.rows().filter((fine) => fine.status === 'UNPAID').length);
    readonly totalFined = computed(() => this.rows().reduce((sum, fine) => sum + fine.amount, 0));
    readonly paidTotal = computed(() => this.rows().filter((fine) => fine.status === 'PAID').reduce((sum, fine) => sum + fine.amount, 0));
    readonly waivedTotal = computed(() => this.rows().filter((fine) => fine.status === 'WAIVED').reduce((sum, fine) => sum + fine.amount, 0));

    statusLabel(status: FineStatus): string {
        return status === 'UNPAID' ? 'Unpaid' : status === 'PAID' ? 'Paid' : 'Waived';
    }

    statusSeverity(status: FineStatus): 'danger' | 'success' | 'info' {
        return status === 'UNPAID' ? 'danger' : status === 'PAID' ? 'success' : 'info';
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
