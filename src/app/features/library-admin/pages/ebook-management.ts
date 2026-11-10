import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { EBookReader } from '@/app/shared/components/ebook-reader';
import { EmptyState } from '@/app/shared/components/empty-state';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatCard } from '@/app/shared/components/stat-card';
import { LibraryDataService } from '@/app/core/services/library-data.service';
import type { AccessRequestStatus, EBook, EBookAccessLevel, EBookStatus } from '@/app/core/models/library.models';

interface PickedFile {
    fileName: string;
    fileType: string;
    fileSize: number;
    dataUrl: string;
}

interface BookFormValue {
    title: string;
    author: string;
    isbn: string;
    category: string;
    publisher: string;
    publishedYear: number;
    pages: number;
    language: string;
    description: string;
    excerpt: string;
    accessLevel: EBookAccessLevel;
    status: EBookStatus;
    downloadAllowed: boolean;
}

@Component({
    selector: 'app-ebook-management',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        ButtonModule,
        CardModule,
        CheckboxModule,
        ConfirmDialogModule,
        DialogModule,
        InputNumberModule,
        InputTextModule,
        MessageModule,
        SelectModule,
        TableModule,
        TabsModule,
        TagModule,
        TextareaModule,
        ToastModule,
        TooltipModule,
        EBookReader,
        EmptyState,
        PageHeader,
        StatCard
    ],
    providers: [ConfirmationService, MessageService],
    template: `
        <app-page-header title="E-Books & Digital Resources" subtitle="Upload e-books, publish digital titles and approve special access requests">
            <p-button label="Upload E-Book" icon="pi pi-cloud-upload" (onClick)="openCreate()"></p-button>
        </app-page-header>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
            <app-stat-card label="E-Books" [value]="data.ebooks().length" context="digital records" icon="pi pi-book" iconBg="primary"></app-stat-card>
            <app-stat-card label="Published" [value]="publishedCount()" context="visible to members" icon="pi pi-check-circle" iconBg="green"></app-stat-card>
            <app-stat-card label="Restricted" [value]="restrictedCount()" context="requires special permission" icon="pi pi-lock" iconBg="orange"></app-stat-card>
            <app-stat-card label="Pending Requests" [value]="data.pendingEBookRequests().length" context="awaiting review" icon="pi pi-inbox" iconBg="red"></app-stat-card>
        </div>

        <p-tabs [value]="activeTab()" (valueChange)="activeTab.set($event)">
            <p-tablist>
                <p-tab value="catalog"><i class="pi pi-book mr-2"></i>E-Book Catalog</p-tab>
                <p-tab value="requests">
                    <i class="pi pi-lock mr-2"></i>Special Access Requests
                    @if (data.pendingEBookRequests().length > 0) {
                        <span class="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-semibold">{{ data.pendingEBookRequests().length }}</span>
                    }
                </p-tab>
            </p-tablist>
            <p-tabpanels>
                <p-tabpanel value="catalog">
                    <div class="pt-4">
                        <p-card>
                            <div class="grid gap-3 lg:grid-cols-4 mb-4">
                                <span class="relative block lg:col-span-2">
                                    <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-color"></i>
                                    <input pInputText type="text" placeholder="Search title, author, ISBN or category" class="w-full pl-10" [ngModel]="search()" (ngModelChange)="search.set($event)" />
                                </span>
                                <p-select [ngModel]="accessFilter()" (ngModelChange)="accessFilter.set($event)" [options]="accessFilterOptions" optionLabel="label" optionValue="value" placeholder="Access" [showClear]="true" appendTo="body" styleClass="w-full"></p-select>
                                <p-select [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)" [options]="statusFilterOptions" optionLabel="label" optionValue="value" placeholder="Status" [showClear]="true" appendTo="body" styleClass="w-full"></p-select>
                            </div>

                            @if (filteredBooks().length === 0) {
                                <app-empty-state icon="pi pi-book" title="No e-books found" message="Upload an e-book or clear the filters to see the catalog." actionLabel="Upload E-Book" (action)="openCreate()"></app-empty-state>
                            } @else {
                                <div class="overflow-x-auto">
                                    <p-table [value]="filteredBooks()" dataKey="id" [paginator]="true" [rows]="10" [rowsPerPageOptions]="[10, 25, 50]" [tableStyle]="{ 'min-width': '72rem' }" styleClass="w-full">
                                        <ng-template pTemplate="header">
                                            <tr>
                                                <th>E-Book</th>
                                                <th>Category</th>
                                                <th>Access</th>
                                                <th>File</th>
                                                <th>Status</th>
                                                <th>Uploaded By</th>
                                                <th style="width: 10rem">Actions</th>
                                            </tr>
                                        </ng-template>
                                        <ng-template pTemplate="body" let-row>
                                            <tr>
                                                <td>
                                                    <div class="font-medium">{{ row.title }}</div>
                                                    <div class="text-xs text-muted-color">{{ row.author }} · {{ row.publishedYear }}</div>
                                                </td>
                                                <td class="text-sm">{{ row.category }}</td>
                                                <td>
                                                    <p-tag [value]="row.accessLevel === 'OPEN' ? 'Open' : 'Restricted'" [severity]="row.accessLevel === 'OPEN' ? 'success' : 'warn'"></p-tag>
                                                </td>
                                                <td class="text-xs">
                                                    @if (row.fileName) {
                                                        <div class="font-mono">{{ row.fileName }}</div>
                                                        <div class="text-muted-color">{{ fileSizeLabel(row.fileSize) }}</div>
                                                    } @else {
                                                        <span class="text-muted-color">Metadata preview</span>
                                                    }
                                                </td>
                                                <td><p-tag [value]="statusLabel(row.status)" [severity]="statusSeverity(row.status)"></p-tag></td>
                                                <td class="text-sm">{{ row.uploadedBy }}</td>
                                                <td>
                                                    <div class="flex items-center gap-1">
                                                        <p-button icon="pi pi-eye" [rounded]="true" [text]="true" severity="info" pTooltip="Read e-book" tooltipPosition="top" (onClick)="openReader(row)"></p-button>
                                                        <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" severity="secondary" pTooltip="Edit e-book" tooltipPosition="top" (onClick)="openEdit(row)"></p-button>
                                                        <p-button
                                                            [icon]="row.status === 'PUBLISHED' ? 'pi pi-pause' : 'pi pi-send'"
                                                            [rounded]="true"
                                                            [text]="true"
                                                            [severity]="row.status === 'PUBLISHED' ? 'warn' : 'success'"
                                                            [pTooltip]="row.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'"
                                                            tooltipPosition="top"
                                                            (onClick)="togglePublished(row)"
                                                        ></p-button>
                                                        <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger" pTooltip="Delete e-book" tooltipPosition="top" (onClick)="confirmDelete(row)"></p-button>
                                                    </div>
                                                </td>
                                            </tr>
                                        </ng-template>
                                    </p-table>
                                </div>
                            }
                        </p-card>
                    </div>
                </p-tabpanel>

                <p-tabpanel value="requests">
                    <div class="pt-4">
                        <p-message severity="info" icon="pi pi-info-circle" styleClass="w-full mb-4">
                            Restricted e-books are hidden behind an approval step. Teachers and students can request access from the E-Book Library; approving a request unlocks the title for that account.
                        </p-message>

                        <p-card>
                            <div class="flex flex-col sm:flex-row gap-3 mb-4">
                                <span class="relative block flex-1">
                                    <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-color"></i>
                                    <input pInputText type="text" placeholder="Search requester or e-book" class="w-full pl-10" [ngModel]="requestSearch()" (ngModelChange)="requestSearch.set($event)" />
                                </span>
                                <p-select [ngModel]="requestStatusFilter()" (ngModelChange)="requestStatusFilter.set($event)" [options]="requestStatusOptions" optionLabel="label" optionValue="value" placeholder="Status" [showClear]="true" appendTo="body" styleClass="w-full sm:w-52"></p-select>
                            </div>

                            @if (filteredRequests().length === 0) {
                                <app-empty-state icon="pi pi-check-circle" title="No access requests" message="No special permission requests match the current filters." actionLabel="Clear filters" (action)="clearRequestFilters()"></app-empty-state>
                            } @else {
                                <div class="overflow-x-auto">
                                    <p-table [value]="filteredRequests()" dataKey="id" [paginator]="true" [rows]="10" [tableStyle]="{ 'min-width': '68rem' }" styleClass="w-full">
                                        <ng-template pTemplate="header">
                                            <tr>
                                                <th>E-Book</th>
                                                <th>Requester</th>
                                                <th>Role</th>
                                                <th>Requested</th>
                                                <th>Note</th>
                                                <th>Status</th>
                                                <th style="width: 9rem">Actions</th>
                                            </tr>
                                        </ng-template>
                                        <ng-template pTemplate="body" let-row>
                                            <tr>
                                                <td class="font-medium">{{ bookTitle(row.ebookId) }}</td>
                                                <td>
                                                    <div class="text-sm">{{ row.userName }}</div>
                                                    <div class="text-xs text-muted-color font-mono">{{ row.username }}</div>
                                                </td>
                                                <td class="text-sm">{{ data.roleLabel(row.role) }}</td>
                                                <td class="text-sm whitespace-nowrap">{{ formatDate(row.requestedAt) }}</td>
                                                <td class="text-sm max-w-[22rem]">{{ row.note || '—' }}</td>
                                                <td><p-tag [value]="requestLabel(row.status)" [severity]="requestSeverity(row.status)"></p-tag></td>
                                                <td>
                                                    @if (row.status === 'PENDING') {
                                                        <div class="flex items-center gap-1">
                                                            <p-button icon="pi pi-check" [rounded]="true" [text]="true" severity="success" pTooltip="Approve access" tooltipPosition="top" (onClick)="review(row.id, 'APPROVED')"></p-button>
                                                            <p-button icon="pi pi-times" [rounded]="true" [text]="true" severity="danger" pTooltip="Reject request" tooltipPosition="top" (onClick)="review(row.id, 'REJECTED')"></p-button>
                                                        </div>
                                                    } @else if (row.status === 'APPROVED') {
                                                        <p-button label="Revoke" icon="pi pi-undo" size="small" [text]="true" severity="danger" (onClick)="review(row.id, 'REJECTED')"></p-button>
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
                    </div>
                </p-tabpanel>
            </p-tabpanels>
        </p-tabs>

        <p-dialog
            [header]="editingBook() ? 'Edit E-Book' : 'Upload E-Book'"
            [visible]="dialogVisible()"
            (visibleChange)="dialogVisible.set($event)"
            [modal]="true"
            [dismissableMask]="true"
            [style]="{ width: '760px', 'max-width': '96vw' }"
            (onHide)="closeDialog()"
        >
            <form [formGroup]="form" (ngSubmit)="save()" class="flex flex-col gap-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium" for="bookTitle">Title *</label>
                        <input pInputText id="bookTitle" formControlName="title" placeholder="E-book title" />
                        @if (form.controls.title.touched && form.controls.title.invalid) {
                            <small class="text-red-500">Title is required.</small>
                        }
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium" for="bookAuthor">Author *</label>
                        <input pInputText id="bookAuthor" formControlName="author" placeholder="Author name" />
                        @if (form.controls.author.touched && form.controls.author.invalid) {
                            <small class="text-red-500">Author is required.</small>
                        }
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Category *</label>
                        <p-select formControlName="category" [options]="categoryOptions" optionLabel="label" optionValue="value" appendTo="body" styleClass="w-full"></p-select>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium" for="bookIsbn">ISBN</label>
                        <input pInputText id="bookIsbn" formControlName="isbn" placeholder="978-..." />
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Language</label>
                        <p-select formControlName="language" [options]="languageOptions" optionLabel="label" optionValue="value" appendTo="body" styleClass="w-full"></p-select>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div class="flex flex-col gap-1.5 sm:col-span-2">
                        <label class="text-sm font-medium" for="bookPublisher">Publisher</label>
                        <input pInputText id="bookPublisher" formControlName="publisher" placeholder="Publisher" />
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Year</label>
                        <p-inputnumber formControlName="publishedYear" [min]="0" [max]="2100" [showButtons]="true" styleClass="w-full" inputStyleClass="w-full"></p-inputnumber>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Pages</label>
                        <p-inputnumber formControlName="pages" [min]="0" [max]="100000" [showButtons]="true" styleClass="w-full" inputStyleClass="w-full"></p-inputnumber>
                    </div>
                </div>

                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium" for="bookDescription">Description</label>
                    <textarea id="bookDescription" pTextarea rows="2" formControlName="description" placeholder="Short summary shown in the library catalog" class="w-full"></textarea>
                </div>

                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium" for="bookExcerpt">Preview text (used when no file is attached)</label>
                    <textarea id="bookExcerpt" pTextarea rows="3" formControlName="excerpt" placeholder="Optional reading excerpt" class="w-full"></textarea>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Access Level *</label>
                        <p-select formControlName="accessLevel" [options]="accessOptions" optionLabel="label" optionValue="value" appendTo="body" styleClass="w-full"></p-select>
                        <small class="text-muted-color">Restricted titles require an approved request.</small>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Status *</label>
                        <p-select formControlName="status" [options]="statusOptions" optionLabel="label" optionValue="value" appendTo="body" styleClass="w-full"></p-select>
                    </div>
                    <label class="flex items-start gap-3 rounded-lg border border-surface-200 dark:border-surface-700 p-3 cursor-pointer self-end">
                        <p-checkbox formControlName="downloadAllowed" [binary]="true"></p-checkbox>
                        <span>
                            <span class="block text-sm font-medium">Allow download</span>
                            <span class="block text-xs text-muted-color mt-0.5">Otherwise the reader is view-only.</span>
                        </span>
                    </label>
                </div>

                <div class="rounded-lg border border-dashed border-surface-300 dark:border-surface-600 p-4">
                    <div class="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div class="w-10 h-10 rounded-lg flex items-center justify-center bg-primary-100 dark:bg-primary-950 text-primary shrink-0">
                            <i class="pi pi-file-pdf"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="text-sm font-medium">{{ pickedFile()?.fileName ?? activeFileName() ?? 'No file attached' }}</div>
                            <div class="text-xs text-muted-color mt-0.5">
                                @if (pickedFile()) {
                                    {{ fileTypeLabel(pickedFile()?.fileType ?? '') }} · {{ fileSizeLabel(pickedFile()?.fileSize ?? 0) }} · ready to upload
                                } @else if (activeFileName()) {
                                    Existing file · leave empty to keep it
                                } @else {
                                    PDF, EPUB or TXT up to 3 MB. A preview excerpt can be used instead.
                                }
                            </div>
                        </div>
                        <div class="flex gap-2">
                            <input #ebookFile type="file" class="hidden" accept=".pdf,.epub,.txt,application/pdf,application/epub+zip,text/plain" (change)="onFileSelected($event)" />
                            <p-button label="Choose File" icon="pi pi-paperclip" severity="secondary" [outlined]="true" size="small" (onClick)="ebookFile.click()"></p-button>
                            @if (pickedFile()) {
                                <p-button icon="pi pi-times" [rounded]="true" [text]="true" severity="danger" pTooltip="Remove selected file" tooltipPosition="top" (onClick)="pickedFile.set(null)"></p-button>
                            }
                        </div>
                    </div>
                    @if (uploadError()) {
                        <p class="text-xs text-red-500 mt-2">{{ uploadError() }}</p>
                    }
                </div>

                <div class="flex justify-end gap-2 pt-2">
                    <p-button label="Cancel" severity="secondary" [text]="true" (onClick)="closeDialog()"></p-button>
                    <p-button [label]="editingBook() ? 'Save Changes' : 'Upload E-Book'" icon="pi pi-save" type="submit"></p-button>
                </div>
            </form>
        </p-dialog>

        <app-ebook-reader [book]="readingBook()" [visible]="readerVisible()" (visibleChange)="readerVisible.set($event)"></app-ebook-reader>

        <p-toast></p-toast>
        <p-confirmDialog></p-confirmDialog>
    `
})
export class EBookManagement {
    readonly data = inject(LibraryDataService);
    private readonly fb = inject(FormBuilder);
    private readonly confirm = inject(ConfirmationService);
    private readonly msg = inject(MessageService);

