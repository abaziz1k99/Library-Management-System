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
import { StatusTag } from '@/app/shared/components/status-tag';
import { LibraryDataService } from '@/app/core/services/library-data.service';
import type { AccountStatus, LibraryRole, LibraryUser } from '@/app/core/models/library.models';

interface AccountOption<T> {
    label: string;
    value: T;
}

interface AccountFormValue {
    name: string;
    username: string;
    email: string;
    phone: string;
    role: LibraryRole;
    status: AccountStatus;
    branchId: string | null;
}

@Component({
    selector: 'app-accounts-list',
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
        StatusTag
    ],
    providers: [ConfirmationService, MessageService],
    template: `
        <app-page-header title="User Accounts" subtitle="Create, update, activate and deactivate library administrators, staff and member accounts">
            <p-button label="Create Account" icon="pi pi-user-plus" (onClick)="openCreate()"></p-button>
        </app-page-header>

        <div class="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            @for (role of roleSummary(); track role.role) {
                <div class="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 p-3">
                    <div class="flex items-center gap-2 text-xs text-muted-color">
                        <i [class]="role.icon" class="text-primary"></i>
                        {{ role.label }}
                    </div>
                    <div class="text-xl font-semibold mt-1.5">{{ role.count }}</div>
                </div>
            }
        </div>

        <p-card>
            <div class="grid gap-3 lg:grid-cols-4 mb-4">
                <span class="relative block">
                    <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-color"></i>
                    <input pInputText type="text" placeholder="Search name, username or email" class="w-full pl-10" [ngModel]="search()" (ngModelChange)="search.set($event)" />
                </span>
                <p-select [ngModel]="roleFilter()" (ngModelChange)="roleFilter.set($event)" [options]="roleFilterOptions" optionLabel="label" optionValue="value" placeholder="Role" [showClear]="true" appendTo="body" styleClass="w-full"></p-select>
                <p-select [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)" [options]="statusFilterOptions" optionLabel="label" optionValue="value" placeholder="Status" [showClear]="true" appendTo="body" styleClass="w-full"></p-select>
                <p-select [ngModel]="branchFilter()" (ngModelChange)="branchFilter.set($event)" [options]="branchFilterOptions()" optionLabel="label" optionValue="value" placeholder="Branch" [showClear]="true" [filter]="true" appendTo="body" styleClass="w-full"></p-select>
            </div>

            <div class="flex flex-wrap items-center gap-3 mb-3 text-xs text-muted-color">
                <span>Showing {{ filteredUsers().length }} of {{ data.users().length }} account(s)</span>
                <span class="inline-flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                    {{ activeCount() }} active
                </span>
                <span class="inline-flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                    {{ suspendedCount() }} suspended
                </span>
                @if (hasFilters()) {
                    <a class="text-primary cursor-pointer underline" (click)="clearFilters()">Clear filters</a>
                }
            </div>

            @if (data.users().length === 0) {
                <app-empty-state icon="pi pi-users" title="No accounts yet" message="Create the first account to give library staff access." actionLabel="Create Account" (action)="openCreate()"></app-empty-state>
            } @else if (filteredUsers().length === 0) {
                <app-empty-state icon="pi pi-search" title="No matching accounts" message="Adjust the filters to see more accounts." actionLabel="Clear filters" (action)="clearFilters()"></app-empty-state>
            } @else {
                <div class="overflow-x-auto">
                    <p-table [value]="filteredUsers()" dataKey="id" [paginator]="true" [rows]="10" [rowsPerPageOptions]="[10, 25, 50]" [tableStyle]="{ 'min-width': '70rem' }" styleClass="w-full">
                        <ng-template pTemplate="header">
                            <tr>
                                <th>Account</th>
                                <th>Username / Email</th>
                                <th>Role</th>
                                <th>Branch</th>
                                <th>Status</th>
                                <th>Last Login</th>
                                <th style="width: 8rem">Actions</th>
                            </tr>
                        </ng-template>
                        <ng-template pTemplate="body" let-row>
                            <tr>
                                <td>
                                    <div class="font-medium">{{ row.name }}</div>
                                    <div class="text-xs text-muted-color">{{ row.phone || 'No phone' }}</div>
                                </td>
                                <td class="text-sm">
                                    <div class="font-mono text-xs">{{ row.username }}</div>
                                    <div class="text-xs text-muted-color break-all">{{ row.email }}</div>
                                </td>
                                <td><p-tag [value]="data.roleLabel(row.role)" severity="secondary" [rounded]="true"></p-tag></td>
                                <td class="text-sm">{{ data.branchName(row.branchId) }}</td>
                                <td><app-status-tag [status]="row.status"></app-status-tag></td>
                                <td class="text-sm">
                                    @if (row.lastLogin) {
                                        <div>{{ lastLoginLabel(row.lastLogin) }}</div>
                                        <div class="text-xs text-muted-color">{{ relativeLogin(row.lastLogin) }}</div>
                                    } @else {
                                        <span class="text-muted-color">Never</span>
                                    }
                                </td>
                                <td>
                                    <div class="flex items-center gap-1">
                                        <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" severity="info" pTooltip="Edit account" tooltipPosition="top" (onClick)="openEdit(row)"></p-button>
                                        <p-button
                                            [icon]="row.status === 'ACTIVE' ? 'pi pi-ban' : 'pi pi-check-circle'"
                                            [rounded]="true"
                                            [text]="true"
                                            [severity]="row.status === 'ACTIVE' ? 'warn' : 'success'"
                                            [pTooltip]="row.status === 'ACTIVE' ? 'Deactivate account' : 'Activate account'"
                                            tooltipPosition="top"
                                            (onClick)="confirmToggle(row)"
                                        ></p-button>
                                        <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger" pTooltip="Delete account" tooltipPosition="top" (onClick)="confirmDelete(row)"></p-button>
                                    </div>
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>
                </div>
            }
        </p-card>

        <p-message severity="info" icon="pi pi-info-circle" styleClass="w-full mt-4">
            Demonstration authentication is simulated in the browser. Passwords are not stored for accounts created here.
        </p-message>

        <p-dialog
            [header]="editingUser() ? 'Edit Account' : 'Create Account'"
            [visible]="dialogVisible()"
            (visibleChange)="dialogVisible.set($event)"
            [modal]="true"
            [dismissableMask]="true"
            [style]="{ width: '620px', 'max-width': '95vw' }"
            (onHide)="closeDialog()"
        >
            <form [formGroup]="form" (ngSubmit)="save()" class="flex flex-col gap-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium" for="accountName">Full Name *</label>
                        <input pInputText id="accountName" formControlName="name" placeholder="e.g. Rafiqul Islam" />
                        @if (form.controls.name.touched && form.controls.name.invalid) {
                            <small class="text-red-500">Full name is required.</small>
                        }
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium" for="accountUsername">Username *</label>
                        <input pInputText id="accountUsername" formControlName="username" placeholder="e.g. librarian" />
                        @if (form.controls.username.touched && form.controls.username.invalid) {
                            <small class="text-red-500">Username is required.</small>
                        }
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium" for="accountEmail">Email *</label>
                        <input pInputText id="accountEmail" type="email" formControlName="email" placeholder="name@university.edu" />
                        @if (form.controls.email.touched && form.controls.email.hasError('required')) {
                            <small class="text-red-500">Email is required.</small>
                        }
                        @if (form.controls.email.touched && form.controls.email.hasError('email')) {
                            <small class="text-red-500">Enter a valid email address.</small>
                        }
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium" for="accountPhone">Phone</label>
                        <input pInputText id="accountPhone" formControlName="phone" placeholder="+880 ..." />
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Role *</label>
                        <p-select formControlName="role" [options]="roleOptions" optionLabel="label" optionValue="value" appendTo="body" styleClass="w-full"></p-select>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Branch</label>
                        <p-select formControlName="branchId" [options]="branchOptions()" optionLabel="label" optionValue="value" placeholder="All branches" [showClear]="true" [filter]="true" appendTo="body" styleClass="w-full"></p-select>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Status *</label>
                        <p-select formControlName="status" [options]="statusOptions" optionLabel="label" optionValue="value" appendTo="body" styleClass="w-full"></p-select>
                    </div>
                </div>

                <p-message severity="info" icon="pi pi-shield" styleClass="w-full">
                    Role permissions are configured under Roles &amp; Permissions. Super Admin accounts are not branch-specific.
                </p-message>

                <div class="flex justify-end gap-2 pt-2">
                    <p-button label="Cancel" severity="secondary" [text]="true" (onClick)="closeDialog()"></p-button>
                    <p-button [label]="editingUser() ? 'Save Changes' : 'Create Account'" icon="pi pi-save" type="submit"></p-button>
                </div>
            </form>
        </p-dialog>

        <p-toast></p-toast>
        <p-confirmDialog></p-confirmDialog>
    `
})
export class AccountsList {
    readonly data = inject(LibraryDataService);
    private readonly fb = inject(FormBuilder);
    private readonly confirm = inject(ConfirmationService);
    private readonly msg = inject(MessageService);

