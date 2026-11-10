import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CodeLabel } from '@/app/shared/components/code-label';
import { EmptyState } from '@/app/shared/components/empty-state';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatusTag } from '@/app/shared/components/status-tag';
import { AuthService } from '@/app/core/services/auth.service';
import { LibraryDataService } from '@/app/core/services/library-data.service';

@Component({
    selector: 'app-my-card',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, CardModule, CodeLabel, EmptyState, PageHeader, StatusTag],
    styles: [
        `
            @media print {
                .no-print {
                    display: none !important;
                }

                .print-card {
                    box-shadow: none !important;
                    border: 1px solid #d1d5db !important;
                    break-inside: avoid;
                }

                @page {
                    margin: 12mm;
                }
            }
        `
    ],
    template: `
        <app-page-header class="no-print" title="Digital Membership Card" subtitle="Your paperless library identity — present the QR code at any branch">
            <p-button label="Print Card" icon="pi pi-print" severity="secondary" [outlined]="true" (onClick)="printCard()"></p-button>
            <p-button label="Catalog" icon="pi pi-search" routerLink="/my-library/catalog"></p-button>
        </app-page-header>

        @if (member(); as me) {
            <div class="grid gap-4 xl:grid-cols-3">
                <div class="xl:col-span-2">
                    <div class="print-card rounded-2xl overflow-hidden border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 shadow-md">
                        <div class="bg-primary text-primary-contrast px-6 py-5 flex items-center justify-between gap-3">
                            <div class="flex items-center gap-3">
                                <span class="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
                                    <i class="pi pi-book text-xl"></i>
                                </span>
                                <div>
                                    <div class="text-lg font-semibold leading-tight">{{ data.settings().libraryName }}</div>
                                    <div class="text-xs opacity-80">Digital Library Membership</div>
                                </div>
                            </div>
                            <app-status-tag [status]="me.status"></app-status-tag>
                        </div>

                        <div class="p-6 grid gap-6 sm:grid-cols-3">
                            <div class="sm:col-span-2 flex flex-col gap-4">
                                <div>
                                    <div class="text-xs uppercase tracking-wide text-muted-color">Member</div>
                                    <div class="text-2xl font-bold mt-1">{{ me.firstName }} {{ me.lastName }}</div>
                                    <div class="text-sm text-muted-color">{{ me.department || 'Library member' }}</div>
                                </div>
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <div class="text-xs uppercase tracking-wide text-muted-color">Membership No.</div>
                                        <div class="font-mono text-sm font-medium mt-1">{{ me.membershipNo }}</div>
                                    </div>
                                    <div>
                                        <div class="text-xs uppercase tracking-wide text-muted-color">Member Type</div>
                                        <div class="text-sm font-medium mt-1">{{ me.memberType }}</div>
                                    </div>
                                    <div>
                                        <div class="text-xs uppercase tracking-wide text-muted-color">Home Branch</div>
                                        <div class="text-sm font-medium mt-1">{{ data.branchName(me.branchId) }}</div>
                                    </div>
                                    <div>
                                        <div class="text-xs uppercase tracking-wide text-muted-color">Valid Until</div>
                                        <div class="text-sm font-medium mt-1">{{ formatDate(me.expiresAt) }}</div>
                                    </div>
                                </div>
                                <div class="pt-3 border-t border-surface-200 dark:border-surface-700">
                                    <app-code-label kind="barcode" [value]="me.membershipNo" [size]="130"></app-code-label>
                                </div>
                            </div>

                            <div class="flex flex-col items-center justify-center gap-2">
                                <app-code-label kind="qr" [value]="qrPayload(me.membershipNo, me.memberType, me.branchId)" [size]="132" caption="Scan to verify"></app-code-label>
                            </div>
                        </div>

                        <div class="px-6 py-3 border-t border-surface-200 dark:border-surface-700 text-xs text-muted-color flex flex-wrap gap-x-4 gap-y-1">
                            <span>{{ data.settings().contactEmail }}</span>
                            <span>{{ data.settings().contactPhone }}</span>
                            <span>{{ data.settings().address }}</span>
                        </div>
                    </div>
                </div>

                <p-card>
                    <ng-template pTemplate="header">
                        <div class="px-4 pt-4">
                            <h2 class="text-lg font-semibold">Borrowing Privileges</h2>
                            <p class="text-xs text-muted-color mt-0.5">Rules for your membership type</p>
                        </div>
                    </ng-template>
                    @if (policy(); as rules) {
                        <div class="flex flex-col gap-3">
                            <div class="flex items-center justify-between border-b border-surface-200 dark:border-surface-700 pb-2">
                                <span class="text-sm text-muted-color">Borrow limit</span>
                                <span class="font-semibold">{{ rules.borrowLimit }} books</span>
                            </div>
                            <div class="flex items-center justify-between border-b border-surface-200 dark:border-surface-700 pb-2">
                                <span class="text-sm text-muted-color">Loan period</span>
                                <span class="font-semibold">{{ rules.loanPeriodDays }} days</span>
                            </div>
                            <div class="flex items-center justify-between border-b border-surface-200 dark:border-surface-700 pb-2">
                                <span class="text-sm text-muted-color">Renewals</span>
                                <span class="font-semibold">{{ rules.renewalLimit }} × {{ rules.renewalPeriodDays }} days</span>
                            </div>
                            <div class="flex items-center justify-between border-b border-surface-200 dark:border-surface-700 pb-2">
                                <span class="text-sm text-muted-color">Reservations</span>
                                <span class="font-semibold">{{ rules.reservationLimit }} titles</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-sm text-muted-color">Fine per day</span>
                                <span class="font-semibold">{{ formatCurrency(rules.finePerDay) }}</span>
                            </div>
                        </div>
                    } @else {
                        <p class="text-sm text-muted-color">No borrowing policy is configured for this membership type.</p>
                    }
                    <div class="mt-4 pt-3 border-t border-surface-200 dark:border-surface-700 flex justify-between">
                        <a class="text-primary text-sm font-medium" routerLink="/my-library/profile">Manage profile</a>
                        <a class="text-primary text-sm font-medium" routerLink="/my-library/loans">View loans</a>
                    </div>
                </p-card>
            </div>
        } @else {
            <p-card>
                <app-empty-state icon="pi pi-id-card" title="No membership linked" message="Ask the library administration to link a membership to your account." />
            </p-card>
        }
    `
})
export class MyCard {
    readonly data = inject(LibraryDataService);
    readonly auth = inject(AuthService);

    readonly member = computed(() => this.data.memberForUsername(this.auth.username()));
    readonly policy = computed(() => {
        const me = this.member();
        return me ? this.data.policyFor(me.memberType) : undefined;
    });

    qrPayload(membershipNo: string, type: string, branchId: string): string {
        return `PUL|MEMBER|${membershipNo}|${type}|${branchId}`;
    }

    printCard(): void {
        window.print();
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
