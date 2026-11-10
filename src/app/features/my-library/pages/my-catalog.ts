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
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { EmptyState } from '@/app/shared/components/empty-state';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatCard } from '@/app/shared/components/stat-card';
import { AuthService } from '@/app/core/services/auth.service';
import { LibraryDataService } from '@/app/core/services/library-data.service';
import type { Book } from '@/app/core/models/library.models';

@Component({
    selector: 'app-my-catalog',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, ButtonModule, CardModule, DialogModule, InputTextModule, MessageModule, SelectModule, TableModule, TagModule, TextareaModule, ToastModule, TooltipModule, EmptyState, PageHeader, StatCard],
    providers: [MessageService],
    template: `
        <app-page-header title="Library Catalog" subtitle="Search books by title, author, ISBN or category, check availability and reserve online">
            <p-button label="Suggest a Book" icon="pi pi-lightbulb" severity="secondary" [outlined]="true" (onClick)="openSuggestion()"></p-button>
            <p-button label="E-Books" icon="pi pi-book" routerLink="/my-library/resources"></p-button>
        </app-page-header>

        <div class="grid gap-4 sm:grid-cols-3 mb-6">
            <app-stat-card label="Catalog Titles" [value]="books().length" context="active records" icon="pi pi-book"></app-stat-card>
            <app-stat-card label="Available Copies" [value]="availableCopies()" context="ready to borrow" icon="pi pi-check-circle" iconBg="green"></app-stat-card>
            <app-stat-card label="My Reservations" [value]="myActiveReservations()" context="pending or ready" icon="pi pi-bookmark" iconBg="primary"></app-stat-card>
        </div>

        <p-card>
            <div class="grid gap-3 lg:grid-cols-4 mb-4">
                <span class="relative block lg:col-span-2">
                    <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-color"></i>
                    <input pInputText type="text" placeholder="Title, author, ISBN, category or subject" class="w-full pl-10" [ngModel]="search()" (ngModelChange)="search.set($event)" />
                </span>
                <p-select [ngModel]="categoryFilter()" (ngModelChange)="categoryFilter.set($event)" [options]="categoryOptions()" optionLabel="label" optionValue="value" placeholder="Category" [showClear]="true" appendTo="body" styleClass="w-full"></p-select>
                <p-select [ngModel]="availabilityFilter()" (ngModelChange)="availabilityFilter.set($event)" [options]="availabilityOptions" optionLabel="label" optionValue="value" placeholder="Availability" [showClear]="true" appendTo="body" styleClass="w-full"></p-select>
            </div>

            @if (filteredBooks().length === 0) {
                <app-empty-state icon="pi pi-search" title="No books found" message="Try a different search or clear the filters." actionLabel="Clear filters" (action)="clearFilters()"></app-empty-state>
            } @else {
                <div class="overflow-x-auto">
                    <p-table [value]="filteredBooks()" dataKey="id" [paginator]="true" [rows]="10" [rowsPerPageOptions]="[10, 25, 50]" [tableStyle]="{ 'min-width': '68rem' }" styleClass="w-full">
                        <ng-template pTemplate="header">
                            <tr>
                                <th>Book</th>
                                <th>ISBN</th>
                                <th>Category</th>
                                <th>Shelf Locations</th>
                                <th class="text-right">Available</th>
                                <th>Reservation</th>
                                <th style="width: 10rem">Actions</th>
                            </tr>
                        </ng-template>
                        <ng-template pTemplate="body" let-book>
                            <tr>
                                <td>
                                    <div class="font-medium">{{ book.title }}</div>
                                    <div class="text-xs text-muted-color">{{ book.author }} · {{ book.edition }}</div>
                                </td>
                                <td class="text-xs font-mono">{{ book.isbn || '—' }}</td>
                                <td class="text-sm">{{ book.category }}</td>
                                <td class="text-xs">{{ shelfLocations(book.id) }}</td>
                                <td class="text-right">
                                    <span class="font-medium">{{ data.copyAvailability(book.id) }}</span>
                                    <span class="text-xs text-muted-color"> / {{ data.copiesFor(book.id).length }}</span>
                                </td>
                                <td>
                                    @if (reservationFor(book); as reservation) {
                                        <p-tag [value]="reservation.status === 'READY' ? 'Ready' : 'Pending'" [severity]="reservation.status === 'READY' ? 'success' : 'warn'"></p-tag>
                                    } @else {
                                        <span class="text-xs text-muted-color">—</span>
                                    }
                                </td>
                                <td>
                                    <div class="flex items-center gap-1">
                                        <p-button icon="pi pi-eye" [rounded]="true" [text]="true" severity="info" pTooltip="Details" tooltipPosition="top" (onClick)="openDetails(book)"></p-button>
                                        <p-button
                                            label="Reserve"
                                            size="small"
                                            severity="primary"
                                            [outlined]="true"
                                            [disabled]="!canReserve(book)"
                                            (onClick)="reserve(book)"
                                        ></p-button>
                                    </div>
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>
                </div>
            }
        </p-card>

        <p-dialog [header]="selectedBook()?.title ?? 'Book Details'" [visible]="detailsVisible()" (visibleChange)="detailsVisible.set($event)" [modal]="true" [dismissableMask]="true" [style]="{ width: '720px', 'max-width': '96vw' }">
            @if (selectedBook(); as book) {
                <div class="flex flex-col gap-4">
                    <div>
                        <div class="text-sm text-muted-color">{{ book.author }} · {{ book.publisher }} {{ book.publishedYear }}</div>
                        <p class="text-sm mt-2">{{ book.description }}</p>
                        <div class="flex flex-wrap gap-1.5 mt-2">
                            <p-tag [value]="book.category" severity="secondary"></p-tag>
                            <p-tag [value]="book.edition" severity="secondary"></p-tag>
                            <p-tag [value]="book.language" severity="secondary"></p-tag>
                        </div>
                    </div>
                    <div>
                        <h3 class="text-sm font-semibold mb-2">Copies &amp; shelf locations</h3>
                        <div class="overflow-x-auto">
                            <p-table [value]="data.copiesFor(book.id)" dataKey="id" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '30rem' }">
                                <ng-template pTemplate="header">
                                    <tr>
                                        <th>Barcode</th>
                                        <th>Branch</th>
                                        <th>Shelf</th>
                                        <th>Status</th>
                                    </tr>
                                </ng-template>
                                <ng-template pTemplate="body" let-copy>
                                    <tr>
                                        <td class="font-mono text-xs">{{ copy.barcode }}</td>
                                        <td class="text-sm">{{ data.branchName(copy.branchId) }}</td>
                                        <td class="text-sm">{{ copy.shelfLocation }}</td>
                                        <td><p-tag [value]="copy.status" [severity]="copy.status === 'AVAILABLE' ? 'success' : copy.status === 'ISSUED' ? 'info' : 'warn'"></p-tag></td>
                                    </tr>
                                </ng-template>
                            </p-table>
                        </div>
                    </div>
                    <div class="flex justify-end gap-2">
                        <p-button label="Close" severity="secondary" [text]="true" (onClick)="detailsVisible.set(false)"></p-button>
                        <p-button label="Reserve This Book" icon="pi pi-bookmark" [disabled]="!canReserve(book)" (onClick)="reserve(book)"></p-button>
                    </div>
                </div>
            }
        </p-dialog>

        <p-dialog header="Suggest a Book" [visible]="suggestionVisible()" (visibleChange)="suggestionVisible.set($event)" [modal]="true" [dismissableMask]="true" [style]="{ width: '520px', 'max-width': '95vw' }">
            <div class="flex flex-col gap-4">
                <p-message severity="info" icon="pi pi-info-circle" styleClass="w-full">
                    Suggestions are sent to the library administration as acquisition requests.
                </p-message>
                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium">Title *</label>
                    <input pInputText [ngModel]="suggestTitle()" (ngModelChange)="suggestTitle.set($event)" placeholder="Book title" />
                </div>
                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium">Author</label>
                    <input pInputText [ngModel]="suggestAuthor()" (ngModelChange)="suggestAuthor.set($event)" placeholder="Author name" />
                </div>
                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium">ISBN</label>
                    <input pInputText [ngModel]="suggestIsbn()" (ngModelChange)="suggestIsbn.set($event)" placeholder="Optional ISBN" />
                </div>
                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium">Why should we add it?</label>
                    <textarea pTextarea rows="3" [ngModel]="suggestNotes()" (ngModelChange)="suggestNotes.set($event)" class="w-full" placeholder="Course, research or general interest"></textarea>
                </div>
                <div class="flex justify-end gap-2">
                    <p-button label="Cancel" severity="secondary" [text]="true" (onClick)="suggestionVisible.set(false)"></p-button>
                    <p-button label="Submit Suggestion" icon="pi pi-send" [disabled]="!suggestTitle().trim()" (onClick)="submitSuggestion()"></p-button>
                </div>
            </div>
        </p-dialog>

        <p-toast></p-toast>
    `
})
export class MyCatalog {
    readonly data = inject(LibraryDataService);
    readonly auth = inject(AuthService);
    private readonly msg = inject(MessageService);

