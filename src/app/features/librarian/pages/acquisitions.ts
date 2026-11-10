import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { EmptyState } from '@/app/shared/components/empty-state';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatCard } from '@/app/shared/components/stat-card';
import { LibraryDataService } from '@/app/core/services/library-data.service';
import type { AcquisitionStatus } from '@/app/core/models/library.models';

@Component({
    selector: 'app-acquisitions',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, CardModule, DialogModule, InputNumberModule, InputTextModule, SelectModule, TableModule, TagModule, TextareaModule, ToastModule, EmptyState, PageHeader, StatCard],
    providers: [MessageService],
    template: `
        <app-page-header title="Acquisitions" subtitle="Review purchase requests and manage ordered and received titles">
            <p-button label="New Request" icon="pi pi-plus" (onClick)="openCreate()"></p-button>
        </app-page-header>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
            <app-stat-card label="Pending" [value]="countByStatus('PENDING')" context="awaiting review" icon="pi pi-inbox" iconBg="orange"></app-stat-card>
            <app-stat-card label="Approved / Ordered" [value]="approvedOrOrdered()" context="in the acquisition pipeline" icon="pi pi-shopping-cart" iconBg="primary"></app-stat-card>
            <app-stat-card label="Received" [value]="countByStatus('RECEIVED')" context="added to the collection" icon="pi pi-check-circle" iconBg="green"></app-stat-card>
            <app-stat-card label="Estimated Spend" [value]="formatCurrency(estimatedSpend())" context="open requests" icon="pi pi-wallet"></app-stat-card>
        </div>

        <p-card>
            <div class="grid gap-3 lg:grid-cols-3 mb-4">
                <span class="relative block">
                    <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-color"></i>
                    <input pInputText type="text" placeholder="Search title, author or requester" class="w-full pl-10" [ngModel]="search()" (ngModelChange)="search.set($event)" />
                </span>
                <p-select [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)" [options]="statusFilterOptions" optionLabel="label" optionValue="value" placeholder="Status" [showClear]="true" appendTo="body" styleClass="w-full"></p-select>
                <p-select [ngModel]="branchFilter()" (ngModelChange)="branchFilter.set($event)" [options]="branchFilterOptions()" optionLabel="label" optionValue="value" placeholder="Branch" [showClear]="true" appendTo="body" styleClass="w-full"></p-select>
            </div>

            @if (filtered().length === 0) {
                <app-empty-state icon="pi pi-shopping-cart" title="No acquisition requests" message="New purchase requests will appear here." actionLabel="New Request" (action)="openCreate()"></app-empty-state>
            } @else {
                <div class="overflow-x-auto">
                    <p-table [value]="filtered()" dataKey="id" [paginator]="true" [rows]="10" [tableStyle]="{ 'min-width': '76rem' }" styleClass="w-full">
                        <ng-template pTemplate="header">
                            <tr>
                                <th>Title</th>
                                <th>ISBN</th>
                                <th>Branch</th>
                                <th>Requested By</th>
                                <th class="text-right">Estimated Cost</th>
                                <th>Requested</th>
                                <th>Status</th>
                                <th style="width: 12rem">Actions</th>
                            </tr>
                        </ng-template>
                        <ng-template pTemplate="body" let-row>
                            <tr>
                                <td>
                                    <div class="font-medium">{{ row.title }}</div>
                                    <div class="text-xs text-muted-color">{{ row.author }}</div>
                                </td>
                                <td class="text-xs font-mono">{{ row.isbn || '—' }}</td>
                                <td class="text-sm">{{ data.branchName(row.branchId) }}</td>
                                <td class="text-sm">{{ row.requestedBy }}</td>
                                <td class="text-right whitespace-nowrap">{{ formatCurrency(row.estimatedCost) }}</td>
                                <td class="text-sm whitespace-nowrap">{{ formatDate(row.requestedAt) }}</td>
                                <td><p-tag [value]="statusLabel(row.status)" [severity]="statusSeverity(row.status)"></p-tag></td>
                                <td>
                                    @if (row.status === 'PENDING') {
                                        <div class="flex items-center gap-1">
                                            <p-button label="Approve" size="small" severity="success" [outlined]="true" (onClick)="setStatus(row.id, 'APPROVED')"></p-button>
                                            <p-button label="Reject" size="small" severity="danger" [text]="true" (onClick)="setStatus(row.id, 'REJECTED')"></p-button>
                                        </div>
                                    } @else if (row.status === 'APPROVED') {
                                        <p-button label="Mark Ordered" size="small" severity="info" [outlined]="true" (onClick)="setStatus(row.id, 'ORDERED')"></p-button>
                                    } @else if (row.status === 'ORDERED') {
                                        <p-button label="Mark Received" size="small" severity="success" (onClick)="setStatus(row.id, 'RECEIVED')"></p-button>
                                    } @else {
                                        <span class="text-xs text-muted-color">{{ row.reviewedBy || '—' }}</span>
                                    }
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>
                </div>
            }
        </p-card>

        <p-dialog header="New Acquisition Request" [visible]="dialogVisible()" (visibleChange)="dialogVisible.set($event)" [modal]="true" [dismissableMask]="true" [style]="{ width: '620px', 'max-width': '96vw' }">
            <div class="flex flex-col gap-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Title *</label>
                        <input pInputText [ngModel]="title()" (ngModelChange)="title.set($event)" placeholder="Book title" />
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Author</label>
                        <input pInputText [ngModel]="author()" (ngModelChange)="author.set($event)" placeholder="Author" />
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">ISBN</label>
                        <input pInputText [ngModel]="isbn()" (ngModelChange)="isbn.set($event)" placeholder="978-..." />
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Branch *</label>
                        <p-select [ngModel]="branchId()" (ngModelChange)="branchId.set($event)" [options]="branchOptions()" optionLabel="label" optionValue="value" appendTo="body" styleClass="w-full"></p-select>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Requested By *</label>
                        <input pInputText [ngModel]="requestedBy()" (ngModelChange)="requestedBy.set($event)" placeholder="Member or staff name" />
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Estimated Cost</label>
                        <p-inputnumber [ngModel]="estimatedCost()" (ngModelChange)="estimatedCost.set($event ?? 0)" [min]="0" [max]="1000000" [showButtons]="true" styleClass="w-full" inputStyleClass="w-full"></p-inputnumber>
                    </div>
                </div>
                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium">Notes</label>
                    <textarea pTextarea rows="2" [ngModel]="notes()" (ngModelChange)="notes.set($event)" class="w-full" placeholder="Justification or vendor details"></textarea>
                </div>
                <div class="flex justify-end gap-2">
                    <p-button label="Cancel" severity="secondary" [text]="true" (onClick)="dialogVisible.set(false)"></p-button>
                    <p-button label="Create Request" icon="pi pi-save" [disabled]="!title().trim() || !branchId() || !requestedBy().trim()" (onClick)="save()"></p-button>
                </div>
            </div>
        </p-dialog>

        <p-toast></p-toast>
    `
})
export class AcquisitionsPage {
    readonly data = inject(LibraryDataService);
    private readonly msg = inject(MessageService);

