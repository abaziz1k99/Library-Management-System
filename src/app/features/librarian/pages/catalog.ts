import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { CodeLabel } from '@/app/shared/components/code-label';
import { EmptyState } from '@/app/shared/components/empty-state';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatCard } from '@/app/shared/components/stat-card';
import { LibraryDataService } from '@/app/core/services/library-data.service';
import type { Book, BookCopy, CopyStatus } from '@/app/core/models/library.models';

interface BookFormValue {
    title: string;
    author: string;
    isbn: string;
    category: string;
    publisher: string;
    publishedYear: number;
    language: string;
    edition: string;
    description: string;
    status: 'ACTIVE' | 'ARCHIVED';
}

@Component({
    selector: 'app-catalog',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
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
        TextareaModule,
        ToastModule,
        TooltipModule,
        CodeLabel,
        EmptyState,
        PageHeader,
        StatCard
    ],
    providers: [ConfirmationService, MessageService],
    template: `
        <app-page-header title="Books & Copies" subtitle="Manage the catalog, individual copies, ISBN details, shelf locations and identification codes">
            <p-button label="Add Book" icon="pi pi-plus" (onClick)="openCreateBook()"></p-button>
        </app-page-header>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
            <app-stat-card label="Catalog Titles" [value]="data.books().length" [context]="activeCount() + ' active records'" icon="pi pi-book"></app-stat-card>
            <app-stat-card label="Physical Copies" [value]="data.bookCopies().length" context="across all branches" icon="pi pi-box" iconBg="primary"></app-stat-card>
            <app-stat-card label="Available" [value]="availableCount()" context="ready to issue" icon="pi pi-check-circle" iconBg="green"></app-stat-card>
            <app-stat-card label="Lost / Damaged" [value]="damagedCount()" context="needs replacement" icon="pi pi-exclamation-triangle" iconBg="red"></app-stat-card>
        </div>

        <p-card>
            <div class="grid gap-3 lg:grid-cols-4 mb-4">
                <span class="relative block lg:col-span-2">
                    <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-color"></i>
                    <input pInputText type="text" placeholder="Search title, author, ISBN or category" class="w-full pl-10" [ngModel]="search()" (ngModelChange)="search.set($event)" />
                </span>
                <p-select [ngModel]="categoryFilter()" (ngModelChange)="categoryFilter.set($event)" [options]="categoryFilterOptions()" optionLabel="label" optionValue="value" placeholder="Category" [showClear]="true" appendTo="body" styleClass="w-full"></p-select>
                <p-select [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)" [options]="statusFilterOptions" optionLabel="label" optionValue="value" placeholder="Status" [showClear]="true" appendTo="body" styleClass="w-full"></p-select>
            </div>

            @if (filteredBooks().length === 0) {
                <app-empty-state icon="pi pi-book" title="No books found" message="Add a book or adjust the filters to see the catalog." actionLabel="Add Book" (action)="openCreateBook()"></app-empty-state>
            } @else {
                <div class="overflow-x-auto">
                    <p-table [value]="filteredBooks()" dataKey="id" [paginator]="true" [rows]="10" [rowsPerPageOptions]="[10, 25, 50]" [tableStyle]="{ 'min-width': '70rem' }" styleClass="w-full">
                        <ng-template pTemplate="header">
                            <tr>
                                <th>Book</th>
                                <th>ISBN</th>
                                <th>Category</th>
                                <th class="text-right">Copies</th>
                                <th>Status</th>
                                <th style="width: 13rem">Actions</th>
                            </tr>
                        </ng-template>
                        <ng-template pTemplate="body" let-row>
                            <tr>
                                <td>
                                    <div class="font-medium">{{ row.title }}</div>
                                    <div class="text-xs text-muted-color">{{ row.author }} · {{ row.edition }}</div>
                                </td>
                                <td class="text-xs font-mono">{{ row.isbn || '—' }}</td>
                                <td class="text-sm">{{ row.category }}</td>
                                <td class="text-right text-sm">
                                    <div class="font-medium">{{ data.copyAvailability(row.id) }} available</div>
                                    <div class="text-xs text-muted-color">{{ data.copiesFor(row.id).length }} total</div>
                                </td>
                                <td><p-tag [value]="row.status === 'ACTIVE' ? 'Active' : 'Archived'" [severity]="row.status === 'ACTIVE' ? 'success' : 'secondary'"></p-tag></td>
                                <td>
                                    <div class="flex items-center gap-1">
                                        <p-button label="Copies" icon="pi pi-box" size="small" [text]="true" (onClick)="openCopies(row)"></p-button>
                                        <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" severity="secondary" pTooltip="Edit book" tooltipPosition="top" (onClick)="openEditBook(row)"></p-button>
                                        <p-button
                                            [icon]="row.status === 'ACTIVE' ? 'pi pi-inbox' : 'pi pi-replay'"
                                            [rounded]="true"
                                            [text]="true"
                                            [severity]="row.status === 'ACTIVE' ? 'warn' : 'success'"
                                            [pTooltip]="row.status === 'ACTIVE' ? 'Archive book' : 'Restore book'"
                                            tooltipPosition="top"
                                            (onClick)="toggleBook(row)"
                                        ></p-button>
                                    </div>
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>
                </div>
            }
        </p-card>

        <p-dialog
            [header]="editingBook() ? 'Edit Book' : 'Add Book'"
            [visible]="bookDialogVisible()"
            (visibleChange)="bookDialogVisible.set($event)"
            [modal]="true"
            [dismissableMask]="true"
            [style]="{ width: '720px', 'max-width': '96vw' }"
            (onHide)="closeBookDialog()"
        >
            <form [formGroup]="form" (ngSubmit)="saveBook()" class="flex flex-col gap-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium" for="bookTitle">Title *</label>
                        <input pInputText id="bookTitle" formControlName="title" placeholder="Book title" />
                        @if (form.controls.title.touched && form.controls.title.invalid) {
                            <small class="text-red-500">Title is required.</small>
                        }
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium" for="bookAuthor">Author *</label>
                        <input pInputText id="bookAuthor" formControlName="author" placeholder="Author" />
                        @if (form.controls.author.touched && form.controls.author.invalid) {
                            <small class="text-red-500">Author is required.</small>
                        }
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium" for="bookIsbn">ISBN</label>
                        <input pInputText id="bookIsbn" formControlName="isbn" placeholder="978-..." />
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Category *</label>
                        <p-select formControlName="category" [options]="categoryOptions" optionLabel="label" optionValue="value" appendTo="body" styleClass="w-full"></p-select>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium" for="bookPublisher">Publisher</label>
                        <input pInputText id="bookPublisher" formControlName="publisher" placeholder="Publisher" />
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium" for="bookEdition">Edition</label>
                        <input pInputText id="bookEdition" formControlName="edition" placeholder="e.g. 4th Edition" />
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Published Year</label>
                        <p-inputnumber formControlName="publishedYear" [min]="0" [max]="2100" [showButtons]="true" styleClass="w-full" inputStyleClass="w-full"></p-inputnumber>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Language</label>
                        <p-select formControlName="language" [options]="languageOptions" optionLabel="label" optionValue="value" appendTo="body" styleClass="w-full"></p-select>
                    </div>
                </div>
                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium" for="bookDescription">Description</label>
                    <textarea id="bookDescription" pTextarea rows="3" formControlName="description" class="w-full" placeholder="Summary for the catalog"></textarea>
                </div>
                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium">Status</label>
                    <p-select formControlName="status" [options]="bookStatusOptions" optionLabel="label" optionValue="value" appendTo="body" styleClass="w-full"></p-select>
                </div>
                <div class="flex justify-end gap-2 pt-2">
                    <p-button label="Cancel" severity="secondary" [text]="true" (onClick)="closeBookDialog()"></p-button>
                    <p-button [label]="editingBook() ? 'Save Changes' : 'Add Book'" icon="pi pi-save" type="submit"></p-button>
                </div>
            </form>
        </p-dialog>

        <p-dialog [header]="activeBook()?.title ?? 'Copies'" [visible]="copiesDialogVisible()" (visibleChange)="copiesDialogVisible.set($event)" [modal]="true" [dismissableMask]="true" [style]="{ width: '920px', 'max-width': '96vw' }">
            @if (activeBook(); as book) {
                <div class="flex flex-col gap-4">
                    <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                            <div class="flex flex-col gap-1.5">
                                <label class="text-xs font-medium text-muted-color">Branch</label>
                                <p-select [ngModel]="newCopy().branchId" (ngModelChange)="patchNewCopy('branchId', $event)" [options]="branchOptions()" optionLabel="label" optionValue="value" appendTo="body" styleClass="w-full"></p-select>
                            </div>
                            <div class="flex flex-col gap-1.5">
                                <label class="text-xs font-medium text-muted-color">Shelf Location</label>
                                <input pInputText [ngModel]="newCopy().shelfLocation" (ngModelChange)="patchNewCopy('shelfLocation', $event)" placeholder="e.g. A-201 / CS-01" />
                            </div>
                            <div class="flex flex-col gap-1.5">
                                <label class="text-xs font-medium text-muted-color">Condition</label>
                                <p-select [ngModel]="newCopy().condition" (ngModelChange)="patchNewCopy('condition', $event)" [options]="conditionOptions" optionLabel="label" optionValue="value" appendTo="body" styleClass="w-full"></p-select>
                            </div>
                            <p-button label="Add Copy" icon="pi pi-plus" (onClick)="addCopy(book)"></p-button>
                        </div>
                        <p class="text-xs text-muted-color mt-2">Next barcode: <span class="font-mono">{{ data.nextBarcode(book.id) }}</span></p>
                    </div>

                    @if (copies().length === 0) {
                        <app-empty-state icon="pi pi-box" title="No copies yet" message="Add the first physical copy for this book." />
                    } @else {
                        <div class="overflow-x-auto">
                            <p-table [value]="copies()" dataKey="id" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '42rem' }">
                                <ng-template pTemplate="header">
                                    <tr>
                                        <th>Barcode</th>
                                        <th>Branch</th>
                                        <th>Shelf</th>
                                        <th>Condition</th>
                                        <th>Status</th>
                                        <th style="width: 8rem">Codes</th>
                                    </tr>
                                </ng-template>
                                <ng-template pTemplate="body" let-copy>
                                    <tr>
                                        <td class="font-mono text-xs">{{ copy.barcode }}</td>
                                        <td class="text-sm">{{ data.branchName(copy.branchId) }}</td>
                                        <td class="text-sm">{{ copy.shelfLocation }}</td>
                                        <td class="text-sm">{{ copy.condition }}</td>
                                        <td><p-tag [value]="copyStatusLabel(copy.status)" [severity]="copyStatusSeverity(copy.status)"></p-tag></td>
                                        <td>
                                            <div class="flex items-center gap-1">
                                                <p-button icon="pi pi-qrcode" [rounded]="true" [text]="true" severity="info" pTooltip="Show barcode & QR" tooltipPosition="top" (onClick)="openCodes(copy)"></p-button>
                                                <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" severity="secondary" pTooltip="Edit copy" tooltipPosition="top" (onClick)="openEditCopy(copy)"></p-button>
                                                <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger" pTooltip="Delete copy" tooltipPosition="top" (onClick)="confirmDeleteCopy(copy)"></p-button>
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

        <p-dialog header="Edit Copy" [visible]="copyEditVisible()" (visibleChange)="copyEditVisible.set($event)" [modal]="true" [dismissableMask]="true" [style]="{ width: '480px', 'max-width': '95vw' }">
            @if (editingCopy(); as copy) {
                <div class="flex flex-col gap-4">
                    <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                        <div class="text-xs text-muted-color">Barcode</div>
                        <div class="font-mono text-sm">{{ copy.barcode }}</div>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Branch</label>
                        <p-select [ngModel]="copy.branchId" (ngModelChange)="patchEditingCopy('branchId', $event)" [options]="branchOptions()" optionLabel="label" optionValue="value" appendTo="body" styleClass="w-full"></p-select>
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

        <p-dialog header="Identification Codes" [visible]="codeVisible()" (visibleChange)="codeVisible.set($event)" [modal]="true" [style]="{ width: '520px', 'max-width': '95vw' }">
            @if (codeCopy(); as copy) {
                <div class="flex flex-col gap-4">
                    <div class="flex flex-col items-center gap-2 rounded-lg border border-surface-200 dark:border-surface-700 p-4">
                        <app-code-label kind="barcode" [value]="copy.barcode" [size]="150" [caption]="data.bookTitle(copy.bookId)"></app-code-label>
                    </div>
                    <div class="flex flex-col items-center gap-2 rounded-lg border border-surface-200 dark:border-surface-700 p-4">
                        <app-code-label kind="qr" [value]="data.copyQrPayload(copy)" [size]="140" caption="Scan for copy details"></app-code-label>
                    </div>
                    <p class="text-xs text-muted-color text-center">Barcodes use Code 39. QR content: {{ data.copyQrPayload(copy) }}</p>
                </div>
            }
        </p-dialog>

        <p-toast></p-toast>
        <p-confirmDialog></p-confirmDialog>
    `
})
export class CatalogPage {
    readonly data = inject(LibraryDataService);
    private readonly fb = inject(FormBuilder);
    private readonly confirm = inject(ConfirmationService);
    private readonly msg = inject(MessageService);

