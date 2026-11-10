import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { CodeLabel } from '@/app/shared/components/code-label';
import { EmptyState } from '@/app/shared/components/empty-state';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatCard } from '@/app/shared/components/stat-card';
import { LibraryDataService } from '@/app/core/services/library-data.service';
import type { Book, BookCopy, CopyStatus } from '@/app/core/models/library.models';

@Component({
    selector: 'app-staff-catalog',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        ButtonModule,
        CardModule,
        ConfirmDialogModule,
        DialogModule,
        InputTextModule,
        MessageModule,
        SelectModule,
        TableModule,
        TagModule,
        ToastModule,
        TooltipModule,
        CodeLabel,
        EmptyState,
        PageHeader,
        StatCard
    ],
    providers: [ConfirmationService, MessageService],
    template: `
        <app-page-header [title]="'Books & Availability — ' + branchName()" subtitle="Search the catalog, check copy availability, update shelf locations and report copy condition">
            <p-button label="Stock Check" icon="pi pi-box" severity="secondary" [outlined]="true" routerLink="/staff/inventory"></p-button>
        </app-page-header>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
            <app-stat-card label="Titles in Branch" [value]="branchBooks().length" context="catalog records" icon="pi pi-book"></app-stat-card>
            <app-stat-card label="Copies" [value]="branchCopies().length" context="physical copies" icon="pi pi-box" iconBg="primary"></app-stat-card>
            <app-stat-card label="Available" [value]="availableCopies()" context="ready to issue" icon="pi pi-check-circle" iconBg="green"></app-stat-card>
            <app-stat-card label="Damaged / Lost" [value]="issueCopies()" context="needs attention" icon="pi pi-exclamation-triangle" iconBg="red"></app-stat-card>
        </div>

        <p-card>
            <div class="grid gap-3 lg:grid-cols-3 mb-4">
                <span class="relative block lg:col-span-2">
                    <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-color"></i>
                    <input pInputText type="text" placeholder="Search title, author, ISBN or category" class="w-full pl-10" [ngModel]="search()" (ngModelChange)="search.set($event)" />
                </span>
                <p-select [ngModel]="availabilityFilter()" (ngModelChange)="availabilityFilter.set($event)" [options]="availabilityOptions" optionLabel="label" optionValue="value" placeholder="Availability" [showClear]="true" appendTo="body" styleClass="w-full"></p-select>
            </div>

            @if (filteredBooks().length === 0) {
                <app-empty-state icon="pi pi-book" title="No books found" message="No titles match this branch and search." actionLabel="Clear filters" (action)="clearFilters()"></app-empty-state>
            } @else {
                <div class="overflow-x-auto">
                    <p-table [value]="filteredBooks()" dataKey="id" [paginator]="true" [rows]="10" [rowsPerPageOptions]="[10, 25, 50]" [tableStyle]="{ 'min-width': '64rem' }" styleClass="w-full">
                        <ng-template pTemplate="header">
                            <tr>
                                <th>Book</th>
                                <th>ISBN</th>
                                <th>Category</th>
                                <th>Shelf Locations</th>
                                <th class="text-right">Available</th>
                                <th class="text-right">Copies</th>
                                <th style="width: 9rem">Actions</th>
                            </tr>
                        </ng-template>
                        <ng-template pTemplate="body" let-book>
                            <tr>
                                <td>
                                    <div class="font-medium">{{ book.title }}</div>
                                    <div class="text-xs text-muted-color">{{ book.author }}</div>
                                </td>
                                <td class="text-xs font-mono">{{ book.isbn || '—' }}</td>
                                <td class="text-sm">{{ book.category }}</td>
                                <td class="text-xs">{{ shelfLocations(book.id) }}</td>
                                <td class="text-right font-medium">{{ availableFor(book.id) }}</td>
                                <td class="text-right">{{ copiesFor(book.id).length }}</td>
                                <td>
                                    <p-button label="Copies" icon="pi pi-box" size="small" [text]="true" (onClick)="openCopies(book)"></p-button>
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>
                </div>
            }
        </p-card>

        <p-dialog [header]="activeBook()?.title ?? 'Copies'" [visible]="copiesVisible()" (visibleChange)="copiesVisible.set($event)" [modal]="true" [dismissableMask]="true" [style]="{ width: '860px', 'max-width': '96vw' }">
            @if (activeBook(); as book) {
                <div class="flex flex-col gap-3">
                    <p class="text-xs text-muted-color">Copies held at {{ branchName() }}. Shelf and condition changes apply immediately.</p>
                    @if (copies().length === 0) {
                        <app-empty-state icon="pi pi-box" title="No copies at this branch" message="This title has no copies assigned here." />
                    } @else {
                        <div class="overflow-x-auto">
                            <p-table [value]="copies()" dataKey="id" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '46rem' }">
                                <ng-template pTemplate="header">
                                    <tr>
                                        <th>Barcode</th>
                                        <th>Shelf</th>
                                        <th>Condition</th>
                                        <th>Status</th>
                                        <th style="width: 13rem">Actions</th>
                                    </tr>
                                </ng-template>
                                <ng-template pTemplate="body" let-copy>
                                    <tr>
                                        <td class="font-mono text-xs">{{ copy.barcode }}</td>
                                        <td class="text-sm">{{ copy.shelfLocation }}</td>
                                        <td class="text-sm">{{ copy.condition }}</td>
                                        <td><p-tag [value]="copyStatusLabel(copy.status)" [severity]="copyStatusSeverity(copy.status)"></p-tag></td>
                                        <td>
                                            <div class="flex items-center gap-1">
                                                <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" severity="secondary" pTooltip="Edit shelf / condition" tooltipPosition="top" (onClick)="openEditCopy(copy)"></p-button>
                                                <p-button icon="pi pi-qrcode" [rounded]="true" [text]="true" severity="info" pTooltip="Show codes" tooltipPosition="top" (onClick)="openCodes(copy)"></p-button>
                                                @if (copy.status !== 'DAMAGED' && copy.status !== 'LOST') {
                                                    <p-button icon="pi pi-wrench" [rounded]="true" [text]="true" severity="warn" pTooltip="Mark damaged" tooltipPosition="top" (onClick)="markDamaged(copy)"></p-button>
                                                    <p-button icon="pi pi-exclamation-circle" [rounded]="true" [text]="true" severity="danger" pTooltip="Mark lost / missing" tooltipPosition="top" (onClick)="markLost(copy)"></p-button>
                                                } @else {
                                                    <p-button label="Restore" size="small" severity="success" [outlined]="true" (onClick)="restore(copy)"></p-button>
                                                }
                                            </div>
                                        </td>
                                    </tr>
                                </ng-template>
                            </p-table>
                        </div>
                    }
                </div>
            }
        </p-dialog>

        <p-dialog header="Edit Copy" [visible]="copyEditVisible()" (visibleChange)="copyEditVisible.set($event)" [modal]="true" [dismissableMask]="true" [style]="{ width: '460px', 'max-width': '95vw' }">
            @if (editingCopy(); as copy) {
                <div class="flex flex-col gap-4">
                    <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                        <div class="text-xs text-muted-color">Barcode</div>
                        <div class="font-mono text-sm">{{ copy.barcode }}</div>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Shelf Location *</label>
                        <input pInputText [ngModel]="copy.shelfLocation" (ngModelChange)="patchEditingCopy('shelfLocation', $event)" />
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Condition</label>
                        <p-select [ngModel]="copy.condition" (ngModelChange)="patchEditingCopy('condition', $event)" [options]="conditionOptions" optionLabel="label" optionValue="value" appendTo="body" styleClass="w-full"></p-select>
                    </div>
                    <div class="flex justify-end gap-2">
                        <p-button label="Cancel" severity="secondary" [text]="true" (onClick)="copyEditVisible.set(false)"></p-button>
                        <p-button label="Save Copy" icon="pi pi-save" [disabled]="!copy.shelfLocation.trim()" (onClick)="saveCopy()"></p-button>
                    </div>
                </div>
            }
        </p-dialog>

        <p-dialog header="Copy Codes" [visible]="codeVisible()" (visibleChange)="codeVisible.set($event)" [modal]="true" [style]="{ width: '440px', 'max-width': '95vw' }">
            @if (codeCopy(); as copy) {
                <div class="flex flex-col gap-4 items-center">
                    <app-code-label kind="barcode" [value]="copy.barcode" [size]="140"></app-code-label>
                    <app-code-label kind="qr" [value]="data.copyQrPayload(copy)" [size]="120" caption="Scan for copy details"></app-code-label>
                </div>
            }
        </p-dialog>

        <p-toast></p-toast>
        <p-confirmDialog></p-confirmDialog>
    `
})
export class StaffCatalog {
    readonly data = inject(LibraryDataService);
    private readonly confirm = inject(ConfirmationService);
    private readonly msg = inject(MessageService);

