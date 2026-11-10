import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { EmptyState } from '@/app/shared/components/empty-state';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatCard } from '@/app/shared/components/stat-card';
import { LibraryDataService } from '@/app/core/services/library-data.service';
import type { Announcement, AnnouncementAudience } from '@/app/core/models/library.models';

@Component({
    selector: 'app-announcements',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, CardModule, ConfirmDialogModule, DialogModule, InputTextModule, MessageModule, SelectModule, TableModule, TagModule, TextareaModule, ToastModule, TooltipModule, EmptyState, PageHeader, StatCard],
    providers: [ConfirmationService, MessageService],
    template: `
        <app-page-header title="Announcements & Reminders" subtitle="Send library notices, due-date reminders and reservation alerts to members">
            <p-button label="New Announcement" icon="pi pi-megaphone" (onClick)="openCreate()"></p-button>
        </app-page-header>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
            <app-stat-card label="Announcements" [value]="data.announcements().length" context="all records" icon="pi pi-megaphone"></app-stat-card>
            <app-stat-card label="Sent" [value]="sentCount()" context="delivered to members" icon="pi pi-send" iconBg="green"></app-stat-card>
            <app-stat-card label="Drafts" [value]="draftCount()" context="pending release" icon="pi pi-file-edit" iconBg="orange"></app-stat-card>
            <app-stat-card label="Email / SMS" [value]="multiChannelCount()" context="multi-channel notices" icon="pi pi-envelope" iconBg="primary"></app-stat-card>
        </div>

        <p-card>
            <div class="grid gap-3 lg:grid-cols-3 mb-4">
                <span class="relative block">
                    <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-color"></i>
                    <input pInputText type="text" placeholder="Search title or message" class="w-full pl-10" [ngModel]="search()" (ngModelChange)="search.set($event)" />
                </span>
                <p-select [ngModel]="audienceFilter()" (ngModelChange)="audienceFilter.set($event)" [options]="audienceFilterOptions" optionLabel="label" optionValue="value" placeholder="Audience" [showClear]="true" appendTo="body" styleClass="w-full"></p-select>
                <p-select [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)" [options]="statusFilterOptions" optionLabel="label" optionValue="value" placeholder="Status" [showClear]="true" appendTo="body" styleClass="w-full"></p-select>
            </div>

            @if (filtered().length === 0) {
                <app-empty-state icon="pi pi-megaphone" title="No announcements" message="Create an announcement to notify library members." actionLabel="New Announcement" (action)="openCreate()"></app-empty-state>
            } @else {
                <div class="overflow-x-auto">
                    <p-table [value]="filtered()" dataKey="id" [paginator]="true" [rows]="10" [tableStyle]="{ 'min-width': '70rem' }" styleClass="w-full">
                        <ng-template pTemplate="header">
                            <tr>
                                <th>Announcement</th>
                                <th>Audience</th>
                                <th>Branch</th>
                                <th>Channel</th>
                                <th>Status</th>
                                <th>Sent</th>
                                <th style="width: 8rem">Actions</th>
                            </tr>
                        </ng-template>
                        <ng-template pTemplate="body" let-row>
                            <tr>
                                <td>
                                    <div class="font-medium">{{ row.title }}</div>
                                    <div class="text-xs text-muted-color max-w-[26rem] truncate">{{ row.message }}</div>
                                </td>
                                <td><p-tag [value]="audienceLabel(row.audience)" severity="secondary"></p-tag></td>
                                <td class="text-sm">{{ data.branchName(row.branchId) }}</td>
                                <td class="text-sm">{{ row.channel }}</td>
                                <td><p-tag [value]="row.status" [severity]="row.status === 'SENT' ? 'success' : row.status === 'DRAFT' ? 'warn' : 'info'"></p-tag></td>
                                <td class="text-sm">
                                    @if (row.sentAt) {
                                        <div>{{ formatDate(row.sentAt) }}</div>
                                        <div class="text-xs text-muted-color">{{ row.sentBy }}</div>
                                    } @else {
                                        <span class="text-muted-color">Not sent</span>
                                    }
                                </td>
                                <td>
                                    <div class="flex items-center gap-1">
                                        @if (row.status !== 'SENT') {
                                            <p-button icon="pi pi-send" [rounded]="true" [text]="true" severity="success" pTooltip="Send now" tooltipPosition="top" (onClick)="send(row)"></p-button>
                                        }
                                        <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger" pTooltip="Delete" tooltipPosition="top" (onClick)="confirmDelete(row)"></p-button>
                                    </div>
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>
                </div>
            }
        </p-card>

        <p-dialog header="New Announcement" [visible]="dialogVisible()" (visibleChange)="dialogVisible.set($event)" [modal]="true" [dismissableMask]="true" [style]="{ width: '620px', 'max-width': '96vw' }">
            <div class="flex flex-col gap-4">
                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium">Title *</label>
                    <input pInputText [ngModel]="title()" (ngModelChange)="title.set($event)" placeholder="Announcement title" />
                </div>
                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium">Message *</label>
                    <textarea pTextarea rows="4" [ngModel]="message()" (ngModelChange)="message.set($event)" class="w-full" placeholder="Write the notice or reminder"></textarea>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Audience *</label>
                        <p-select [ngModel]="audience()" (ngModelChange)="audience.set($event)" [options]="audienceOptions" optionLabel="label" optionValue="value" appendTo="body" styleClass="w-full"></p-select>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Branch</label>
                        <p-select [ngModel]="branchId()" (ngModelChange)="branchId.set($event)" [options]="branchOptions()" optionLabel="label" optionValue="value" placeholder="All branches" [showClear]="true" appendTo="body" styleClass="w-full"></p-select>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Channel *</label>
                        <p-select [ngModel]="channel()" (ngModelChange)="channel.set($event)" [options]="channelOptions" optionLabel="label" optionValue="value" appendTo="body" styleClass="w-full"></p-select>
                    </div>
                </div>
                <p-message severity="info" icon="pi pi-info-circle" styleClass="w-full">
                    In this prototype the announcement is recorded and marked as sent immediately. Production delivery would use your email/SMS provider.
                </p-message>
                <div class="flex justify-end gap-2">
                    <p-button label="Cancel" severity="secondary" [text]="true" (onClick)="dialogVisible.set(false)"></p-button>
                    <p-button label="Send Announcement" icon="pi pi-send" [disabled]="!title().trim() || !message().trim()" (onClick)="sendNew()"></p-button>
                </div>
            </div>
        </p-dialog>

        <p-toast></p-toast>
        <p-confirmDialog></p-confirmDialog>
    `
})
export class AnnouncementsPage {
    readonly data = inject(LibraryDataService);
    private readonly confirm = inject(ConfirmationService);
    private readonly msg = inject(MessageService);

