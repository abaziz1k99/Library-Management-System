import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PageHeader } from '@/app/shared/components/page-header';
import { LibraryDataService } from '@/app/core/services/library-data.service';
import { ALL_PERMISSION_KEYS, PERMISSIONS } from '@/app/core/models/library.models';
import type { LibraryRole, PermissionDefinition } from '@/app/core/models/library.models';

interface PermissionGroup {
    group: string;
    permissions: PermissionDefinition[];
}

@Component({
    selector: 'app-roles-permissions',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, CardModule, CheckboxModule, MessageModule, TagModule, ToastModule, PageHeader],
    providers: [MessageService],
    template: `
        <app-page-header title="Roles & Permissions" subtitle="Assign roles and control what each type of account can do across the library system">
            <p-button label="Discard Changes" severity="secondary" [outlined]="true" icon="pi pi-undo" [disabled]="!dirty()" (onClick)="resetDraft()"></p-button>
            <p-button label="Save Permissions" icon="pi pi-save" [disabled]="!dirty() || locked()" (onClick)="save()"></p-button>
        </app-page-header>

        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 mb-6">
            @for (role of data.roles(); track role.role) {
                <button
                    type="button"
                    class="text-left rounded-xl border p-4 transition-colors"
                    [ngClass]="selectedRole() === role.role ? 'border-primary bg-primary-50 dark:bg-primary-950' : 'border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 hover:bg-surface-hover'"
                    (click)="selectRole(role.role)"
                >
                    <div class="flex items-center justify-between gap-2">
                        <div class="w-9 h-9 rounded-lg flex items-center justify-center bg-primary-100 dark:bg-primary-900 text-primary">
                            <i [class]="role.icon"></i>
                        </div>
                        <p-tag [value]="data.usersInRole(role.role) + ' accounts'" severity="secondary"></p-tag>
                    </div>
                    <div class="font-semibold mt-3">{{ role.label }}</div>
                    <div class="text-xs text-muted-color mt-1">{{ role.permissions.length }} of {{ permissionCount }} permissions</div>
                </button>
            }
        </div>

        <div class="grid gap-4 xl:grid-cols-4">
            <p-card styleClass="xl:col-span-1">
                <ng-template pTemplate="header">
                    <div class="px-4 pt-4">
                        <h2 class="text-lg font-semibold">Role Summary</h2>
                        <p class="text-xs text-muted-color mt-0.5">Selected role and current access</p>
                    </div>
                </ng-template>
                @if (selectedDefinition(); as role) {
                    <div class="flex flex-col gap-3">
                        <div class="w-12 h-12 rounded-xl flex items-center justify-center bg-primary-100 dark:bg-primary-900 text-primary text-xl">
                            <i [class]="role.icon"></i>
                        </div>
                        <div>
                            <div class="text-lg font-semibold">{{ role.label }}</div>
                            <p class="text-sm text-muted-color mt-1">{{ role.description }}</p>
                        </div>
                        <div class="flex flex-wrap gap-2">
                            <p-tag [value]="data.usersInRole(role.role) + ' user(s)'" severity="secondary"></p-tag>
                            <p-tag [value]="draft().size + ' permissions'" severity="info"></p-tag>
                        </div>
                        @if (locked()) {
                            <p-message severity="info" icon="pi pi-lock" styleClass="w-full">
                                Super Admin always has every permission and cannot be restricted.
                            </p-message>
                        } @else {
                            <p-message severity="secondary" icon="pi pi-info-circle" styleClass="w-full">
                                Toggle permissions, then save to apply them to this role.
                            </p-message>
                        }
                    </div>
                }
            </p-card>

            <div class="xl:col-span-3 flex flex-col gap-4">
                @for (group of permissionGroups; track group.group) {
                    <p-card>
                        <ng-template pTemplate="header">
                            <div class="flex items-center justify-between gap-3 px-4 pt-4">
                                <div>
                                    <h3 class="text-base font-semibold">{{ group.group }}</h3>
                                    <p class="text-xs text-muted-color mt-0.5">{{ groupCount(group) }} of {{ group.permissions.length }} granted</p>
                                </div>
                                <p-button
                                    [label]="allInGroup(group) ? 'Clear group' : 'Grant all'"
                                    size="small"
                                    [text]="true"
                                    [severity]="allInGroup(group) ? 'danger' : 'primary'"
                                    [disabled]="locked()"
                                    (onClick)="toggleGroup(group)"
                                ></p-button>
                            </div>
                        </ng-template>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                            @for (permission of group.permissions; track permission.key) {
                                <label class="flex items-start gap-3 rounded-lg border border-surface-200 dark:border-surface-700 p-3 cursor-pointer" [ngClass]="locked() ? 'opacity-70 cursor-not-allowed' : ''">
                                    <p-checkbox [ngModel]="isGranted(permission.key)" (ngModelChange)="toggle(permission.key, $event)" [binary]="true" [disabled]="locked()"></p-checkbox>
                                    <span class="min-w-0">
                                        <span class="block text-sm font-medium">{{ permission.label }}</span>
                                        <span class="block text-xs text-muted-color mt-0.5">{{ permission.description }}</span>
                                    </span>
                                </label>
                            }
                        </div>
                    </p-card>
                }
            </div>
        </div>

        <p-toast></p-toast>
    `
})
export class RolesPermissions {
    readonly data = inject(LibraryDataService);
    private readonly msg = inject(MessageService);