    readonly activeTab = signal<string | number | undefined>('catalog');
    readonly search = signal('');
    readonly accessFilter = signal<EBookAccessLevel | null>(null);
    readonly statusFilter = signal<EBookStatus | null>(null);

    readonly requestSearch = signal('');
    readonly requestStatusFilter = signal<AccessRequestStatus | null>(null);

    readonly dialogVisible = signal(false);
    readonly editingBook = signal<EBook | null>(null);
    readonly pickedFile = signal<PickedFile | null>(null);
    readonly uploadError = signal<string | null>(null);

    readonly readerVisible = signal(false);
    readonly readingBook = signal<EBook | null>(null);

    readonly categoryOptions = [
        { label: 'Computer Science', value: 'Computer Science' },
        { label: 'Engineering', value: 'Engineering' },
        { label: 'Business', value: 'Business' },
        { label: 'Economics', value: 'Economics' },
        { label: 'Humanities', value: 'Humanities' },
        { label: 'Language & Writing', value: 'Language & Writing' },
        { label: 'Science', value: 'Science' },
        { label: 'Research', value: 'Research' },
        { label: 'Library Science', value: 'Library Science' },
        { label: 'General', value: 'General' }
    ];

    readonly languageOptions = [
        { label: 'English', value: 'English' },
        { label: 'Bangla', value: 'Bangla' },
        { label: 'Arabic', value: 'Arabic' },
        { label: 'French', value: 'French' },
        { label: 'Other', value: 'Other' }
    ];

