import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { EmptyState } from '@/app/shared/components/empty-state';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatCard } from '@/app/shared/components/stat-card';
import { LibraryDataService } from '@/app/core/services/library-data.service';
import type { FineRecord, FineStatus } from '@/app/core/models/library.models';

@Component({
    selector: 'app-fines',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        CardModule,
        ConfirmDialogModule,
        DialogModule,
        InputNumberModule,
        InputTextModule,
        MessageModule,
        SelectModule,
        TableModule,
        TagModule,
        ToastModule,
        TooltipModule,
        EmptyState,
        PageHeader,
        StatCard
    ],
    providers: [ConfirmationService, MessageService],
    template: `
        <app-page-header title="Fines & Payments" subtitle="Manage overdue charges, record payments and approve waivers">
            <p-button label="Add Fine" icon="pi pi-plus" (onClick)="openAddFine()"></p-button>
        </app-page-header>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
            <app-stat-card label="Unpaid Fines" [value]="formatCurrency(unpaidTotal())" [context]="unpaidCount() + ' open records'" icon="pi pi-wallet" iconBg="red"></app-stat-card>
            <app-stat-card label="Collected" [value]="formatCurrency(paidTotal())" context="settled payments" icon="pi pi-check-circle" iconBg="green"></app-stat-card>
            <app-stat-card label="Waived" [value]="formatCurrency(waivedTotal())" context="approved waivers" icon="pi pi-undo" iconBg="primary"></app-stat-card>
            <app-stat-card label="Members with Fines" [value]="membersWithFines()" context="outstanding balances" icon="pi pi-users" iconBg="orange"></app-stat-card>
        </div>

        <p-card>
            <div class="grid gap-3 lg:grid-cols-3 mb-4">
                <span class="relative block">
                    <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-color"></i>
                    <input pInputText type="text" placeholder="Search member or reason" class="w-full pl-10" [ngModel]="search()" (ngModelChange)="search.set($event)" />
                </span>
                <p-select [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)" [options]="statusFilterOptions" optionLabel="label" optionValue="value" placeholder="Status" [showClear]="true" appendTo="body" styleClass="w-full"></p-select>
                <p-select [ngModel]="memberFilter()" (ngModelChange)="memberFilter.set($event)" [options]="memberFilterOptions()" optionLabel="label" optionValue="value" placeholder="Member" [showClear]="true" [filter]="true" appendTo="body" styleClass="w-full"></p-select>
            </div>

            @if (filteredFines().length === 0) {
                <app-empty-state icon="pi pi-wallet" title="No fines found" message="No fine records match the current filters." actionLabel="Clear filters" (action)="clearFilters()"></app-empty-state>
            } @else {
                <div class="overflow-x-auto">
                    <p-table [value]="filteredFines()" dataKey="id" [paginator]="true" [rows]="10" [tableStyle]="{ 'min-width': '66rem' }" styleClass="w-full">
                        <ng-template pTemplate="header">
                            <tr>
                                <th>Member</th>
                                <th>Reason</th>
                                <th class="text-right">Amount</th>
                                <th>Issued</th>
                                <th>Status</th>
                                <th>Settled</th>
                                <th style="width: 10rem">Actions</th>
                            </tr>
                        </ng-template>
                        <ng-template pTemplate="body" let-row>
                            <tr>
                                <td>
                                    <div class="font-medium">{{ data.memberName(row.memberId) }}</div>
                                    <div class="text-xs text-muted-color">{{ memberNo(row.memberId) }}</div>
                                </td>
                                <td class="text-sm max-w-[22rem]">{{ row.reason }}</td>
                                <td class="text-right font-medium whitespace-nowrap">{{ formatCurrency(row.amount) }}</td>
                                <td class="text-sm whitespace-nowrap">{{ formatDate(row.issuedAt) }}</td>
                                <td><p-tag [value]="statusLabel(row.status)" [severity]="statusSeverity(row.status)"></p-tag></td>
                                <td class="text-sm">
                                    @if (row.settledAt) {
                                        <div>{{ row.settledBy }}</div>
                                        <div class="text-xs text-muted-color">{{ formatDate(row.settledAt) }}</div>
                                    } @else {
                                        <span class="text-muted-color">—</span>
                                    }
                                </td>
                                <td>
                                    @if (row.status === 'UNPAID') {
                                        <div class="flex items-center gap-1">
                                            <p-button label="Pay" size="small" severity="success" [outlined]="true" (onClick)="pay(row)"></p-button>
                                            <p-button label="Waive" size="small" severity="warn" [text]="true" (onClick)="waive(row)"></p-button>
                                        </div>
                                    } @else {
                                        <span class="text-xs text-muted-color">{{ row.note || '—' }}</span>
                                    }
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>
                </div>
            }
        </p-card>

        <p-dialog header="Add Fine" [visible]="dialogVisible()" (visibleChange)="dialogVisible.set($event)" [modal]="true" [dismissableMask]="true" [style]="{ width: '520px', 'max-width': '95vw' }" (onHide)="closeDialog()">
            <div class="flex flex-col gap-4">
                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium">Member *</label>
                    <p-select [ngModel]="fineMemberId()" (ngModelChange)="fineMemberId.set($event)" [options]="memberOptions()" optionLabel="label" optionValue="value" placeholder="Select a member" [filter]="true" filterBy="label" appendTo="body" styleClass="w-full"></p-select>
                </div>
                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium">Amount *</label>
                    <p-inputnumber [ngModel]="fineAmount()" (ngModelChange)="fineAmount.set($event ?? 0)" [min]="0" [max]="100000" [showButtons]="true" styleClass="w-full" inputStyleClass="w-full"></p-inputnumber>
                </div>
                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium">Reason *</label>
                    <input pInputText [ngModel]="fineReason()" (ngModelChange)="fineReason.set($event)" placeholder="e.g. Damaged book charge" />
                </div>
                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium">Note</label>
                    <input pInputText [ngModel]="fineNote()" (ngModelChange)="fineNote.set($event)" placeholder="Optional internal note" />
                </div>
                <div class="flex justify-end gap-2">
                    <p-button label="Cancel" severity="secondary" [text]="true" (onClick)="closeDialog()"></p-button>
                    <p-button label="Add Fine" icon="pi pi-save" [disabled]="!fineMemberId() || !fineReason().trim() || fineAmount() <= 0" (onClick)="saveFine()"></p-button>
                </div>
            </div>
        </p-dialog>

        <p-toast></p-toast>
        <p-confirmDialog></p-confirmDialog>
    `
})
export class FinesPage {
    readonly data = inject(LibraryDataService);
    private readonly confirm = inject(ConfirmationService);
    private readonly msg = inject(MessageService);

