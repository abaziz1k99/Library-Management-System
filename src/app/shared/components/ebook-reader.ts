import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import type { EBook } from '@/app/core/models/library.models';

@Component({
    selector: 'app-ebook-reader',
    standalone: true,
    imports: [CommonModule, ButtonModule, DialogModule, TagModule],
    template: `
        <p-dialog
            [header]="book?.title ?? 'E-Book Reader'"
            [visible]="visible"
            (visibleChange)="visibleChange.emit($event)"
            [modal]="true"
            [dismissableMask]="true"
            [style]="{ width: 'min(1040px, 96vw)' }"
            [contentStyle]="{ height: '72vh', padding: '0' }"
        >
            @if (book) {
                <div class="h-full flex flex-col">
                    <div class="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800">
                        <p-tag [value]="book.accessLevel === 'OPEN' ? 'Open access' : 'Special permission'" [severity]="book.accessLevel === 'OPEN' ? 'success' : 'warn'"></p-tag>
                        <span class="text-sm text-muted-color">{{ book.author }}</span>
                        <span class="text-xs text-muted-color">·</span>
                        <span class="text-xs text-muted-color">{{ book.category }}</span>
                        @if (book.fileName) {
                            <span class="text-xs text-muted-color">· {{ book.fileName }}</span>
                        }
                        <span class="ml-auto flex items-center gap-2">
                            @if (book.downloadAllowed && book.dataUrl) {
                                <a pButton [href]="book.dataUrl" [download]="book.fileName ?? book.title" label="Download" icon="pi pi-download" size="small" severity="secondary" [outlined]="true"></a>
                            }
                            <p-button label="Close" icon="pi pi-times" size="small" [text]="true" (onClick)="visibleChange.emit(false)"></p-button>
                        </span>
                    </div>

                    <div class="flex-1 overflow-auto bg-surface-100 dark:bg-surface-950">
                        @if (isPdf()) {
                            <iframe [src]="safeUrl()" class="w-full h-full border-0" title="E-book PDF reader"></iframe>
                        } @else if (isText()) {
                            <article class="max-w-4xl mx-auto bg-surface-0 dark:bg-surface-900 my-4 p-6 sm:p-10 rounded-lg shadow-sm">
                                <h1 class="text-2xl font-semibold mb-1">{{ book.title }}</h1>
                                <p class="text-sm text-muted-color mb-6">{{ book.author }} · {{ book.publisher }} {{ book.publishedYear }}</p>
                                <pre class="whitespace-pre-wrap font-sans text-sm leading-relaxed">{{ textContent() }}</pre>
                            </article>
                        } @else if (isEpub()) {
                            <div class="h-full flex flex-col items-center justify-center gap-3 p-8 text-center">
                                <i class="pi pi-book text-4xl text-muted-color"></i>
                                <h3 class="text-lg font-semibold">EPUB format</h3>
                                <p class="text-sm text-muted-color max-w-md">EPUB files cannot be rendered inline in the browser reader. Download the file and open it in your e-book application.</p>
                                @if (book.downloadAllowed && book.dataUrl) {
                                    <a pButton [href]="book.dataUrl" [download]="book.fileName ?? book.title" label="Download EPUB" icon="pi pi-download"></a>
                                }
                            </div>
                        } @else {
                            <article class="max-w-4xl mx-auto bg-surface-0 dark:bg-surface-900 my-4 p-6 sm:p-10 rounded-lg shadow-sm">
                                <h1 class="text-2xl font-semibold mb-1">{{ book.title }}</h1>
                                <p class="text-sm text-muted-color mb-6">{{ book.author }} · {{ book.publisher }} {{ book.publishedYear }}</p>
                                <div class="rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 p-3 mb-6">
                                    <p class="text-xs text-muted-color">No digital file is attached to this record. The library preview is shown below.</p>
                                </div>
                                <pre class="whitespace-pre-wrap font-sans text-sm leading-relaxed">{{ book.excerpt || book.description }}</pre>
                            </article>
                        }
                    </div>

                    <div class="px-4 py-2 border-t border-surface-200 dark:border-surface-700 text-xs text-muted-color flex flex-wrap gap-x-4 gap-y-1">
                        <span>ISBN {{ book.isbn || '—' }}</span>
                        <span>{{ book.pages }} pages</span>
                        <span>{{ book.language }}</span>
                        <span>{{ fileLabel() }}</span>
                    </div>
                </div>
            }
        </p-dialog>
    `
})
export class EBookReader {
    private readonly sanitizer = inject(DomSanitizer);

    @Input() book: EBook | null = null;
    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();

    isPdf(): boolean {
        const type = this.book?.fileType ?? '';
        const name = this.book?.fileName?.toLowerCase() ?? '';
        return type === 'application/pdf' || name.endsWith('.pdf');
    }

    isText(): boolean {
        const type = this.book?.fileType ?? '';
        const name = this.book?.fileName?.toLowerCase() ?? '';
        return type.startsWith('text/') || name.endsWith('.txt');
    }

    isEpub(): boolean {
        const type = this.book?.fileType ?? '';
        const name = this.book?.fileName?.toLowerCase() ?? '';
        return type === 'application/epub+zip' || name.endsWith('.epub');
    }

    safeUrl(): SafeResourceUrl {
        return this.sanitizer.bypassSecurityTrustResourceUrl(this.book?.dataUrl ?? '');
    }

    textContent(): string {
        const url = this.book?.dataUrl;
        if (!url) return this.book?.excerpt ?? '';
        const comma = url.indexOf(',');
        if (comma === -1) return this.book?.excerpt ?? '';
        const metadata = url.slice(0, comma);
        const payload = url.slice(comma + 1);
        try {
            if (metadata.includes(';base64')) {
                const binary = atob(payload);
                const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
                return new TextDecoder().decode(bytes);
            }
            return decodeURIComponent(payload);
        } catch {
            return this.book?.excerpt ?? '';
        }
    }

    fileLabel(): string {
        if (!this.book?.fileName) return 'Metadata preview';
        const size = this.book.fileSize;
        if (!size) return this.book.fileName;
        const kb = size / 1024;
        return `${this.book.fileName} · ${kb >= 1024 ? (kb / 1024).toFixed(1) + ' MB' : kb.toFixed(0) + ' KB'}`;
    }
}