    readonly accessOptions = [
        { label: 'Open access', value: 'OPEN' as EBookAccessLevel },
        { label: 'Restricted — special permission', value: 'RESTRICTED' as EBookAccessLevel }
    ];

    readonly statusOptions = [
        { label: 'Published', value: 'PUBLISHED' as EBookStatus },
        { label: 'Draft', value: 'DRAFT' as EBookStatus },
        { label: 'Archived', value: 'ARCHIVED' as EBookStatus }
    ];

    readonly accessFilterOptions = [{ label: 'All Access', value: null }, ...this.accessOptions];
    readonly statusFilterOptions = [{ label: 'All Statuses', value: null }, ...this.statusOptions];
    readonly requestStatusOptions = [
        { label: 'All Requests', value: null },
        { label: 'Pending', value: 'PENDING' },
        { label: 'Approved', value: 'APPROVED' },
        { label: 'Rejected', value: 'REJECTED' }
    ];

    readonly form = this.fb.group({
        title: ['', Validators.required],
        author: ['', Validators.required],
        isbn: [''],
        category: ['General', Validators.required],
        publisher: [''],
        publishedYear: [new Date().getFullYear()],
        pages: [0],
        language: ['English'],
        description: [''],
        excerpt: [''],
        accessLevel: ['OPEN' as EBookAccessLevel, Validators.required],
        status: ['PUBLISHED' as EBookStatus, Validators.required],
        downloadAllowed: [true]
    });

