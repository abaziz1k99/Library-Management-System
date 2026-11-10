import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
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
import type { InventoryRecord, InventoryStatus } from '@/app/core/models/library.models';

@Component({
    selector: 'app-staff-inventory',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, ButtonModule, CardModule, InputTextModule, SelectModule, TableModule, TagModule, ToastModule, EmptyState, PageHeader, StatCard],
    providers: [MessageService],
    template: `
        <app-page-header [title]="'Inventory — ' + branchName()" subtitle="Verify physical copies, record missing or damaged items and resolve stock exceptions">
            <p-button label="Books & Availability" icon="pi pi-book" severity="secondary" [outlined]="true" routerLink="/staff/catalog"></p-button>
        </app-page-header>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
            <app-stat-card label="Copies" [value]="branchCopies().length" context="at this branch" icon="pi pi-box"></app-stat-card>
            <app-stat-card label="In Circulation" [value]="verifiedCount()" context="available or issued" icon="pi pi-check-circle" iconBg="green"></app-stat-card>
            <app-stat-card label="Missing" [value]="missingCount()" context="not found on shelf" icon="pi pi-exclamation-circle" iconBg="red"></app-stat-card>
            <app-stat-card label="Damaged" [value]="damagedCount()" context="needs repair" icon="pi pi-wrench" iconBg="orange"></app-stat-card>
        </div>

        <div class="grid gap-4 xl:grid-cols-3">
            <p-card>
                <ng-template pTemplate="header">
                    <div class="px-4 pt-4">
                        <h2 class="text-lg font-semibold">Record Stock Check</h2>
                        <p class="text-xs text-muted-color mt-0.5">Scan or select a copy at your branch.</p>
                    </div>
                </ng-template>
                <div class="flex flex-col gap-3">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Book Copy *</label>
                        <p-select [ngModel]="selectedCopyId()" (ngModelChange)="selectedCopyId.set($event)" [options]="copyOptions()" optionLabel="label" optionValue="value" placeholder="Select a copy" [filter]="true" filterBy="label" appendTo="body" styleClass="w-full"></p-select>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Result *</label>
                        <p-select [ngModel]="checkStatus()" (ngModelChange)="checkStatus.set($event)" [options]="statusOptions" optionLabel="label" optionValue="value" appendTo="body" styleClass="w-full"></p-select>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Notes</label>
                        <input pInputText [ngModel]="checkNotes()" (ngModelChange)="checkNotes.set($event)" placeholder="Shelf, damage or adjustment details" />
                    </div>
                    <p-button label="Record Check" icon="pi pi-check" [disabled]="!selectedCopyId()" (onClick)="record()"></p-button>
                </div>
            </p-card>

            <p-card styleClass="xl:col-span-2">
                <ng-template pTemplate="header">
                    <div class="flex items-center justify-between gap-3 px-4 pt-4">
                        <div>
                            <h2 class="text-lg font-semibold">Open Exceptions</h2>
                            <p class="text-xs text-muted-color mt-0.5">Missing and damaged copies at your branch</p>
                        </div>
                        <p-tag [value]="openIssues().length + ' open'" severity="warn"></p-tag>
                    </div>
                </ng-template>
                @if (openIssues().length === 0) {
                    <app-empty-state icon="pi pi-check-circle" title="No open exceptions" message="All recent stock checks are clean." />
                } @else {
                    <div class="overflow-x-auto">
                        <p-table [value]="openIssues()" dataKey="id" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '40rem' }">
                            <ng-template pTemplate="header">
                                <tr>
                                    <th>Copy</th>
                                    <th>Book</th>
                                    <th>Issue</th>
                                    <th>Checked</th>
                                    <th style="width: 7rem">Action</th>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="body" let-row>
                                <tr>
                                    <td class="font-mono text-xs">{{ copyBarcode(row.copyId) }}</td>
                                    <td class="text-sm">{{ data.bookTitle(row.bookId) }}</td>
                                    <td><p-tag [value]="statusLabel(row.status)" [severity]="statusSeverity(row.status)"></p-tag></td>
                                    <td class="text-sm whitespace-nowrap">{{ formatDate(row.checkedAt) }}</td>
                                    <td><p-button label="Resolve" size="small" severity="success" [outlined]="true" (onClick)="resolve(row.id)"></p-button></td>
                                </tr>
                            </ng-template>
                        </p-table>
                    </div>
                }
            </p-card>
        </div>

        <p-card styleClass="mt-4">
            <ng-template pTemplate="header">
                <div class="px-4 pt-4">
                    <h2 class="text-lg font-semibold">Stock Check History</h2>
                    <p class="text-xs text-muted-color mt-0.5">Recent checks at your branch</p>
                </div>
            </ng-template>
            @if (records().length === 0) {
                <app-empty-state icon="pi pi-history" title="No stock checks" message="Record a check to start the history." />
            } @else {
                <div class="overflow-x-auto">
                    <p-table [value]="records()" dataKey="id" [paginator]="true" [rows]="10" [tableStyle]="{ 'min-width': '52rem' }" styleClass="w-full">
                        <ng-template pTemplate="header">
                            <tr>
                                <th>Copy</th>
                                <th>Book</th>
                                <th>Result</th>
                                <th>Checked By</th>
                                <th>Checked</th>
                                <th>Notes</th>
                            </tr>
                        </ng-template>
                        <ng-template pTemplate="body" let-row>
                            <tr>
                                <td class="font-mono text-xs">{{ copyBarcode(row.copyId) }}</td>
                                <td class="text-sm">{{ data.bookTitle(row.bookId) }}</td>
                                <td><p-tag [value]="statusLabel(row.status)" [severity]="statusSeverity(row.status)"></p-tag></td>
                                <td class="text-sm">{{ row.checkedBy }}</td>
                                <td class="text-sm whitespace-nowrap">{{ formatDate(row.checkedAt) }}</td>
                                <td class="text-sm max-w-[20rem]">{{ row.notes || '—' }}</td>
                            </tr>
                        </ng-template>
                    </p-table>
                </div>
            }
        </p-card>

        <p-toast></p-toast>
    `
})
export class StaffInventory {
    readonly data = inject(LibraryDataService);
    private readonly msg = inject(MessageService);

