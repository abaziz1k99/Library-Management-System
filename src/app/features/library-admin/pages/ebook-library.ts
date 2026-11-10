import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { EBookReader } from '@/app/shared/components/ebook-reader';
import { EmptyState } from '@/app/shared/components/empty-state';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatCard } from '@/app/shared/components/stat-card';
import { AuthService } from '@/app/core/services/auth.service';
import { LibraryDataService } from '@/app/core/services/library-data.service';
import type { EBook, EBookAccessLevel } from '@/app/core/models/library.models';

@Component({
    selector: 'app-ebook-library',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, ButtonModule, CardModule, DialogModule, InputTextModule, MessageModule, SelectModule, TagModule, TextareaModule, ToastModule, EBookReader, EmptyState, PageHeader, StatCard],
    providers: [MessageService],
    template: `
        <app-page-header title="E-Book Library" subtitle="Read open digital titles and request special permission for restricted resources">
            @if (auth.role() === 'SUPER_ADMIN') {
                <p-button label="Manage E-Books" icon="pi pi-cog" routerLink="/admin/ebooks"></p-button>
            } @else {
                <p-button label="My Portal" icon="pi pi-arrow-left" severity="secondary" [outlined]="true" [routerLink]="portalLink()"></p-button>
            }
        </app-page-header>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
            <app-stat-card label="Available Titles" [value]="publishedBooks().length" context="published e-books" icon="pi pi-book"></app-stat-card>
            <app-stat-card label="Open Access" [value]="openCount()" context="read without approval" icon="pi pi-unlock" iconBg="green"></app-stat-card>
            <app-stat-card label="Restricted" [value]="restrictedCount()" context="special permission required" icon="pi pi-lock" iconBg="orange"></app-stat-card>
            <app-stat-card label="My Approved Access" [value]="myApprovedCount()" context="restricted titles unlocked" icon="pi pi-key" iconBg="primary"></app-stat-card>
        </div>

        <p-card>
            <div class="grid gap-3 lg:grid-cols-3 mb-5">
                <span class="relative block lg:col-span-1">
                    <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-color"></i>
                    <input pInputText type="text" placeholder="Search title, author or ISBN" class="w-full pl-10" [ngModel]="search()" (ngModelChange)="search.set($event)" />
                </span>
                <p-select [ngModel]="categoryFilter()" (ngModelChange)="categoryFilter.set($event)" [options]="categoryOptions()" optionLabel="label" optionValue="value" placeholder="Category" [showClear]="true" appendTo="body" styleClass="w-full"></p-select>
                <p-select [ngModel]="accessFilter()" (ngModelChange)="accessFilter.set($event)" [options]="accessFilterOptions" optionLabel="label" optionValue="value" placeholder="Access" [showClear]="true" appendTo="body" styleClass="w-full"></p-select>
            </div>

            @if (filteredBooks().length === 0) {
                <app-empty-state icon="pi pi-book" title="No e-books found" message="Adjust the filters or check back when new digital titles are published." actionLabel="Clear filters" (action)="clearFilters()"></app-empty-state>
            } @else {
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    @for (book of filteredBooks(); track book.id) {
                        <article class="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 overflow-hidden flex flex-col">
                            <div class="h-28 flex items-center justify-between px-4" [ngClass]="book.accessLevel === 'OPEN' ? 'bg-primary-50 dark:bg-primary-950' : 'bg-orange-50 dark:bg-orange-950'">
                                <div class="w-14 h-16 rounded-md bg-surface-0 dark:bg-surface-900 shadow flex items-center justify-center">
                                    <i class="pi pi-book text-2xl" [ngClass]="book.accessLevel === 'OPEN' ? 'text-primary' : 'text-orange-500'"></i>
                                </div>
                                <p-tag [value]="book.accessLevel === 'OPEN' ? 'Open access' : 'Special permission'" [severity]="book.accessLevel === 'OPEN' ? 'success' : 'warn'"></p-tag>
                            </div>
                            <div class="p-4 flex flex-col flex-1">
                                <h3 class="font-semibold leading-snug line-clamp-2">{{ book.title }}</h3>
                                <p class="text-sm text-muted-color mt-1">{{ book.author }}</p>
                                <div class="flex flex-wrap gap-1.5 mt-2">
                                    <p-tag [value]="book.category" severity="secondary"></p-tag>
                                    <p-tag [value]="book.language" severity="secondary"></p-tag>
                                </div>
                                <p class="text-sm text-muted-color mt-3 line-clamp-3 flex-1">{{ book.description }}</p>

                                <div class="mt-3 text-xs text-muted-color flex flex-wrap gap-x-3 gap-y-1">
                                    <span>{{ book.pages }} pages</span>
                                    <span>{{ book.publishedYear }}</span>
                                    <span>{{ book.fileName ? 'Digital file' : 'Preview edition' }}</span>
                                </div>

                                <div class="mt-4 pt-3 border-t border-surface-200 dark:border-surface-700 flex items-center justify-between gap-2">
                                    @if (canRead(book)) {
                                        <p-button label="Read Now" icon="pi pi-book" size="small" (onClick)="openReader(book)"></p-button>
                                        <span class="text-xs text-green-600 inline-flex items-center gap-1"><i class="pi pi-check-circle"></i> Access granted</span>
                                    } @else if (requestStatus(book) === 'PENDING') {
                                        <p-button label="Approval Pending" icon="pi pi-clock" size="small" severity="warn" [outlined]="true" [disabled]="true"></p-button>
                                        <span class="text-xs text-muted-color">Awaiting review</span>
                                    } @else {
                                        <p-button label="Request Access" icon="pi pi-lock-open" size="small" severity="warn" (onClick)="openRequest(book)"></p-button>
                                        @if (requestStatus(book) === 'REJECTED') {
                                            <span class="text-xs text-red-500">Previous request rejected</span>
                                        } @else {
                                            <span class="text-xs text-muted-color">Approval required</span>
                                        }
                                    }
                                </div>
                            </div>
                        </article>
                    }
                </div>
            }
        </p-card>

        <p-message severity="info" icon="pi pi-info-circle" styleClass="w-full mt-4">
            This prototype stores uploaded e-books in your browser. Files up to 3 MB can be read inline; larger library holdings would use a document server in production.
        </p-message>

        <p-dialog header="Request Special Access" [visible]="requestVisible()" (visibleChange)="requestVisible.set($event)" [modal]="true" [dismissableMask]="true" [style]="{ width: '520px', 'max-width': '95vw' }">
            @if (requestBook(); as book) {
                <div class="flex flex-col gap-4">
                    <div class="rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950 p-3">
                        <div class="flex items-center gap-2 text-sm font-medium text-orange-700 dark:text-orange-300">
                            <i class="pi pi-lock"></i>
                            Restricted e-book
                        </div>
                        <p class="text-sm mt-1">{{ book.title }} — {{ book.author }}</p>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium" for="accessNote">Reason for access *</label>
                        <textarea id="accessNote" pTextarea rows="4" class="w-full" placeholder="Explain why you need this title (course, research, project...)" [ngModel]="requestNote()" (ngModelChange)="requestNote.set($event)"></textarea>
                        <small class="text-muted-color">Library administrators review this note before granting access.</small>
                    </div>
                    <div class="flex justify-end gap-2">
                        <p-button label="Cancel" severity="secondary" [text]="true" (onClick)="requestVisible.set(false)"></p-button>
                        <p-button label="Submit Request" icon="pi pi-send" [disabled]="!requestNote().trim()" (onClick)="submitRequest()"></p-button>
                    </div>
                </div>
            }
        </p-dialog>

        <app-ebook-reader [book]="readingBook()" [visible]="readerVisible()" (visibleChange)="readerVisible.set($event)"></app-ebook-reader>

        <p-toast></p-toast>
    `
})
export class EBookLibrary {
    readonly data = inject(LibraryDataService);
    readonly auth = inject(AuthService);
    private readonly msg = inject(MessageService);