    readonly search = signal('');
    readonly categoryFilter = signal<string | null>(null);
    readonly statusFilter = signal<'ACTIVE' | 'ARCHIVED' | null>(null);

    readonly bookDialogVisible = signal(false);
    readonly editingBook = signal<Book | null>(null);
    readonly copiesDialogVisible = signal(false);
    readonly activeBook = signal<Book | null>(null);
    readonly codeVisible = signal(false);
    readonly codeCopy = signal<BookCopy | null>(null);
    readonly copyEditVisible = signal(false);
    readonly editingCopy = signal<BookCopy | null>(null);

    readonly newCopy = signal<{ branchId: string | null; shelfLocation: string; condition: 'GOOD' | 'FAIR' | 'DAMAGED' }>({
        branchId: null,
        shelfLocation: '',
        condition: 'GOOD'
    });

    readonly categoryOptions = [
        'Computer Science',
        'Engineering',
        'Business',
        'Economics',
        'Humanities',
        'Language & Writing',
        'Science',
        'Research',
        'Library Science',
        'General'
    ].map((category) => ({ label: category, value: category }));

    readonly languageOptions = [
        { label: 'English', value: 'English' },
        { label: 'Bangla', value: 'Bangla' },
        { label: 'Arabic', value: 'Arabic' },
        { label: 'French', value: 'French' },
        { label: 'Other', value: 'Other' }
    ];

