import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { PageHeader } from '@/app/shared/components/page-header';
import { AuthService, PortalRole, ROLE_LABELS } from '@/app/core/services/auth.service';

const ROLE_MODULES: Record<Exclude<PortalRole, 'SUPER_ADMIN'>, string[]> = {
    LIBRARY_ADMIN: [
        'Library dashboard, availability and circulation statistics',
        'Book catalog, copies, ISBN and shelf locations',
        'QR codes, barcodes and membership records',
        'Issue, return, renewal and reservation approvals',
        'Fines, payments, waivers and acquisitions',
        'Digital resources, inventory and branch reports'
    ],
    LIBRARY_STAFF: [
        'Operations dashboard and daily reports',
        'Scan member IDs and book QR/barcodes',
        'Verify eligibility, issue and return books',
        'Process renewals, reservations and pickups',
        'Record damaged, lost or missing copies',
        'Inventory verification and member assistance'
    ],
    TEACHER: [
        'Personal library dashboard',
        'Catalog search, availability and shelf locations',
        'Reservations, renewals and borrowing history',
        'Digital membership card with QR code',
        'E-books, journals, papers and theses',
        'Fine history, notifications and recommendations'
    ],
    STUDENT: [
        'Personal library dashboard',
        'Search by title, author, ISBN, category or subject',
        'Reservations, renewals and due dates',
        'Digital membership card with QR code',
        'Lecture references, papers and theses',
        'Fine status, reminders and book suggestions'
    ]
};

@Component({
    selector: 'app-portal-coming-soon',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, CardModule, TagModule, PageHeader],
    template: `
        <app-page-header [title]="roleLabel() + ' Portal'" subtitle="Your role is recognised — the self-service workspace is the next implementation phase">
            <p-button label="E-Book Library" icon="pi pi-book" routerLink="/ebooks"></p-button>
            <p-button label="Sign out" icon="pi pi-sign-out" severity="secondary" [outlined]="true" (onClick)="logout()"></p-button>
        </app-page-header>

        <p-card>
            <div class="flex flex-col lg:flex-row gap-6 lg:items-center">
                <div class="w-16 h-16 rounded-2xl flex items-center justify-center bg-primary-100 dark:bg-primary-950 text-primary text-2xl shrink-0">
                    <i [class]="roleIcon()"></i>
                </div>
                <div class="flex-1">
                    <div class="flex items-center gap-2 flex-wrap">
                        <h2 class="text-xl font-semibold">{{ roleLabel() }}</h2>
                        <p-tag value="Portal planned" severity="info"></p-tag>
                    </div>
                    <p class="text-sm text-muted-color mt-1">
                        Phase 1 implements the Super Admin workspace. The features below are reserved for this role and will be connected next.
                    </p>
                </div>
                <a pButton label="View Super Admin demo" icon="pi pi-shield" routerLink="/auth/login" class="no-underline"></a>
            </div>
        </p-card>

        <p-card styleClass="mt-4">
            <ng-template pTemplate="header">
                <div class="px-4 pt-4">
                    <h2 class="text-lg font-semibold">Planned Features</h2>
                    <p class="text-xs text-muted-color mt-0.5">From the Paperless Library Management System role specification</p>
                </div>
            </ng-template>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                @for (module of modules(); track module) {
                    <div class="flex items-start gap-3 rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                        <i class="pi pi-check-circle text-green-600 mt-0.5"></i>
                        <span class="text-sm">{{ module }}</span>
                    </div>
                }
            </div>
        </p-card>
    `
})
export class PortalComingSoon {
    private readonly auth = inject(AuthService);

    readonly roleLabel = computed(() => (this.auth.role() ? ROLE_LABELS[this.auth.role() as PortalRole] : 'Library'));
    readonly roleIcon = computed(() => {
        switch (this.auth.role()) {
            case 'LIBRARY_ADMIN':
                return 'pi pi-building-columns';
            case 'LIBRARY_STAFF':
                return 'pi pi-id-card';
            case 'TEACHER':
                return 'pi pi-graduation-cap';
            default:
                return 'pi pi-user';
        }
    });

    readonly modules = computed(() => {
        const role = this.auth.role();
        if (!role || role === 'SUPER_ADMIN') return [];
        return ROLE_MODULES[role];
    });

    logout(): void {
        this.auth.logout();
        window.location.href = '/auth/login';
    }
}