    readonly publishedCount = computed(() => this.data.ebooks().filter((book) => book.status === 'PUBLISHED').length);
    readonly restrictedCount = computed(() => this.data.ebooks().filter((book) => book.accessLevel === 'RESTRICTED').length);

    readonly filteredBooks = computed(() => {
        const query = this.search().trim().toLowerCase();
        const access = this.accessFilter();
        const status = this.statusFilter();
        return this.data
            .ebooks()
            .filter((book) => {
                const matchesAccess = !access || book.accessLevel === access;
                const matchesStatus = !status || book.status === status;
                const matchesQuery =
                    !query ||
                    book.title.toLowerCase().includes(query) ||
                    book.author.toLowerCase().includes(query) ||
                    book.isbn.toLowerCase().includes(query) ||
                    book.category.toLowerCase().includes(query);
                return matchesAccess && matchesStatus && matchesQuery;
            })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    });

    readonly filteredRequests = computed(() => {
        const query = this.requestSearch().trim().toLowerCase();
        const status = this.requestStatusFilter();
        return this.data
            .ebookRequests()
            .filter((request) => {
                const matchesStatus = !status || request.status === status;
                const matchesQuery =
                    !query ||
                    request.userName.toLowerCase().includes(query) ||
                    request.username.toLowerCase().includes(query) ||
                    this.bookTitle(request.ebookId).toLowerCase().includes(query);
                return matchesStatus && matchesQuery;
            })
            .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    });