    readonly search = signal('');
    readonly statusFilter = signal<AcquisitionStatus | null>(null);
    readonly branchFilter = signal<string | null>(null);

    readonly dialogVisible = signal(false);
    readonly title = signal('');
    readonly author = signal('');
    readonly isbn = signal('');
    readonly branchId = signal<string | null>(null);
    readonly requestedBy = signal('');
    readonly estimatedCost = signal(0);
    readonly notes = signal('');

    readonly statusOptions = [
        { label: 'Pending', value: 'PENDING' as AcquisitionStatus },
        { label: 'Approved', value: 'APPROVED' as AcquisitionStatus },
        { label: 'Rejected', value: 'REJECTED' as AcquisitionStatus },
        { label: 'Ordered', value: 'ORDERED' as AcquisitionStatus },
        { label: 'Received', value: 'RECEIVED' as AcquisitionStatus }
    ];

    readonly statusFilterOptions = [{ label: 'All Statuses', value: null }, ...this.statusOptions];
    readonly branchOptions = computed(() => this.data.branches().map((branch) => ({ label: branch.name, value: branch.id })));
    readonly branchFilterOptions = computed(() => [{ label: 'All Branches', value: null }, ...this.branchOptions()]);

    readonly filtered = computed(() => {
        const query = this.search().trim().toLowerCase();
        const status = this.statusFilter();
        const branchId = this.branchFilter();
        return this.data
            .acquisitions()
            .filter((request) => {
                const matchesStatus = !status || request.status === status;
                const matchesBranch = !branchId || request.branchId === branchId;
                const haystack = `${request.title} ${request.author} ${request.requestedBy}`.toLowerCase();
                return matchesStatus && matchesBranch && (!query || haystack.includes(query));
            })
            .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    });

    countByStatus(status: AcquisitionStatus): number {
        return this.data.acquisitions().filter((request) => request.status === status).length;
    }

    approvedOrOrdered(): number {
        return this.data.acquisitions().filter((request) => request.status === 'APPROVED' || request.status === 'ORDERED').length;
    }

    estimatedSpend(): number {
        return this.data.acquisitions().filter((request) => request.status === 'PENDING' || request.status === 'APPROVED' || request.status === 'ORDERED').reduce((sum, request) => sum + request.estimatedCost, 0);
    }

    openCreate(): void {
        this.title.set('');
        this.author.set('');
        this.isbn.set('');
        this.branchId.set(this.data.activeBranches()[0]?.id ?? null);
        this.requestedBy.set('');
        this.estimatedCost.set(0);
        this.notes.set('');
        this.dialogVisible.set(true);
    }

    save(): void {
        const title = this.title().trim();
        const branchId = this.branchId();
        const requestedBy = this.requestedBy().trim();
        if (!title || !branchId || !requestedBy) return;
        try {
            this.data.createAcquisition({
                title,
                author: this.author().trim(),
                isbn: this.isbn().trim(),
                branchId,
                requestedBy,
                estimatedCost: this.estimatedCost(),
                status: 'PENDING',
                notes: this.notes().trim()
            });
            this.dialogVisible.set(false);
            this.msg.add({ severity: 'success', summary: 'Request created', detail: `${title} was added to acquisitions.` });
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Save failed', detail: this.errorText(error) });
        }
    }

    setStatus(id: string, status: AcquisitionStatus): void {
        try {
            this.data.setAcquisitionStatus(id, status);
            this.msg.add({ severity: 'success', summary: 'Status updated', detail: `Request marked ${status.toLowerCase()}.` });
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Update failed', detail: this.errorText(error) });
        }
    }

    statusLabel(status: AcquisitionStatus): string {
        return status.charAt(0) + status.slice(1).toLowerCase();
    }

    statusSeverity(status: AcquisitionStatus): 'warn' | 'success' | 'danger' | 'info' | 'secondary' {
        switch (status) {
            case 'PENDING':
                return 'warn';
            case 'APPROVED':
            case 'RECEIVED':
                return 'success';
            case 'REJECTED':
                return 'danger';
            case 'ORDERED':
                return 'info';
            default:
                return 'secondary';
        }
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