    readonly search = signal('');
    readonly categoryFilter = signal<string | null>(null);
    readonly accessFilter = signal<EBookAccessLevel | null>(null);

    readonly requestVisible = signal(false);
    readonly requestBook = signal<EBook | null>(null);
    readonly requestNote = signal('');

    readonly readerVisible = signal(false);
    readonly readingBook = signal<EBook | null>(null);

    readonly publishedBooks = computed(() => this.data.ebooks().filter((book) => book.status === 'PUBLISHED'));

    readonly openCount = computed(() => this.publishedBooks().filter((book) => book.accessLevel === 'OPEN').length);
    readonly restrictedCount = computed(() => this.publishedBooks().filter((book) => book.accessLevel === 'RESTRICTED').length);

    readonly myApprovedCount = computed(() => {
        const username = this.auth.username();
        if (!username) return 0;
        return this.data.ebookRequests().filter((request) => request.username === username && request.status === 'APPROVED').length;
    });

    readonly categoryOptions = computed(() => {
        const categories = [...new Set(this.publishedBooks().map((book) => book.category))].sort();
        return categories.map((category) => ({ label: category, value: category }));
    });

    readonly accessFilterOptions = [
        { label: 'All Access', value: null },
        { label: 'Open Access', value: 'OPEN' },
        { label: 'Restricted', value: 'RESTRICTED' }
    ];