    readonly branchId = this.data.assignedBranchId();
    readonly branchName = computed(() => this.data.branches().find((branch) => branch.id === this.branchId)?.name ?? 'All branches');

    readonly selectedCopyId = signal<string | null>(null);
    readonly checkStatus = signal<InventoryStatus>('VERIFIED');
    readonly checkNotes = signal('');

    readonly statusOptions = [
        { label: 'Verified — present and in good condition', value: 'VERIFIED' as InventoryStatus },
        { label: 'Missing — not found on shelf', value: 'MISSING' as InventoryStatus },
        { label: 'Damaged — needs repair', value: 'DAMAGED' as InventoryStatus },
        { label: 'Adjusted — shelf location corrected', value: 'ADJUSTED' as InventoryStatus }
    ];

    readonly branchCopies = computed(() => this.data.bookCopies().filter((copy) => !this.branchId || copy.branchId === this.branchId));

    readonly copyOptions = computed(() =>
        this.branchCopies()
            .map((copy) => ({
                label: `${copy.barcode} — ${this.data.bookTitle(copy.bookId)} (${copy.shelfLocation})`,
                value: copy.id
            }))
            .sort((a, b) => a.label.localeCompare(b.label))
    );

    readonly verifiedCount = computed(() => this.branchCopies().filter((copy) => copy.status === 'AVAILABLE' || copy.status === 'ISSUED' || copy.status === 'RESERVED').length);
    readonly missingCount = computed(() => this.branchCopies().filter((copy) => copy.status === 'LOST').length);
    readonly damagedCount = computed(() => this.branchCopies().filter((copy) => copy.status === 'DAMAGED').length);

    readonly branchRecords = computed<InventoryRecord[]>(() => this.data.inventoryRecords().filter((record) => !this.branchId || record.branchId === this.branchId));

    readonly openIssues = computed(() => {
        const latest = new Map<string, InventoryRecord>();
        for (const record of this.branchRecords()) {
            const current = latest.get(record.copyId);
            if (!current || new Date(record.checkedAt).getTime() > new Date(current.checkedAt).getTime()) {
                latest.set(record.copyId, record);
            }
        }
        return [...latest.values()]
            .filter((record) => record.status === 'MISSING' || record.status === 'DAMAGED')
            .sort((a, b) => new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime());
    });

    readonly records = computed(() => [...this.branchRecords()].sort((a, b) => new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime()));

    record(): void {
        const copyId = this.selectedCopyId();
        if (!copyId) return;
        try {
            this.data.recordInventory(copyId, this.checkStatus(), this.checkNotes());
            this.msg.add({ severity: 'success', summary: 'Stock check recorded', detail: `Copy ${this.copyBarcode(copyId)} marked ${this.checkStatus().toLowerCase()}.` });
            this.selectedCopyId.set(null);
            this.checkNotes.set('');
            this.checkStatus.set('VERIFIED');
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Check failed', detail: this.errorText(error) });
        }
    }

    resolve(recordId: string): void {
        try {
            this.data.resolveInventoryIssue(recordId);
            this.msg.add({ severity: 'success', summary: 'Exception resolved', detail: 'The copy was recorded as verified.' });
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Update failed', detail: this.errorText(error) });
        }
    }

    copyBarcode(copyId: string): string {
        return this.data.bookCopies().find((copy) => copy.id === copyId)?.barcode ?? copyId;
    }

    statusLabel(status: InventoryStatus): string {
        return status.charAt(0) + status.slice(1).toLowerCase();
    }

    statusSeverity(status: InventoryStatus): 'success' | 'danger' | 'warn' | 'info' {
        return status === 'VERIFIED' ? 'success' : status === 'MISSING' ? 'danger' : status === 'DAMAGED' ? 'warn' : 'info';
    }

    formatDate(value: string): string {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '—';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    private errorText(error: unknown): string {
        return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
    }
}
