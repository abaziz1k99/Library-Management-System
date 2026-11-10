import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
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
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { EmptyState } from '@/app/shared/components/empty-state';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatusTag } from '@/app/shared/components/status-tag';
import { LibraryDataService } from '@/app/core/services/library-data.service';
import type { LibraryBranch } from '@/app/core/models/library.models';

interface BranchFormValue {
    name: string;
    code: string;
    address: string;
    phone: string;
    email: string;
    openingHours: string;
    seatCapacity: number;
    shelfCount: number;
    status: 'ACTIVE' | 'INACTIVE';
}

@Component({
    selector: 'app-branches-list',
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
        ToastModule,
        TooltipModule,
        EmptyState,
        PageHeader,
        StatusTag
    ],
    providers: [ConfirmationService, MessageService],
    template: `
        <app-page-header title="Library Branches" subtitle="Create branches and maintain their contact details, opening hours and capacity">
            <p-button label="Add Branch" icon="pi pi-plus" (onClick)="openCreate()"></p-button>
        </app-page-header>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
            <p-card>
                <div class="text-xs text-muted-color">Total Branches</div>
                <div class="text-2xl font-bold mt-1">{{ data.branches().length }}</div>
            </p-card>
            <p-card>
                <div class="text-xs text-muted-color">Active Branches</div>
                <div class="text-2xl font-bold mt-1 text-green-600">{{ data.activeBranches().length }}</div>
            </p-card>
            <p-card>
                <div class="text-xs text-muted-color">Total Seats</div>
                <div class="text-2xl font-bold mt-1">{{ formatNumber(totalSeats()) }}</div>
            </p-card>
            <p-card>
                <div class="text-xs text-muted-color">Total Shelves</div>
                <div class="text-2xl font-bold mt-1">{{ formatNumber(totalShelves()) }}</div>
            </p-card>
        </div>

        <p-card>
            <div class="flex flex-col lg:flex-row gap-3 mb-4">
                <span class="relative block flex-1">
                    <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-color"></i>
                    <input pInputText type="text" class="w-full pl-10" placeholder="Search by branch name, code or address" [ngModel]="search()" (ngModelChange)="search.set($event)" />
                </span>
                <p-select
                    [ngModel]="statusFilter()"
                    (ngModelChange)="statusFilter.set($event)"
                    [options]="statusFilterOptions"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Status"
                    [showClear]="true"
                    appendTo="body"
                    styleClass="w-full lg:w-48"
                ></p-select>
            </div>

            @if (data.branches().length === 0) {
                <app-empty-state icon="pi pi-building" title="No branches yet" message="Add your first library branch to begin configuring the network." actionLabel="Add Branch" (action)="openCreate()"></app-empty-state>
            } @else if (filteredBranches().length === 0) {
                <app-empty-state icon="pi pi-search" title="No matching branches" message="Adjust the search or status filter to see more branches." actionLabel="Clear filters" (action)="clearFilters()"></app-empty-state>
            } @else {
                <div class="overflow-x-auto">
                    <p-table [value]="filteredBranches()" dataKey="id" [paginator]="true" [rows]="10" [rowsPerPageOptions]="[10, 25, 50]" [tableStyle]="{ 'min-width': '64rem' }" styleClass="w-full">
                        <ng-template pTemplate="header">
                            <tr>
                                <th>Branch</th>
                                <th>Address</th>
                                <th>Contact</th>
                                <th>Opening Hours</th>
                                <th class="text-right">Capacity</th>
                                <th>Status</th>
                                <th style="width: 8rem">Actions</th>
                            </tr>
                        </ng-template>
                        <ng-template pTemplate="body" let-row>
                            <tr>
                                <td>
                                    <div class="font-medium">{{ row.name }}</div>
                                    <div class="text-xs text-muted-color font-mono">{{ row.code }}</div>
                                </td>
                                <td class="text-sm max-w-[18rem]">{{ row.address }}</td>
                                <td class="text-sm">
                                    <div>{{ row.phone }}</div>
                                    <div class="text-xs text-muted-color">{{ row.email }}</div>
                                </td>
                                <td class="text-sm">{{ row.openingHours }}</td>
                                <td class="text-right text-sm">
                                    <div>{{ formatNumber(row.seatCapacity) }} seats</div>
                                    <div class="text-xs text-muted-color">{{ formatNumber(row.shelfCount) }} shelves</div>
                                </td>
                                <td><app-status-tag [status]="row.status"></app-status-tag></td>
                                <td>
                                    <div class="flex items-center gap-1">
                                        <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" severity="info" pTooltip="Edit branch" tooltipPosition="top" (onClick)="openEdit(row)"></p-button>
                                        <p-button
                                            [icon]="row.status === 'ACTIVE' ? 'pi pi-power-off' : 'pi pi-check-circle'"
                                            [rounded]="true"
                                            [text]="true"
                                            [severity]="row.status === 'ACTIVE' ? 'warn' : 'success'"
                                            [pTooltip]="row.status === 'ACTIVE' ? 'Deactivate branch' : 'Activate branch'"
                                            tooltipPosition="top"
                                            (onClick)="confirmToggle(row)"
                                        ></p-button>
                                        <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger" pTooltip="Delete branch" tooltipPosition="top" (onClick)="confirmDelete(row)"></p-button>
                                    </div>
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>
                </div>
            }
        </p-card>

        <p-dialog
            [header]="editingBranch() ? 'Edit Branch' : 'Add Branch'"
            [visible]="dialogVisible()"
            (visibleChange)="dialogVisible.set($event)"
            [modal]="true"
            [dismissableMask]="true"
            [style]="{ width: '640px', 'max-width': '95vw' }"
            (onHide)="closeDialog()"
        >
            <form [formGroup]="form" (ngSubmit)="save()" class="flex flex-col gap-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium" for="branchName">Branch Name *</label>
                        <input pInputText id="branchName" formControlName="name" placeholder="e.g. Main Campus Library" />
                        @if (form.controls.name.touched && form.controls.name.invalid) {
                            <small class="text-red-500">Branch name is required.</small>
                        }
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium" for="branchCode">Branch Code *</label>
                        <input pInputText id="branchCode" formControlName="code" placeholder="e.g. LIB-MAIN" />
                        @if (form.controls.code.touched && form.controls.code.invalid) {
                            <small class="text-red-500">A unique branch code is required.</small>
                        }
                    </div>
                </div>

                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium" for="branchAddress">Address *</label>
                    <input pInputText id="branchAddress" formControlName="address" placeholder="Building, level, campus" />
                    @if (form.controls.address.touched && form.controls.address.invalid) {
                        <small class="text-red-500">Address is required.</small>
                    }
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium" for="branchPhone">Phone</label>
                        <input pInputText id="branchPhone" formControlName="phone" placeholder="+880 ..." />
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium" for="branchEmail">Email</label>
                        <input pInputText id="branchEmail" type="email" formControlName="email" placeholder="branch@university.edu" />
                        @if (form.controls.email.touched && form.controls.email.hasError('email')) {
                            <small class="text-red-500">Enter a valid email address.</small>
                        }
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div class="flex flex-col gap-1.5 sm:col-span-3">
                        <label class="text-sm font-medium" for="openingHours">Opening Hours *</label>
                        <input pInputText id="openingHours" formControlName="openingHours" placeholder="e.g. 08:00 - 22:00 (Sat - Thu)" />
                        @if (form.controls.openingHours.touched && form.controls.openingHours.invalid) {
                            <small class="text-red-500">Opening hours are required.</small>
                        }
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Seat Capacity</label>
                        <p-inputnumber formControlName="seatCapacity" [min]="0" [max]="100000" [showButtons]="true" styleClass="w-full" inputStyleClass="w-full"></p-inputnumber>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Shelf Count</label>
                        <p-inputnumber formControlName="shelfCount" [min]="0" [max]="100000" [showButtons]="true" styleClass="w-full" inputStyleClass="w-full"></p-inputnumber>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Status *</label>
                        <p-select formControlName="status" [options]="statusOptions" optionLabel="label" optionValue="value" appendTo="body" styleClass="w-full"></p-select>
                    </div>
                </div>

                <p-message severity="info" icon="pi pi-info-circle" styleClass="w-full">
                    Branch settings control the library's physical location, opening hours and capacity. Inventory statistics are maintained separately.
                </p-message>

                <div class="flex justify-end gap-2 pt-2">
                    <p-button label="Cancel" severity="secondary" [text]="true" (onClick)="closeDialog()"></p-button>
                    <p-button [label]="editingBranch() ? 'Save Changes' : 'Create Branch'" icon="pi pi-save" type="submit"></p-button>
                </div>
            </form>
        </p-dialog>

        <p-toast></p-toast>
        <p-confirmDialog></p-confirmDialog>
    `
})
export class BranchesList {
    readonly data = inject(LibraryDataService);
    private readonly fb = inject(FormBuilder);
    private readonly confirm = inject(ConfirmationService);
    private readonly msg = inject(MessageService);