    readonly search = signal('');
    readonly audienceFilter = signal<AnnouncementAudience | null>(null);
    readonly statusFilter = signal<'DRAFT' | 'SCHEDULED' | 'SENT' | null>(null);

    readonly dialogVisible = signal(false);
    readonly title = signal('');
    readonly message = signal('');
    readonly audience = signal<AnnouncementAudience>('ALL');
    readonly branchId = signal<string | null>(null);
    readonly channel = signal<'IN_APP' | 'EMAIL' | 'SMS' | 'ALL'>('ALL');

    readonly audienceOptions = [
        { label: 'All members', value: 'ALL' as AnnouncementAudience },
        { label: 'Students', value: 'STUDENT' as AnnouncementAudience },
        { label: 'Teachers', value: 'TEACHER' as AnnouncementAudience },
        { label: 'Staff', value: 'STAFF' as AnnouncementAudience }
    ];

    readonly audienceFilterOptions = [{ label: 'All Audiences', value: null }, ...this.audienceOptions];

    readonly statusFilterOptions = [
        { label: 'All Statuses', value: null },
        { label: 'Sent', value: 'SENT' },
        { label: 'Draft', value: 'DRAFT' },
        { label: 'Scheduled', value: 'SCHEDULED' }
    ];

    readonly channelOptions = [
        { label: 'In-app + Email + SMS', value: 'ALL' as const },
        { label: 'In-app only', value: 'IN_APP' as const },
        { label: 'Email', value: 'EMAIL' as const },
        { label: 'SMS', value: 'SMS' as const }
    ];

    readonly branchOptions = computed(() => this.data.branches().map((branch) => ({ label: branch.name, value: branch.id })));

    readonly sentCount = computed(() => this.data.announcements().filter((announcement) => announcement.status === 'SENT').length);
    readonly draftCount = computed(() => this.data.announcements().filter((announcement) => announcement.status === 'DRAFT').length);
    readonly multiChannelCount = computed(() => this.data.announcements().filter((announcement) => announcement.channel === 'EMAIL' || announcement.channel === 'SMS' || announcement.channel === 'ALL').length);

    readonly filtered = computed(() => {
        const query = this.search().trim().toLowerCase();
        const audience = this.audienceFilter();
        const status = this.statusFilter();
        return this.data
            .announcements()
            .filter((announcement) => {
                const matchesAudience = !audience || announcement.audience === audience;
                const matchesStatus = !status || announcement.status === status;
                const haystack = `${announcement.title} ${announcement.message}`.toLowerCase();
                return matchesAudience && matchesStatus && (!query || haystack.includes(query));
            })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    });

    openCreate(): void {
        this.title.set('');
        this.message.set('');
        this.audience.set('ALL');
        this.branchId.set(null);
        this.channel.set('ALL');
        this.dialogVisible.set(true);
    }

    sendNew(): void {
        const title = this.title().trim();
        const message = this.message().trim();
        if (!title || !message) return;
        try {
            this.data.createAnnouncement({
                title,
                message,
                audience: this.audience(),
                branchId: this.branchId(),
                channel: this.channel()
            });
            this.dialogVisible.set(false);
            this.msg.add({ severity: 'success', summary: 'Announcement sent', detail: `"${title}" was sent to ${this.audienceLabel(this.audience()).toLowerCase()}.` });
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Send failed', detail: this.errorText(error) });
        }
    }

    send(announcement: Announcement): void {
        try {
            this.data.sendAnnouncement(announcement.id);
            this.msg.add({ severity: 'success', summary: 'Announcement sent', detail: announcement.title });
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Send failed', detail: this.errorText(error) });
        }
    }

    confirmDelete(announcement: Announcement): void {
        this.confirm.confirm({
            message: `Delete announcement "${announcement.title}"?`,
            header: 'Delete Announcement',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Delete',
            rejectLabel: 'Cancel',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                try {
                    this.data.removeAnnouncement(announcement.id);
                    this.msg.add({ severity: 'success', summary: 'Announcement deleted', detail: announcement.title });
                } catch (error) {
                    this.msg.add({ severity: 'error', summary: 'Delete failed', detail: this.errorText(error) });
                }
            }
        });
    }

    audienceLabel(audience: AnnouncementAudience): string {
        return audience === 'ALL' ? 'All members' : audience === 'STUDENT' ? 'Students' : audience === 'TEACHER' ? 'Teachers' : 'Staff';
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