    activeFileName(): string | null {
        return this.editingBook()?.fileName ?? null;
    }

    clearRequestFilters(): void {
        this.requestSearch.set('');
        this.requestStatusFilter.set(null);
    }

    openCreate(): void {
        this.editingBook.set(null);
        this.pickedFile.set(null);
        this.uploadError.set(null);
        this.form.reset({
            title: '',
            author: '',
            isbn: '',
            category: 'General',
            publisher: '',
            publishedYear: new Date().getFullYear(),
            pages: 0,
            language: 'English',
            description: '',
            excerpt: '',
            accessLevel: 'OPEN',
            status: 'PUBLISHED',
            downloadAllowed: true
        });
        this.dialogVisible.set(true);
    }

    openEdit(book: EBook): void {
        this.editingBook.set(book);
        this.pickedFile.set(null);
        this.uploadError.set(null);
        this.form.reset({
            title: book.title,
            author: book.author,
            isbn: book.isbn,
            category: book.category,
            publisher: book.publisher,
            publishedYear: book.publishedYear,
            pages: book.pages,
            language: book.language,
            description: book.description,
            excerpt: book.excerpt,
            accessLevel: book.accessLevel,
            status: book.status,
            downloadAllowed: book.downloadAllowed
        });
        this.dialogVisible.set(true);
    }

