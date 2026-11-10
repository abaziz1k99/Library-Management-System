import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { EmptyState } from '@/app/shared/components/empty-state';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatCard } from '@/app/shared/components/stat-card';
import { StatusTag } from '@/app/shared/components/status-tag';
import { LibraryDataService } from '@/app/core/services/library-data.service';
import type { LibraryMember, MemberStatus, MemberType } from '@/app/core/models/library.models';

interface MemberFormValue {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    memberType: MemberType;
    branchId: string;
    department: string;
    status: MemberStatus;
    joinedAt: string;
    expiresAt: string;
}

@Component({
    selector: 'app-members',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
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
        EmptyState,
        PageHeader,
        StatCard,
        StatusTag
    ],
    providers: [ConfirmationService, MessageService],
    template: `
        <app-page-header title="Library Memberships" subtitle="Register, verify and maintain student, teacher and staff library memberships">
            <p-button label="Add Member" icon="pi pi-user-plus" (onClick)="openCreate()"></p-button>
        </app-page-header>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
            <app-stat-card label="Members" [value]="data.members().length" context="registered memberships" icon="pi pi-users"></app-stat-card>
            <app-stat-card label="Active" [value]="activeCount()" context="eligible to borrow" icon="pi pi-check-circle" iconBg="green"></app-stat-card>
            <app-stat-card label="Expiring Soon" [value]="expiringCount()" context="within 60 days" icon="pi pi-clock" iconBg="orange"></app-stat-card>
            <app-stat-card label="Suspended" [value]="suspendedCount()" context="borrowing blocked" icon="pi pi-ban" iconBg="red"></app-stat-card>
        </div>

        <p-card>
            <div class="grid gap-3 lg:grid-cols-5 mb-4">
                <span class="relative block lg:col-span-2">
                    <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-color"></i>
                    <input pInputText type="text" placeholder="Search name, membership no. or email" class="w-full pl-10" [ngModel]="search()" (ngModelChange)="search.set($event)" />
                </span>
                <p-select [ngModel]="typeFilter()" (ngModelChange)="typeFilter.set($event)" [options]="typeFilterOptions" optionLabel="label" optionValue="value" placeholder="Member type" [showClear]="true" appendTo="body" styleClass="w-full"></p-select>
                <p-select [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)" [options]="statusFilterOptions" optionLabel="label" optionValue="value" placeholder="Status" [showClear]="true" appendTo="body" styleClass="w-full"></p-select>
                <p-select [ngModel]="branchFilter()" (ngModelChange)="branchFilter.set($event)" [options]="branchFilterOptions()" optionLabel="label" optionValue="value" placeholder="Branch" [showClear]="true" appendTo="body" styleClass="w-full"></p-select>
            </div>

            @if (filteredMembers().length === 0) {
                <app-empty-state icon="pi pi-users" title="No members found" message="Add a member or adjust the filters." actionLabel="Add Member" (action)="openCreate()"></app-empty-state>
            } @else {
                <div class="overflow-x-auto">
                    <p-table [value]="filteredMembers()" dataKey="id" [paginator]="true" [rows]="10" [rowsPerPageOptions]="[10, 25, 50]" [tableStyle]="{ 'min-width': '74rem' }" styleClass="w-full">
                        <ng-template pTemplate="header">
                            <tr>
                                <th>Member</th>
                                <th>Membership No.</th>
                                <th>Type</th>
                                <th>Contact</th>
                                <th>Branch</th>
                                <th>Department</th>
                                <th>Status</th>
                                <th>Expires</th>
                                <th style="width: 9rem">Actions</th>
                            </tr>
                        </ng-template>
                        <ng-template pTemplate="body" let-row>
                            <tr>
                                <td>
                                    <div class="font-medium">{{ row.firstName }} {{ row.lastName }}</div>
                                    <div class="text-xs text-muted-color">{{ row.email }}</div>
                                </td>
                                <td class="font-mono text-xs">{{ row.membershipNo }}</td>
                                <td><p-tag [value]="typeLabel(row.memberType)" severity="secondary" [rounded]="true"></p-tag></td>
                                <td class="text-sm">{{ row.phone || '—' }}</td>
                                <td class="text-sm">{{ data.branchName(row.branchId) }}</td>
                                <td class="text-sm">{{ row.department }}</td>
                                <td><app-status-tag [status]="row.status"></app-status-tag></td>
                                <td class="text-sm whitespace-nowrap">{{ formatDate(row.expiresAt) }}</td>
                                <td>
                                    <div class="flex items-center gap-1">
                                        <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" severity="info" pTooltip="Edit membership" tooltipPosition="top" (onClick)="openEdit(row)"></p-button>
                                        <p-button
                                            [icon]="row.status === 'ACTIVE' ? 'pi pi-ban' : 'pi pi-check-circle'"
                                            [rounded]="true"
                                            [text]="true"
                                            [severity]="row.status === 'ACTIVE' ? 'warn' : 'success'"
                                            [pTooltip]="row.status === 'ACTIVE' ? 'Suspend membership' : 'Activate membership'"
                                            tooltipPosition="top"
                                            (onClick)="toggleStatus(row)"
                                        ></p-button>
                                        <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger" pTooltip="Remove membership" tooltipPosition="top" (onClick)="confirmDelete(row)"></p-button>
                                    </div>
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>
                </div>
            }
        </p-card>

        <p-dialog [header]="editingMember() ? 'Edit Membership' : 'Add Member'" [visible]="dialogVisible()" (visibleChange)="dialogVisible.set($event)" [modal]="true" [dismissableMask]="true" [style]="{ width: '680px', 'max-width': '96vw' }" (onHide)="closeDialog()">
            <form [formGroup]="form" (ngSubmit)="save()" class="flex flex-col gap-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium" for="firstName">First Name *</label>
                        <input pInputText id="firstName" formControlName="firstName" />
                        @if (form.controls.firstName.touched && form.controls.firstName.invalid) {
                            <small class="text-red-500">First name is required.</small>
                        }
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium" for="lastName">Last Name *</label>
                        <input pInputText id="lastName" formControlName="lastName" />
                        @if (form.controls.lastName.touched && form.controls.lastName.invalid) {
                            <small class="text-red-500">Last name is required.</small>
                        }
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium" for="memberEmail">Email *</label>
                        <input pInputText id="memberEmail" type="email" formControlName="email" />
                        @if (form.controls.email.touched && form.controls.email.invalid) {
                            <small class="text-red-500">A valid email is required.</small>
                        }
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium" for="memberPhone">Phone</label>
                        <input pInputText id="memberPhone" formControlName="phone" />
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Member Type *</label>
                        <p-select formControlName="memberType" [options]="typeOptions" optionLabel="label" optionValue="value" appendTo="body" styleClass="w-full"></p-select>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Branch *</label>
                        <p-select formControlName="branchId" [options]="branchOptions()" optionLabel="label" optionValue="value" appendTo="body" styleClass="w-full"></p-select>
                    </div>
                    <div class="flex flex-col gap-1.5 sm:col-span-2">
                        <label class="text-sm font-medium" for="department">Department / Unit</label>
                        <input pInputText id="department" formControlName="department" />
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Status *</label>
                        <p-select formControlName="status" [options]="statusOptions" optionLabel="label" optionValue="value" appendTo="body" styleClass="w-full"></p-select>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium" for="joinedAt">Joined</label>
                        <input pInputText id="joinedAt" type="date" formControlName="joinedAt" />
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium" for="expiresAt">Expires</label>
                        <input pInputText id="expiresAt" type="date" formControlName="expiresAt" />
                    </div>
                </div>
                <div class="flex justify-end gap-2 pt-2">
                    <p-button label="Cancel" severity="secondary" [text]="true" (onClick)="closeDialog()"></p-button>
                    <p-button [label]="editingMember() ? 'Save Changes' : 'Add Member'" icon="pi pi-save" type="submit"></p-button>
                </div>
            </form>
        </p-dialog>

        <p-toast></p-toast>
        <p-confirmDialog></p-confirmDialog>
    `
})
export class MembersPage {
    readonly data = inject(LibraryDataService);
    private readonly fb = inject(FormBuilder);
    private readonly confirm = inject(ConfirmationService);
    private readonly msg = inject(MessageService);