    readonly search = signal('');
    readonly statusFilter = signal<FineStatus | null>(null);
    readonly memberFilter = signal<string | null>(null);

    readonly dialogVisible = signal(false);
    readonly fineMemberId = signal<string | null>(null);
    readonly fineAmount = signal(0);
    readonly fineReason = signal('');
    readonly fineNote = signal('');

    readonly statusFilterOptions = [
        { label: 'All Statuses', value: null },
        { label: 'Unpaid', value: 'UNPAID' },
        { label: 'Paid', value: 'PAID' },
        { label: 'Waived', value: 'WAIVED' }
    ];

    readonly memberOptions = computed(() =>
        this.data
            .members()
            .map((member) => ({ label: `${member.firstName} ${member.lastName} — ${member.membershipNo}`, value: member.id }))
            .sort((a, b) => a.label.localeCompare(b.label))
    );

    readonly memberFilterOptions = computed(() => [{ label: 'All Members', value: null }, ...this.memberOptions()]);

    readonly unpaidTotal = computed(() => this.data.fines().filter((fine) => fine.status === 'UNPAID').reduce((sum, fine) => sum + fine.amount, 0));
    readonly paidTotal = computed(() => this.data.fines().filter((fine) => fine.status === 'PAID').reduce((sum, fine) => sum + fine.amount, 0));
    readonly waivedTotal = computed(() => this.data.fines().filter((fine) => fine.status === 'WAIVED').reduce((sum, fine) => sum + fine.amount, 0));
    readonly unpaidCount = computed(() => this.data.fines().filter((fine) => fine.status === 'UNPAID').length);
    readonly membersWithFines = computed(() => new Set(this.data.fines().filter((fine) => fine.status === 'UNPAID').map((fine) => fine.memberId)).size);

    readonly filteredFines = computed(() => {
        const query = this.search().trim().toLowerCase();
        const status = this.statusFilter();
        const memberId = this.memberFilter();
        return this.data
            .fines()
            .filter((fine) => {
                const matchesStatus = !status || fine.status === status;
                const matchesMember = !memberId || fine.memberId === memberId;
                const haystack = `${this.data.memberName(fine.memberId)} ${fine.reason}`.toLowerCase();
                return matchesStatus && matchesMember && (!query || haystack.includes(query));
            })
            .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());
    });

    clearFilters(): void {
        this.search.set('');
        this.statusFilter.set(null);
        this.memberFilter.set(null);
    }

    openAddFine(): void {
        this.fineMemberId.set(null);
        this.fineAmount.set(0);
        this.fineReason.set('');
        this.fineNote.set('');
        this.dialogVisible.set(true);
    }

    closeDialog(): void {
        this.dialogVisible.set(false);
    }

    saveFine(): void {
        const memberId = this.fineMemberId();
        const amount = this.fineAmount();
        const reason = this.fineReason().trim();
        if (!memberId || !reason || amount <= 0) return;
        try {
            this.data.addFine(memberId, amount, reason, null, this.fineNote());
            this.msg.add({ severity: 'success', summary: 'Fine added', detail: `${this.formatCurrency(amount)} charged to ${this.data.memberName(memberId)}.` });
            this.closeDialog();
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Save failed', detail: this.errorText(error) });
        }
    }

    pay(fine: FineRecord): void {
        try {
            this.data.payFine(fine.id);
            this.msg.add({ severity: 'success', summary: 'Payment recorded', detail: `${this.formatCurrency(fine.amount)} marked as paid.` });
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Payment failed', detail: this.errorText(error) });
        }
    }

    waive(fine: FineRecord): void {
        this.confirm.confirm({
            message: `Waive ${this.formatCurrency(fine.amount)} for ${this.data.memberName(fine.memberId)}?`,
            header: 'Waive Fine',
            icon: 'pi pi-undo',
            acceptLabel: 'Waive',
            rejectLabel: 'Cancel',
            acceptButtonStyleClass: 'p-button-warn',
            accept: () => {
                try {
                    this.data.waiveFine(fine.id, 'Waived by library administrator.');
                    this.msg.add({ severity: 'success', summary: 'Fine waived', detail: 'The fine was waived.' });
                } catch (error) {
                    this.msg.add({ severity: 'error', summary: 'Waiver failed', detail: this.errorText(error) });
                }
            }
        });
    }

    statusLabel(status: FineStatus): string {
        return status === 'UNPAID' ? 'Unpaid' : status === 'PAID' ? 'Paid' : 'Waived';
    }

    statusSeverity(status: FineStatus): 'danger' | 'success' | 'info' {
        return status === 'UNPAID' ? 'danger' : status === 'PAID' ? 'success' : 'info';
    }

    memberNo(memberId: string): string {
        return this.data.members().find((member) => member.id === memberId)?.membershipNo ?? '';
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