    readonly branchId = this.data.assignedBranchId();
    readonly branchName = computed(() => this.data.branches().find((branch) => branch.id === this.branchId)?.name ?? 'All branches');

    readonly search = signal('');
    readonly availabilityFilter = signal<'AVAILABLE' | null>(null);

    readonly copiesVisible = signal(false);
    readonly activeBook = signal<Book | null>(null);
    readonly copyEditVisible = signal(false);
    readonly editingCopy = signal<BookCopy | null>(null);
    readonly codeVisible = signal(false);
    readonly codeCopy = signal<BookCopy | null>(null);

    readonly availabilityOptions = [
        { label: 'All titles', value: null },
        { label: 'Available at this branch', value: 'AVAILABLE' }
    ];

    readonly conditionOptions = [
        { label: 'Good', value: 'GOOD' as const },
        { label: 'Fair', value: 'FAIR' as const },
        { label: 'Damaged', value: 'DAMAGED' as const }
    ];

    readonly branchCopies = computed(() => this.data.bookCopies().filter((copy) => !this.branchId || copy.branchId === this.branchId));
    readonly availableCopies = computed(() => this.branchCopies().filter((copy) => copy.status === 'AVAILABLE').length);
    readonly issueCopies = computed(() => this.branchCopies().filter((copy) => copy.status === 'DAMAGED' || copy.status === 'LOST').length);
    readonly branchBooks = computed(() => this.data.books().filter((book) => book.status === 'ACTIVE' && this.copiesFor(book.id).length > 0));