    readonly search = signal('');
    readonly categoryFilter = signal<string | null>(null);
    readonly availabilityFilter = signal<'AVAILABLE' | 'ALL' | null>(null);

    readonly detailsVisible = signal(false);
    readonly selectedBook = signal<Book | null>(null);

    readonly suggestionVisible = signal(false);
    readonly suggestTitle = signal('');
    readonly suggestAuthor = signal('');
    readonly suggestIsbn = signal('');
    readonly suggestNotes = signal('');

    readonly member = computed(() => this.data.memberForUsername(this.auth.username()));
    readonly books = computed(() => this.data.books().filter((book) => book.status === 'ACTIVE'));
    readonly availableCopies = computed(() => this.data.bookCopies().filter((copy) => copy.status === 'AVAILABLE').length);
    readonly myActiveReservations = computed(() => {
        const me = this.member();
        return me ? this.data.reservations().filter((reservation) => reservation.memberId === me.id && (reservation.status === 'PENDING' || reservation.status === 'READY')).length : 0;
    });

    readonly categoryOptions = computed(() => [...new Set(this.books().map((book) => book.category))].sort().map((category) => ({ label: category, value: category })));

    readonly availabilityOptions = [
        { label: 'All titles', value: null },
        { label: 'Available now', value: 'AVAILABLE' }
    ];