    readonly search = signal('');
    readonly typeFilter = signal<MemberType | null>(null);
    readonly statusFilter = signal<MemberStatus | null>(null);
    readonly branchFilter = signal<string | null>(null);

    readonly dialogVisible = signal(false);
    readonly editingMember = signal<LibraryMember | null>(null);

    readonly typeOptions = [
        { label: 'Student', value: 'STUDENT' as MemberType },
        { label: 'Teacher / Faculty', value: 'TEACHER' as MemberType },
        { label: 'Staff', value: 'STAFF' as MemberType }
    ];

    readonly typeFilterOptions = [{ label: 'All Types', value: null }, ...this.typeOptions];

    readonly statusOptions = [
        { label: 'Active', value: 'ACTIVE' as MemberStatus },
        { label: 'Inactive', value: 'INACTIVE' as MemberStatus },
        { label: 'Suspended', value: 'SUSPENDED' as MemberStatus },
        { label: 'Expired', value: 'EXPIRED' as MemberStatus },
        { label: 'Pending', value: 'PENDING' as MemberStatus }
    ];

    readonly statusFilterOptions = [{ label: 'All Statuses', value: null }, ...this.statusOptions];

    readonly form = this.fb.group({
        firstName: ['', Validators.required],
        lastName: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        phone: [''],
        memberType: ['STUDENT' as MemberType, Validators.required],
        branchId: ['', Validators.required],
        department: [''],
        status: ['ACTIVE' as MemberStatus, Validators.required],
        joinedAt: [this.today(), Validators.required],
        expiresAt: [this.oneYearLater(), Validators.required]
    });