    readonly search = signal('');
    readonly statusFilter = signal<'ACTIVE' | 'INACTIVE' | null>(null);
    readonly dialogVisible = signal(false);
    readonly editingBranch = signal<LibraryBranch | null>(null);

    readonly statusOptions = [
        { label: 'Active', value: 'ACTIVE' as const },
        { label: 'Inactive', value: 'INACTIVE' as const }
    ];

    readonly statusFilterOptions = [
        { label: 'All Statuses', value: null },
        ...this.statusOptions
    ];

    readonly form = this.fb.group({
        name: ['', Validators.required],
        code: ['', Validators.required],
        address: ['', Validators.required],
        phone: [''],
        email: ['', Validators.email],
        openingHours: ['', Validators.required],
        seatCapacity: [0, [Validators.min(0)]],
        shelfCount: [0, [Validators.min(0)]],
        status: ['ACTIVE' as 'ACTIVE' | 'INACTIVE', Validators.required]
    });

    readonly filteredBranches = computed(() => {
        const query = this.search().trim().toLowerCase();
        const status = this.statusFilter();
        return this.data
            .branches()
            .filter((branch) => {
                const matchesStatus = !status || branch.status === status;
                const matchesQuery =
                    !query ||
                    branch.name.toLowerCase().includes(query) ||
                    branch.code.toLowerCase().includes(query) ||
                    branch.address.toLowerCase().includes(query);
                return matchesStatus && matchesQuery;
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    });

    readonly totalSeats = computed(() => this.data.branches().reduce((sum, branch) => sum + branch.seatCapacity, 0));
    readonly totalShelves = computed(() => this.data.branches().reduce((sum, branch) => sum + branch.shelfCount, 0));

    clearFilters(): void {
        this.search.set('');
        this.statusFilter.set(null);
    }

    openCreate(): void {
        this.editingBranch.set(null);
        this.form.reset({
            name: '',
            code: '',
            address: '',
            phone: '',
            email: '',
            openingHours: '',
            seatCapacity: 0,
            shelfCount: 0,
            status: 'ACTIVE'
        });
        this.dialogVisible.set(true);
    }

    openEdit(branch: LibraryBranch): void {
        this.editingBranch.set(branch);
        this.form.reset({
            name: branch.name,
            code: branch.code,
            address: branch.address,
            phone: branch.phone,
            email: branch.email,
            openingHours: branch.openingHours,
            seatCapacity: branch.seatCapacity,
            shelfCount: branch.shelfCount,
            status: branch.status
        });
        this.dialogVisible.set(true);
    }

    closeDialog(): void {
        this.dialogVisible.set(false);
        this.editingBranch.set(null);
    }

    save(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.msg.add({ severity: 'warn', summary: 'Validation', detail: 'Please complete the required branch details.' });
            return;
        }
        const value = this.form.getRawValue() as BranchFormValue;
        const duplicate = this.data.branches().some((branch) => branch.code.trim().toLowerCase() === value.code.trim().toLowerCase() && branch.id !== this.editingBranch()?.id);
        if (duplicate) {
            this.msg.add({ severity: 'warn', summary: 'Duplicate code', detail: 'Another branch already uses this code.' });
            return;
        }

        try {
            const editing = this.editingBranch();
            if (editing) {
                this.data.updateBranch({ ...editing, ...value, name: value.name.trim(), code: value.code.trim().toUpperCase() });
                this.msg.add({ severity: 'success', summary: 'Branch updated', detail: `${value.name} has been updated.` });
            } else {
                this.data.createBranch({ ...value, name: value.name.trim(), code: value.code.trim().toUpperCase() });
                this.msg.add({ severity: 'success', summary: 'Branch created', detail: `${value.name} has been added to the library network.` });
            }
            this.closeDialog();
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Save failed', detail: this.errorText(error) });
        }
    }

    confirmToggle(branch: LibraryBranch): void {
        const deactivating = branch.status === 'ACTIVE';
        this.confirm.confirm({
            message: `${deactivating ? 'Deactivate' : 'Activate'} branch "${branch.name}"?`,
            header: deactivating ? 'Deactivate Branch' : 'Activate Branch',
            icon: deactivating ? 'pi pi-power-off' : 'pi pi-check-circle',
            acceptLabel: deactivating ? 'Deactivate' : 'Activate',
            rejectLabel: 'Cancel',
            acceptButtonStyleClass: deactivating ? 'p-button-warn' : 'p-button-success',
            accept: () => {
                try {
                    this.data.toggleBranchStatus(branch.id);
                    this.msg.add({ severity: 'success', summary: 'Status updated', detail: `${branch.name} is now ${deactivating ? 'inactive' : 'active'}.` });
                } catch (error) {
                    this.msg.add({ severity: 'error', summary: 'Update failed', detail: this.errorText(error) });
                }
            }
        });
    }

    confirmDelete(branch: LibraryBranch): void {
        this.confirm.confirm({
            message: `Delete branch "${branch.name}"? This cannot be undone.`,
            header: 'Delete Branch',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Delete',
            rejectLabel: 'Cancel',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                try {
                    this.data.removeBranch(branch.id);
                    this.msg.add({ severity: 'success', summary: 'Branch deleted', detail: `${branch.name} has been removed.` });
                } catch (error) {
                    this.msg.add({ severity: 'error', summary: 'Delete failed', detail: this.errorText(error) });
                }
            }
        });
    }

    formatNumber(value: number): string {
        return value.toLocaleString('en-US');
    }

    private errorText(error: unknown): string {
        return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
    }
}