    readonly filteredBooks = computed(() => {
        const query = this.search().trim().toLowerCase();
        const category = this.categoryFilter();
        const availability = this.availabilityFilter();
        return this.books()
            .filter((book) => {
                const haystack = `${book.title} ${book.author} ${book.isbn} ${book.category} ${book.description}`.toLowerCase();
                const matchesQuery = !query || haystack.includes(query);
                const matchesCategory = !category || book.category === category;
                const matchesAvailability = availability !== 'AVAILABLE' || this.data.copyAvailability(book.id) > 0;
                return matchesQuery && matchesCategory && matchesAvailability;
            })
            .sort((a, b) => a.title.localeCompare(b.title));
    });

    shelfLocations(bookId: string): string {
        const locations = [...new Set(this.data.copiesFor(bookId).filter((copy) => copy.status !== 'LOST').map((copy) => `${this.data.branchName(copy.branchId).split(' ')[0]}: ${copy.shelfLocation}`))];
        if (locations.length === 0) return '—';
        return locations.slice(0, 2).join(' · ') + (locations.length > 2 ? ` +${locations.length - 2}` : '');
    }

    reservationFor(book: Book) {
        const me = this.member();
        if (!me) return undefined;
        return this.data.reservations().find((reservation) => reservation.bookId === book.id && reservation.memberId === me.id && (reservation.status === 'PENDING' || reservation.status === 'READY'));
    }

    canReserve(book: Book): boolean {
        const me = this.member();
        return !!me && me.status === 'ACTIVE' && !this.reservationFor(book);
    }

    openDetails(book: Book): void {
        this.selectedBook.set(book);
        this.detailsVisible.set(true);
    }

    reserve(book: Book): void {
        try {
            const reservation = this.data.requestReservation(book.id);
            this.msg.add({ severity: 'success', summary: 'Reservation placed', detail: `${book.title} is reserved — status ${reservation.status.toLowerCase()}.` });
            this.detailsVisible.set(false);
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Reservation failed', detail: this.errorText(error) });
        }
    }

    clearFilters(): void {
        this.search.set('');
        this.categoryFilter.set(null);
        this.availabilityFilter.set(null);
    }

    openSuggestion(): void {
        this.suggestTitle.set('');
        this.suggestAuthor.set('');
        this.suggestIsbn.set('');
        this.suggestNotes.set('');
        this.suggestionVisible.set(true);
    }

    submitSuggestion(): void {
        const title = this.suggestTitle().trim();
        if (!title) return;
        try {
            this.data.suggestBook(title, this.suggestAuthor(), this.suggestNotes(), this.suggestIsbn());
            this.suggestionVisible.set(false);
            this.msg.add({ severity: 'success', summary: 'Suggestion sent', detail: `The library will review "${title}".` });
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Suggestion failed', detail: this.errorText(error) });
        }
    }

    private errorText(error: unknown): string {
        return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
    }
}
