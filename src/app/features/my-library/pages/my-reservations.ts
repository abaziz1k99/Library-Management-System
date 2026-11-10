import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { EmptyState } from '@/app/shared/components/empty-state';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatCard } from '@/app/shared/components/stat-card';
import { AuthService } from '@/app/core/services/auth.service';
import { LibraryDataService } from '@/app/core/services/library-data.service';
import type { Reservation, ReservationStatus } from '@/app/core/models/library.models';

@Component({
    selector: 'app-my-reservations',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, CardModule, MessageModule, TableModule, TagModule, ToastModule, EmptyState, PageHeader, StatCard],
    providers: [MessageService],
    template: `
        <app-page-header title="My Reservations" subtitle="Track online reservations, pickup-ready holds and waitlist status">
            <p-button label="Reserve a Book" icon="pi pi-bookmark" routerLink="/my-library/catalog"></p-button>
        </app-page-header>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
            <app-stat-card label="Total Reservations" [value]="rows().length" context="all requests" icon="pi pi-bookmark"></app-stat-card>
            <app-stat-card label="Pending" [value]="countByStatus('PENDING')" context="waiting for a copy" icon="pi pi-clock" iconBg="orange"></app-stat-card>
            <app-stat-card label="Ready" [value]="countByStatus('READY')" context="ready for pickup" icon="pi pi-check-circle" iconBg="green"></app-stat-card>
            <app-stat-card label="Fulfilled" [value]="countByStatus('FULFILLED')" context="collected" icon="pi pi-check" iconBg="primary"></app-stat-card>
        </div>

        <p-card>
            @if (rows().length === 0) {
                <app-empty-state icon="pi pi-bookmark" title="No reservations" message="Reserve a title from the catalog to join the pickup queue." actionLabel="Browse Catalog" (action)="openCatalog()"></app-empty-state>
            } @else {
                <div class="overflow-x-auto">
                    <p-table [value]="rows()" dataKey="id" [paginator]="true" [rows]="10" [tableStyle]="{ 'min-width': '62rem' }" styleClass="w-full">
                        <ng-template pTemplate="header">
                            <tr>
                                <th>Book</th>
                                <th>Branch</th>
                                <th>Requested</th>
                                <th>Pickup Ready</th>
                                <th>Hold Expires</th>
                                <th>Status</th>
                                <th style="width: 7rem">Action</th>
                            </tr>
                        </ng-template>
                        <ng-template pTemplate="body" let-row>
                            <tr>
                                <td class="font-medium">{{ data.bookTitle(row.bookId) }}</td>
                                <td class="text-sm">{{ data.branchName(row.branchId) }}</td>
                                <td class="text-sm whitespace-nowrap">{{ formatDate(row.requestedAt) }}</td>
                                <td class="text-sm whitespace-nowrap">{{ row.readyAt ? formatDate(row.readyAt) : '—' }}</td>
                                <td class="text-sm whitespace-nowrap">{{ row.expiresAt ? formatDate(row.expiresAt) : '—' }}</td>
                                <td><p-tag [value]="statusLabel(row.status)" [severity]="statusSeverity(row.status)"></p-tag></td>
                                <td>
                                    @if (row.status === 'PENDING' || row.status === 'READY') {
                                        <p-button label="Cancel" size="small" severity="danger" [text]="true" (onClick)="cancel(row)"></p-button>
                                    } @else {
                                        <span class="text-xs text-muted-color">—</span>
                                    }
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>
                </div>
                <p-message severity="info" icon="pi pi-info-circle" styleClass="w-full mt-4">
                    Pickup-ready holds are kept for the configured hold period. Collect the copy from the circulation desk before the hold expires.
                </p-message>
            }
        </p-card>

        <p-toast></p-toast>
    `
})
export class MyReservations {
    readonly data = inject(LibraryDataService);
    readonly auth = inject(AuthService);
    private readonly msg = inject(MessageService);
    private readonly router = inject(Router);

    readonly member = computed(() => this.data.memberForUsername(this.auth.username()));

    readonly rows = computed<Reservation[]>(() => {
        const me = this.member();
        if (!me) return [];
        const rank = (status: ReservationStatus): number => (status === 'READY' ? 0 : status === 'PENDING' ? 1 : status === 'FULFILLED' ? 2 : 3);
        return this.data
            .reservations()
            .filter((reservation) => reservation.memberId === me.id)
            .sort((a, b) => rank(a.status) - rank(b.status) || new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    });

    countByStatus(status: ReservationStatus): number {
        return this.rows().filter((reservation) => reservation.status === status).length;
    }

    cancel(reservation: Reservation): void {
        try {
            this.data.cancelMyReservation(reservation.id);
            this.msg.add({ severity: 'success', summary: 'Reservation cancelled', detail: this.data.bookTitle(reservation.bookId) });
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Cancel failed', detail: error instanceof Error ? error.message : 'Something went wrong.' });
        }
    }

    openCatalog(): void {
        this.router.navigate(['/my-library/catalog']);
    }

    statusLabel(status: ReservationStatus): string {
        return status === 'PENDING' ? 'Pending' : status === 'READY' ? 'Ready' : status === 'FULFILLED' ? 'Fulfilled' : status === 'CANCELLED' ? 'Cancelled' : 'Expired';
    }

    statusSeverity(status: ReservationStatus): 'warn' | 'success' | 'info' | 'danger' | 'secondary' {
        return status === 'PENDING' ? 'warn' : status === 'READY' ? 'success' : status === 'FULFILLED' ? 'info' : 'secondary';
    }

    formatDate(value: string): string {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '—';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
}