    readonly search = signal('');
    readonly roleFilter = signal<LibraryRole | null>(null);
    readonly statusFilter = signal<AccountStatus | null>(null);
    readonly branchFilter = signal<string | null>(null);
    readonly dialogVisible = signal(false);
    readonly editingUser = signal<LibraryUser | null>(null);

    readonly roleOptions: AccountOption<LibraryRole>[] = [
        { label: 'Super Admin', value: 'SUPER_ADMIN' },
        { label: 'Library Admin / Librarian', value: 'LIBRARY_ADMIN' },
        { label: 'Library Staff', value: 'LIBRARY_STAFF' },
        { label: 'Teacher / Faculty', value: 'TEACHER' },
        { label: 'Student', value: 'STUDENT' }
    ];

    readonly roleFilterOptions = [{ label: 'All Roles', value: null }, ...this.roleOptions];

    readonly statusOptions: AccountOption<AccountStatus>[] = [
        { label: 'Active', value: 'ACTIVE' },
        { label: 'Inactive', value: 'INACTIVE' },
        { label: 'Suspended', value: 'SUSPENDED' }
    ];

    readonly statusFilterOptions = [{ label: 'All Statuses', value: null }, ...this.statusOptions];

    readonly form = this.fb.group({
        name: ['', Validators.required],
        username: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        phone: [''],
        role: ['LIBRARY_STAFF' as LibraryRole, Validators.required],
        status: ['ACTIVE' as AccountStatus, Validators.required],
        branchId: [null as string | null]
    });