    readonly branchOptions = computed(() => this.data.branches().map((branch) => ({ label: branch.name, value: branch.id })));
    readonly branchFilterOptions = computed(() => [{ label: 'All Branches', value: null }, ...this.branchOptions()]);

    readonly activeCount = computed(() => this.data.members().filter((member) => member.status === 'ACTIVE').length);
    readonly suspendedCount = computed(() => this.data.members().filter((member) => member.status === 'SUSPENDED').length);
    readonly expiringCount = computed(() => {
        const threshold = Date.now() + 60 * 86400000;
        return this.data.members().filter((member) => {
            const expiry = new Date(member.expiresAt).getTime();
            return member.status === 'ACTIVE' && expiry > Date.now() && expiry <= threshold;
        }).length;
    });

    readonly filteredMembers = computed(() => {
        const query = this.search().trim().toLowerCase();
        const type = this.typeFilter();
        const status = this.statusFilter();
        const branchId = this.branchFilter();
        return this.data
            .members()
            .filter((member) => {
                const matchesType = !type || member.memberType === type;
                const matchesStatus = !status || member.status === status;
                const matchesBranch = !branchId || member.branchId === branchId;
                const matchesQuery =
                    !query ||
                    `${member.firstName} ${member.lastName}`.toLowerCase().includes(query) ||
                    member.membershipNo.toLowerCase().includes(query) ||
                    member.email.toLowerCase().includes(query);
                return matchesType && matchesStatus && matchesBranch && matchesQuery;
            })
            .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
    });

    openCreate(): void {
        this.editingMember.set(null);
        this.form.reset({
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            memberType: 'STUDENT',
            branchId: '',
            department: '',
            status: 'ACTIVE',
            joinedAt: this.today(),
            expiresAt: this.oneYearLater()
        });
        this.dialogVisible.set(true);
    }

    openEdit(member: LibraryMember): void {
        this.editingMember.set(member);
        this.form.reset({
            firstName: member.firstName,
            lastName: member.lastName,
            email: member.email,
            phone: member.phone,
            memberType: member.memberType,
            branchId: member.branchId,
            department: member.department,
            status: member.status,
            joinedAt: member.joinedAt,
            expiresAt: member.expiresAt
        });
        this.dialogVisible.set(true);
    }

    closeDialog(): void {
        this.dialogVisible.set(false);
        this.editingMember.set(null);
    }

    save(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.msg.add({ severity: 'warn', summary: 'Validation', detail: 'Complete the required membership details.' });
            return;
        }
        const value = this.form.getRawValue() as MemberFormValue;
        try {
            const editing = this.editingMember();
            if (editing) {
                this.data.updateMember({ ...editing, ...value });
                this.msg.add({ severity: 'success', summary: 'Membership updated', detail: `${value.firstName} ${value.lastName} has been updated.` });
            } else {
                this.data.createMember({ ...value });
                this.msg.add({ severity: 'success', summary: 'Member added', detail: `${value.firstName} ${value.lastName} has been registered.` });
            }
            this.closeDialog();
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Save failed', detail: this.errorText(error) });
        }
    }

    toggleStatus(member: LibraryMember): void {
        const next: MemberStatus = member.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
        try {
            this.data.setMemberStatus(member.id, next);
            this.msg.add({ severity: 'success', summary: 'Status updated', detail: `${member.firstName} ${member.lastName} is now ${next.toLowerCase()}.` });
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Update failed', detail: this.errorText(error) });
        }
    }

    confirmDelete(member: LibraryMember): void {
        this.confirm.confirm({
            message: `Remove the membership for "${member.firstName} ${member.lastName}"?`,
            header: 'Remove Membership',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Remove',
            rejectLabel: 'Cancel',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                try {
                    this.data.removeMember(member.id);
                    this.msg.add({ severity: 'success', summary: 'Membership removed', detail: `${member.firstName} ${member.lastName} has been removed.` });
                } catch (error) {
                    this.msg.add({ severity: 'error', summary: 'Delete failed', detail: this.errorText(error) });
                }
            }
        });
    }

    typeLabel(type: MemberType): string {
        return type === 'STUDENT' ? 'Student' : type === 'TEACHER' ? 'Teacher' : 'Staff';
    }

    formatDate(value: string): string {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '—';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    private today(): string {
        return new Date().toISOString().slice(0, 10);
    }

    private oneYearLater(): string {
        return new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
    }

    private errorText(error: unknown): string {
        return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
    }
}