    readonly bookStatusOptions = [
        { label: 'Active', value: 'ACTIVE' as const },
        { label: 'Archived', value: 'ARCHIVED' as const }
    ];

    readonly statusFilterOptions = [{ label: 'All Statuses', value: null }, ...this.bookStatusOptions];

    readonly conditionOptions = [
        { label: 'Good', value: 'GOOD' as const },
        { label: 'Fair', value: 'FAIR' as const },
        { label: 'Damaged', value: 'DAMAGED' as const }
    ];

    readonly form = this.fb.group({
        title: ['', Validators.required],
        author: ['', Validators.required],
        isbn: [''],
        category: ['General', Validators.required],
        publisher: [''],
        publishedYear: [new Date().getFullYear()],
        language: ['English'],
        edition: [''],
        description: [''],
        status: ['ACTIVE' as 'ACTIVE' | 'ARCHIVED', Validators.required]
    });

    readonly activeCount = computed(() => this.data.books().filter((book) => book.status === 'ACTIVE').length);
    readonly availableCount = computed(() => this.data.bookCopies().filter((copy) => copy.status === 'AVAILABLE').length);
    readonly damagedCount = computed(() => this.data.bookCopies().filter((copy) => copy.status === 'DAMAGED' || copy.status === 'LOST').length);