    readonly filteredBooks = computed(() => {
        const query = this.search().trim().toLowerCase();
        const category = this.categoryFilter();
        const access = this.accessFilter();
        return this.publishedBooks()
            .filter((book) => {
                const matchesCategory = !category || book.category === category;
                const matchesAccess = !access || book.accessLevel === access;
                const matchesQuery =
                    !query ||
                    book.title.toLowerCase().includes(query) ||
                    book.author.toLowerCase().includes(query) ||
                    book.isbn.toLowerCase().includes(query);
                return matchesCategory && matchesAccess && matchesQuery;
            })
            .sort((a, b) => a.title.localeCompare(b.title));
    });

    clearFilters(): void {
        this.search.set('');
        this.categoryFilter.set(null);
        this.accessFilter.set(null);
    }

    portalLink(): string {
        const role = this.auth.role();
        return role === 'TEACHER' || role === 'STUDENT' ? '/my-library/dashboard' : '/portal';
    }

    canRead(book: EBook): boolean {
        return this.data.hasEBookAccess(book, this.auth.username(), this.auth.role());
    }

    requestStatus(book: EBook): 'PENDING' | 'APPROVED' | 'REJECTED' | null {
        const username = this.auth.username();
        if (!username) return null;
        return this.data.accessRequestFor(book.id, username)?.status ?? null;
    }

    openReader(book: EBook): void {
        this.readingBook.set(book);
        this.readerVisible.set(true);
    }

    openRequest(book: EBook): void {
        this.requestBook.set(book);
        this.requestNote.set('');
        this.requestVisible.set(true);
    }

    submitRequest(): void {
        const book = this.requestBook();
        if (!book || !this.requestNote().trim()) return;
        const request = this.data.requestEBookAccess(book.id, this.requestNote());
        if (!request) {
            this.msg.add({ severity: 'error', summary: 'Request failed', detail: 'Sign in again and retry the access request.' });
            return;
        }
        this.requestVisible.set(false);
        this.msg.add({
            severity: 'success',
            summary: request.status === 'PENDING' ? 'Request submitted' : 'Access already granted',
            detail: request.status === 'PENDING' ? `Your request for "${book.title}" is waiting for review.` : `You already have access to "${book.title}".`
        });
    }
}