    closeDialog(): void {
        this.dialogVisible.set(false);
        this.editingBook.set(null);
        this.pickedFile.set(null);
        this.uploadError.set(null);
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        input.value = '';
        if (!file) return;

        const extension = file.name.toLowerCase();
        const allowedType = file.type === 'application/pdf' || file.type === 'application/epub+zip' || file.type.startsWith('text/') || /\.(pdf|epub|txt)$/.test(extension);
        if (!allowedType) {
            this.uploadError.set('Unsupported file type. Choose a PDF, EPUB or TXT file.');
            return;
        }
        if (file.size > 3 * 1024 * 1024) {
            this.uploadError.set('File is too large. The limit is 3 MB for browser-stored e-books.');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            this.pickedFile.set({
                fileName: file.name,
                fileType: file.type || this.guessType(extension),
                fileSize: file.size,
                dataUrl: String(reader.result ?? '')
            });
            this.uploadError.set(null);
        };
        reader.onerror = () => this.uploadError.set('The file could not be read. Please try again.');
        reader.readAsDataURL(file);
    }

    save(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.msg.add({ severity: 'warn', summary: 'Validation', detail: 'Please complete the required e-book details.' });
            return;
        }

        const value = this.form.getRawValue() as BookFormValue;
        const picked = this.pickedFile();
        const editing = this.editingBook();