    readonly filteredBooks = computed(() => {
        const query = this.search().trim().toLowerCase();
        const availability = this.availabilityFilter();
        return this.data
            .books()
            .filter((book) => book.status === 'ACTIVE')
            .filter((book) => {
                const haystack = `${book.title} ${book.author} ${book.isbn} ${book.category}`.toLowerCase();
                const matchesQuery = !query || haystack.includes(query);
                const matchesAvailability = availability !== 'AVAILABLE' || this.availableFor(book.id) > 0;
                return matchesQuery && matchesAvailability;
            })
            .sort((a, b) => a.title.localeCompare(b.title));
    });

    readonly copies = computed(() => {
        const book = this.activeBook();
        return book ? this.copiesFor(book.id) : [];
    });

    copiesFor(bookId: string): BookCopy[] {
        return this.data.bookCopies().filter((copy) => copy.bookId === bookId && (!this.branchId || copy.branchId === this.branchId));
    }

    availableFor(bookId: string): number {
        return this.copiesFor(bookId).filter((copy) => copy.status === 'AVAILABLE').length;
    }

    shelfLocations(bookId: string): string {
        const locations = [...new Set(this.copiesFor(bookId).filter((copy) => copy.status !== 'LOST').map((copy) => copy.shelfLocation))];
        if (locations.length === 0) return '—';
        return locations.slice(0, 2).join(' · ') + (locations.length > 2 ? ` +${locations.length - 2}` : '');
    }

    clearFilters(): void {
        this.search.set('');
        this.availabilityFilter.set(null);
    }

    openCopies(book: Book): void {
        this.activeBook.set(book);
        this.copiesVisible.set(true);
    }

    openEditCopy(copy: BookCopy): void {
        this.editingCopy.set({ ...copy });
        this.copyEditVisible.set(true);
    }

    patchEditingCopy<K extends 'shelfLocation' | 'condition'>(key: K, value: BookCopy[K]): void {
        this.editingCopy.update((current) => (current ? { ...current, [key]: value } : current));
    }

    saveCopy(): void {
        const copy = this.editingCopy();
        if (!copy || !copy.shelfLocation.trim()) return;
        try {
            this.data.updateCopy({ ...copy, shelfLocation: copy.shelfLocation.trim() });
            this.copyEditVisible.set(false);
            this.editingCopy.set(null);
            this.msg.add({ severity: 'success', summary: 'Copy updated', detail: `${copy.barcode} was updated.` });
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Update failed', detail: this.errorText(error) });
        }
    }

    openCodes(copy: BookCopy): void {
        this.codeCopy.set(copy);
        this.codeVisible.set(true);
    }

    markDamaged(copy: BookCopy): void {
        this.confirm.confirm({
            message: `Mark copy ${copy.barcode} as damaged? It will be blocked from circulation.`,
            header: 'Mark Damaged',
            icon: 'pi pi-wrench',
            acceptLabel: 'Mark Damaged',
            rejectLabel: 'Cancel',
            acceptButtonStyleClass: 'p-button-warn',
            accept: () => {
                try {
                    this.data.recordInventory(copy.id, 'DAMAGED', 'Reported by staff at the service desk.');
                    this.msg.add({ severity: 'success', summary: 'Copy marked damaged', detail: copy.barcode });
                } catch (error) {
                    this.msg.add({ severity: 'error', summary: 'Update failed', detail: this.errorText(error) });
                }
            }
        });
    }

    markLost(copy: BookCopy): void {
        this.confirm.confirm({
            message: `Mark copy ${copy.barcode} as lost or missing?`,
            header: 'Mark Lost',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Mark Lost',
            rejectLabel: 'Cancel',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                try {
                    this.data.recordInventory(copy.id, 'MISSING', 'Reported missing by staff.');
                    this.msg.add({ severity: 'success', summary: 'Copy marked lost', detail: copy.barcode });
                } catch (error) {
                    this.msg.add({ severity: 'error', summary: 'Update failed', detail: this.errorText(error) });
                }
            }
        });
    }

    restore(copy: BookCopy): void {
        try {
            this.data.recordInventory(copy.id, 'VERIFIED', 'Restored to circulation by staff.');
            this.data.setCopyStatus(copy.id, 'AVAILABLE');
            this.msg.add({ severity: 'success', summary: 'Copy restored', detail: `${copy.barcode} is available again.` });
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Update failed', detail: this.errorText(error) });
        }
    }

    copyStatusLabel(status: CopyStatus): string {
        return status.charAt(0) + status.slice(1).toLowerCase();
    }

    copyStatusSeverity(status: CopyStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        switch (status) {
            case 'AVAILABLE':
                return 'success';
            case 'ISSUED':
                return 'info';
            case 'RESERVED':
                return 'warn';
            case 'DAMAGED':
            case 'LOST':
                return 'danger';
            default:
                return 'secondary';
        }
    }

    private errorText(error: unknown): string {
        return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
    }
}