    readonly categoryFilterOptions = computed(() => [...new Set(this.data.books().map((book) => book.category))].sort().map((category) => ({ label: category, value: category })));

    readonly filteredBooks = computed(() => {
        const query = this.search().trim().toLowerCase();
        const category = this.categoryFilter();
        const status = this.statusFilter();
        return this.data
            .books()
            .filter((book) => {
                const matchesCategory = !category || book.category === category;
                const matchesStatus = !status || book.status === status;
                const matchesQuery =
                    !query ||
                    book.title.toLowerCase().includes(query) ||
                    book.author.toLowerCase().includes(query) ||
                    book.isbn.toLowerCase().includes(query) ||
                    book.category.toLowerCase().includes(query);
                return matchesCategory && matchesStatus && matchesQuery;
            })
            .sort((a, b) => a.title.localeCompare(b.title));
    });

    readonly copies = computed(() => {
        const book = this.activeBook();
        return book ? this.data.copiesFor(book.id) : [];
    });

    readonly branchOptions = computed(() => this.data.branches().map((branch) => ({ label: branch.name, value: branch.id })));

    openCreateBook(): void {
        this.editingBook.set(null);
        this.form.reset({
            title: '',
            author: '',
            isbn: '',
            category: 'General',
            publisher: '',
            publishedYear: new Date().getFullYear(),
            language: 'English',
            edition: '',
            description: '',
            status: 'ACTIVE'
        });
        this.bookDialogVisible.set(true);
    }

    openEditBook(book: Book): void {
        this.editingBook.set(book);
        this.form.reset({
            title: book.title,
            author: book.author,
            isbn: book.isbn,
            category: book.category,
            publisher: book.publisher,
            publishedYear: book.publishedYear,
            language: book.language,
            edition: book.edition,
            description: book.description,
            status: book.status
        });
        this.bookDialogVisible.set(true);
    }