        try {
            if (editing) {
                this.data.updateEBook({
                    ...editing,
                    ...value,
                    fileName: picked?.fileName ?? editing.fileName,
                    fileType: picked?.fileType ?? editing.fileType,
                    fileSize: picked?.fileSize ?? editing.fileSize,
                    dataUrl: picked?.dataUrl ?? editing.dataUrl
                });
                this.msg.add({ severity: 'success', summary: 'E-book updated', detail: `${value.title} has been updated.` });
            } else {
                this.data.createEBook({
                    ...value,
                    fileName: picked?.fileName ?? null,
                    fileType: picked?.fileType ?? null,
                    fileSize: picked?.fileSize ?? 0,
                    dataUrl: picked?.dataUrl ?? null
                });
                this.msg.add({ severity: 'success', summary: 'E-book uploaded', detail: `${value.title} is now in the digital library.` });
            }
            this.closeDialog();
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Save failed', detail: this.errorText(error) });
        }
    }

    togglePublished(book: EBook): void {
        const next: EBookStatus = book.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
        try {
            this.data.setEBookStatus(book.id, next);
            this.msg.add({ severity: 'success', summary: 'Status updated', detail: `${book.title} is now ${this.statusLabel(next).toLowerCase()}.` });
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Update failed', detail: this.errorText(error) });
        }
    }

    confirmDelete(book: EBook): void {
        this.confirm.confirm({
            message: `Delete "${book.title}"? Access requests for this title will also be removed.`,
            header: 'Delete E-Book',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Delete',
            rejectLabel: 'Cancel',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                try {
                    this.data.removeEBook(book.id);
                    this.msg.add({ severity: 'success', summary: 'E-book deleted', detail: `${book.title} has been removed.` });
                } catch (error) {
                    this.msg.add({ severity: 'error', summary: 'Delete failed', detail: this.errorText(error) });
                }
            }
        });
    }

    review(requestId: string, status: 'APPROVED' | 'REJECTED'): void {
        try {
            this.data.reviewEBookAccess(requestId, status);
            this.msg.add({
                severity: 'success',
                summary: status === 'APPROVED' ? 'Access approved' : 'Access revoked',
                detail: status === 'APPROVED' ? 'The requester can now read this e-book.' : 'The request was rejected or access was revoked.'
            });
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Update failed', detail: this.errorText(error) });
        }
    }

    openReader(book: EBook): void {
        this.readingBook.set(book);
        this.readerVisible.set(true);
    }

    bookTitle(id: string): string {
        return this.data.ebooks().find((book) => book.id === id)?.title ?? 'Unknown e-book';
    }

    statusLabel(status: EBookStatus): string {
        return status === 'PUBLISHED' ? 'Published' : status === 'DRAFT' ? 'Draft' : 'Archived';
    }

    statusSeverity(status: EBookStatus): 'success' | 'warn' | 'secondary' {
        return status === 'PUBLISHED' ? 'success' : status === 'DRAFT' ? 'warn' : 'secondary';
    }

    requestLabel(status: AccessRequestStatus): string {
        return status === 'PENDING' ? 'Pending' : status === 'APPROVED' ? 'Approved' : 'Rejected';
    }

    requestSeverity(status: AccessRequestStatus): 'warn' | 'success' | 'danger' {
        return status === 'PENDING' ? 'warn' : status === 'APPROVED' ? 'success' : 'danger';
    }

    fileSizeLabel(size: number): string {
        if (!size) return '—';
        const kb = size / 1024;
        return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(0)} KB`;
    }

    fileTypeLabel(type: string): string {
        if (type === 'application/pdf') return 'PDF';
        if (type === 'application/epub+zip') return 'EPUB';
        if (type.startsWith('text/')) return 'TXT';
        return type || 'File';
    }

    formatDate(value: string): string {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '—';
        return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    }

    private guessType(extension: string): string {
        if (extension.endsWith('.pdf')) return 'application/pdf';
        if (extension.endsWith('.epub')) return 'application/epub+zip';
        return 'text/plain';
    }

    private errorText(error: unknown): string {
        return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
    }
}