    readonly permissionCount = PERMISSIONS.length;
    readonly permissionGroups: PermissionGroup[] = this.groupPermissions();

    readonly selectedRole = signal<LibraryRole>('SUPER_ADMIN');
    readonly draft = signal<Set<string>>(new Set(ALL_PERMISSION_KEYS));

    readonly selectedDefinition = computed(() => this.data.roles().find((role) => role.role === this.selectedRole()));
    readonly locked = computed(() => this.selectedRole() === 'SUPER_ADMIN');

    readonly dirty = computed(() => {
        const current = this.selectedDefinition();
        if (!current) return false;
        const draft = [...this.draft()].sort();
        const saved = [...current.permissions].sort();
        if (draft.length !== saved.length) return true;
        return draft.some((permission, index) => permission !== saved[index]);
    });

    selectRole(role: LibraryRole): void {
        this.selectedRole.set(role);
        const definition = this.data.roles().find((item) => item.role === role);
        this.draft.set(new Set(definition?.permissions ?? []));
    }

    resetDraft(): void {
        this.selectRole(this.selectedRole());
        this.msg.add({ severity: 'info', summary: 'Changes discarded', detail: 'Permissions were restored to the saved values.' });
    }

    save(): void {
        if (this.locked()) return;
        try {
            this.data.updateRolePermissions(this.selectedRole(), [...this.draft()]);
            this.msg.add({ severity: 'success', summary: 'Permissions saved', detail: `${this.selectedDefinition()?.label ?? 'Role'} now has ${this.draft().size} permissions.` });
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Save failed', detail: this.errorText(error) });
        }
    }

    isGranted(key: string): boolean {
        return this.draft().has(key);
    }

    toggle(key: string, checked: boolean): void {
        if (this.locked()) return;
        this.draft.update((current) => {
            const next = new Set(current);
            if (checked) next.add(key);
            else next.delete(key);
            return next;
        });
    }

    groupCount(group: PermissionGroup): number {
        return group.permissions.filter((permission) => this.draft().has(permission.key)).length;
    }

    allInGroup(group: PermissionGroup): boolean {
        return group.permissions.every((permission) => this.draft().has(permission.key));
    }

    toggleGroup(group: PermissionGroup): void {
        if (this.locked()) return;
        const grantAll = !this.allInGroup(group);
        this.draft.update((current) => {
            const next = new Set(current);
            for (const permission of group.permissions) {
                if (grantAll) next.add(permission.key);
                else next.delete(permission.key);
            }
            return next;
        });
    }

    private groupPermissions(): PermissionGroup[] {
        const groups = new Map<string, PermissionDefinition[]>();
        for (const permission of PERMISSIONS) {
            const list = groups.get(permission.group) ?? [];
            list.push(permission);
            groups.set(permission.group, list);
        }
        return [...groups.entries()].map(([group, permissions]) => ({ group, permissions }));
    }

    private errorText(error: unknown): string {
        return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
    }
}