    closeBookDialog(): void {
        this.bookDialogVisible.set(false);
        this.editingBook.set(null);
    }

    saveBook(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.msg.add({ severity: 'warn', summary: 'Validation', detail: 'Title, author and category are required.' });
            return;
        }
        const value = this.form.getRawValue() as BookFormValue;
        try {
            const editing = this.editingBook();
            if (editing) {
                this.data.updateBook({ ...editing, ...value });
                this.msg.add({ severity: 'success', summary: 'Book updated', detail: `${value.title} has been updated.` });
            } else {
                this.data.createBook({ ...value });
                this.msg.add({ severity: 'success', summary: 'Book added', detail: `${value.title} is now in the catalog.` });
            }
            this.closeBookDialog();
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Save failed', detail: this.errorText(error) });
        }
    }

    toggleBook(book: Book): void {
        const next = book.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE';
        try {
            this.data.setBookStatus(book.id, next);
            this.msg.add({ severity: 'success', summary: 'Status updated', detail: `${book.title} is now ${next.toLowerCase()}.` });
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Update failed', detail: this.errorText(error) });
        }
    }

    openCopies(book: Book): void {
        this.activeBook.set(book);
        this.newCopy.set({ branchId: this.data.activeBranches()[0]?.id ?? null, shelfLocation: '', condition: 'GOOD' });
        this.copiesDialogVisible.set(true);
    }

    patchNewCopy<K extends 'branchId' | 'shelfLocation' | 'condition'>(key: K, value: { branchId: string | null; shelfLocation: string; condition: 'GOOD' | 'FAIR' | 'DAMAGED' }[K]): void {
        this.newCopy.update((current) => ({ ...current, [key]: value }));
    }

    addCopy(book: Book): void {
        const draft = this.newCopy();
        if (!draft.branchId) {
            this.msg.add({ severity: 'warn', summary: 'Validation', detail: 'Select a branch for the new copy.' });
            return;
        }
        if (!draft.shelfLocation.trim()) {
            this.msg.add({ severity: 'warn', summary: 'Validation', detail: 'Shelf location is required.' });
            return;
        }
        try {
            this.data.createCopy({
                bookId: book.id,
                branchId: draft.branchId,
                barcode: this.data.nextBarcode(book.id),
                shelfLocation: draft.shelfLocation.trim(),
                condition: draft.condition,
                status: 'AVAILABLE'
            });
            this.newCopy.update((current) => ({ ...current, shelfLocation: '' }));
            this.msg.add({ severity: 'success', summary: 'Copy added', detail: `A new copy of ${book.title} was added.` });
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Add failed', detail: this.errorText(error) });
        }
    }

    confirmDeleteCopy(copy: BookCopy): void {
        this.confirm.confirm({
            message: `Delete copy ${copy.barcode}? This cannot be undone.`,
            header: 'Delete Copy',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Delete',
            rejectLabel: 'Cancel',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                try {
                    this.data.removeCopy(copy.id);
                    this.msg.add({ severity: 'success', summary: 'Copy deleted', detail: `${copy.barcode} has been removed.` });
                } catch (error) {
                    this.msg.add({ severity: 'error', summary: 'Delete failed', detail: this.errorText(error) });
                }
            }
        });
    }

    openCodes(copy: BookCopy): void {
        this.codeCopy.set(copy);
        this.codeVisible.set(true);
    }

    openEditCopy(copy: BookCopy): void {
        this.editingCopy.set({ ...copy });
        this.copyEditVisible.set(true);
    }

    patchEditingCopy<K extends 'branchId' | 'shelfLocation' | 'condition'>(key: K, value: BookCopy[K]): void {
        this.editingCopy.update((current) => (current ? { ...current, [key]: value } : current));
    }

    saveCopy(): void {
        const copy = this.editingCopy();
        if (!copy) return;
        if (!copy.shelfLocation.trim()) {
            this.msg.add({ severity: 'warn', summary: 'Validation', detail: 'Shelf location is required.' });
            return;
        }
        try {
            this.data.updateCopy({ ...copy, shelfLocation: copy.shelfLocation.trim() });
            this.copyEditVisible.set(false);
            this.editingCopy.set(null);
            this.msg.add({ severity: 'success', summary: 'Copy updated', detail: `${copy.barcode} has been updated.` });
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Save failed', detail: this.errorText(error) });
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
            case 'LOST':
            case 'DAMAGED':
                return 'danger';
            default:
                return 'secondary';
        }
    }

    private errorText(error: unknown): string {
        return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
    }
}