    readonly roleSummary = computed(() =>
        this.data.roles().map((definition) => ({
            role: definition.role,
            label: definition.label,
            icon: definition.icon,
            count: this.data.usersInRole(definition.role)
        }))
    );

    readonly branchOptions = computed(() => this.data.branches().map((branch) => ({ label: `${branch.name} (${branch.code})`, value: branch.id })));
    readonly branchFilterOptions = computed(() => [{ label: 'All Branches', value: null }, ...this.branchOptions()]);

    readonly activeCount = computed(() => this.data.users().filter((user) => user.status === 'ACTIVE').length);
    readonly suspendedCount = computed(() => this.data.users().filter((user) => user.status === 'SUSPENDED').length);
    readonly hasFilters = computed(() => !!this.search().trim() || !!this.roleFilter() || !!this.statusFilter() || !!this.branchFilter());

    readonly filteredUsers = computed(() => {
        const query = this.search().trim().toLowerCase();
        const role = this.roleFilter();
        const status = this.statusFilter();
        const branchId = this.branchFilter();
        return this.data
            .users()
            .filter((user) => {
                const matchesRole = !role || user.role === role;
                const matchesStatus = !status || user.status === status;
                const matchesBranch = !branchId || user.branchId === branchId;
                const matchesQuery =
                    !query ||
                    user.name.toLowerCase().includes(query) ||
                    user.username.toLowerCase().includes(query) ||
                    user.email.toLowerCase().includes(query);
                return matchesRole && matchesStatus && matchesBranch && matchesQuery;
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    });

    clearFilters(): void {
        this.search.set('');
        this.roleFilter.set(null);
        this.statusFilter.set(null);
        this.branchFilter.set(null);
    }

    openCreate(): void {
        this.editingUser.set(null);
        this.form.reset({ name: '', username: '', email: '', phone: '', role: 'LIBRARY_STAFF', status: 'ACTIVE', branchId: null });
        this.dialogVisible.set(true);
    }

    openEdit(user: LibraryUser): void {
        this.editingUser.set(user);
        this.form.reset({
            name: user.name,
            username: user.username,
            email: user.email,
            phone: user.phone,
            role: user.role,
            status: user.status,
            branchId: user.branchId
        });
        this.dialogVisible.set(true);
    }

    closeDialog(): void {
        this.dialogVisible.set(false);
        this.editingUser.set(null);
    }

    save(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.msg.add({ severity: 'warn', summary: 'Validation', detail: 'Please complete the required account details.' });
            return;
        }

        const value = this.form.getRawValue() as AccountFormValue;
        const username = value.username.trim().toLowerCase();
        const email = value.email.trim().toLowerCase();
        const editing = this.editingUser();

        if (this.data.users().some((user) => user.username.toLowerCase() === username && user.id !== editing?.id)) {
            this.msg.add({ severity: 'warn', summary: 'Duplicate username', detail: 'Another account already uses this username.' });
            return;
        }
        if (this.data.users().some((user) => user.email.toLowerCase() === email && user.id !== editing?.id)) {
            this.msg.add({ severity: 'warn', summary: 'Duplicate email', detail: 'Another account already uses this email address.' });
            return;
        }

        const branchId = value.role === 'SUPER_ADMIN' ? null : value.branchId;

        try {
            if (editing) {
                this.data.updateUser({
                    ...editing,
                    name: value.name.trim(),
                    username,
                    email,
                    phone: value.phone.trim(),
                    role: value.role,
                    status: value.status,
                    branchId
                });
                this.msg.add({ severity: 'success', summary: 'Account updated', detail: `${value.name} has been updated.` });
            } else {
                this.data.createUser({
                    name: value.name.trim(),
                    username,
                    email,
                    phone: value.phone.trim(),
                    role: value.role,
                    status: value.status,
                    branchId,
                    lastLogin: null
                });
                this.msg.add({ severity: 'success', summary: 'Account created', detail: `${value.name} has been added as ${this.data.roleLabel(value.role)}.` });
            }
            this.closeDialog();
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Save failed', detail: this.errorText(error) });
        }
    }

    confirmToggle(user: LibraryUser): void {
        const deactivating = user.status === 'ACTIVE';
        this.confirm.confirm({
            message: `${deactivating ? 'Deactivate' : 'Activate'} the account for "${user.name}"?`,
            header: deactivating ? 'Deactivate Account' : 'Activate Account',
            icon: deactivating ? 'pi pi-ban' : 'pi pi-check-circle',
            acceptLabel: deactivating ? 'Deactivate' : 'Activate',
            rejectLabel: 'Cancel',
            acceptButtonStyleClass: deactivating ? 'p-button-warn' : 'p-button-success',
            accept: () => {
                try {
                    this.data.toggleUserStatus(user.id);
                    this.msg.add({ severity: 'success', summary: 'Status updated', detail: `${user.name} is now ${deactivating ? 'inactive' : 'active'}.` });
                } catch (error) {
                    this.msg.add({ severity: 'error', summary: 'Update failed', detail: this.errorText(error) });
                }
            }
        });
    }

    confirmDelete(user: LibraryUser): void {
        this.confirm.confirm({
            message: `Delete the account for "${user.name}"? This cannot be undone.`,
            header: 'Delete Account',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Delete',
            rejectLabel: 'Cancel',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                try {
                    this.data.removeUser(user.id);
                    this.msg.add({ severity: 'success', summary: 'Account deleted', detail: `${user.name} has been removed.` });
                } catch (error) {
                    this.msg.add({ severity: 'error', summary: 'Delete failed', detail: this.errorText(error) });
                }
            }
        });
    }

    lastLoginLabel(value: string): string {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '—';
        return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    }

    relativeLogin(value: string): string {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        const minutes = Math.round((Date.now() - date.getTime()) / 60000);
        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.round(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.round(hours / 24);
        if (days < 30) return `${days}d ago`;
        const months = Math.round(days / 30);
        return months < 12 ? `${months}mo ago` : `${Math.round(months / 12)}y ago`;
    }

    private errorText(error: unknown): string {
        return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
    }
}
