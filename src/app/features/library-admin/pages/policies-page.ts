import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PageHeader } from '@/app/shared/components/page-header';
import { LibraryDataService } from '@/app/core/services/library-data.service';
import type { LibraryPolicy, LibrarySettings, MemberType } from '@/app/core/models/library.models';

type PolicyKey = 'borrowLimit' | 'loanPeriodDays' | 'renewalLimit' | 'renewalPeriodDays' | 'reservationLimit' | 'reservationHoldDays' | 'gracePeriodDays' | 'finePerDay' | 'maxFine' | 'lostBookCharge' | 'damagedBookCharge';

const MEMBER_TYPES: MemberType[] = ['STUDENT', 'TEACHER', 'STAFF'];

@Component({
    selector: 'app-policies-page',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        CardModule,
        CheckboxModule,
        InputNumberModule,
        InputTextModule,
        MessageModule,
        SelectModule,
        TabsModule,
        TagModule,
        ToastModule,
        PageHeader
    ],
    providers: [MessageService],
    template: `
        <app-page-header title="Library-Wide Policies" subtitle="Configure borrowing, renewal, reservation and fine rules for the entire library network">
            <p-button label="Reset" icon="pi pi-undo" severity="secondary" [outlined]="true" (onClick)="resetAll()"></p-button>
            <p-button label="Save Changes" icon="pi pi-save" [disabled]="!dirty()" (onClick)="saveAll()"></p-button>
        </app-page-header>

        <p-message severity="info" icon="pi pi-info-circle" styleClass="w-full mb-4">
            These policies apply to all branches. Branches may record local opening hours and capacity, but borrowing and fine rules are controlled centrally.
        </p-message>

        <p-tabs [value]="activeTab()" (valueChange)="activeTab.set($event)">
            <p-tablist>
                <p-tab value="policies"><i class="pi pi-sliders-h mr-2"></i>Borrowing &amp; Fines</p-tab>
                <p-tab value="settings"><i class="pi pi-cog mr-2"></i>System Settings</p-tab>
            </p-tablist>
            <p-tabpanels>
                <p-tabpanel value="policies">
                    <div class="pt-4">
                        <div class="grid gap-4 xl:grid-cols-3">
                            @for (type of memberTypes; track type) {
                                <p-card>
                                    <ng-template pTemplate="header">
                                        <div class="flex items-center justify-between gap-3 px-4 pt-4">
                                            <div class="flex items-center gap-3">
                                                <div class="w-10 h-10 rounded-lg flex items-center justify-center bg-primary-100 dark:bg-primary-900 text-primary">
                                                    <i [class]="memberIcon(type)"></i>
                                                </div>
                                                <div>
                                                    <h3 class="text-base font-semibold">{{ memberLabel(type) }} Policy</h3>
                                                    <p class="text-xs text-muted-color">{{ drafts()[type].borrowLimit }} books · {{ drafts()[type].loanPeriodDays }} day loans</p>
                                                </div>
                                            </div>
                                        </div>
                                    </ng-template>

                                    <div class="grid grid-cols-2 gap-3">
                                        <div class="flex flex-col gap-1.5">
                                            <label class="text-xs font-medium text-muted-color">Borrow Limit</label>
                                            <p-inputnumber [ngModel]="drafts()[type].borrowLimit" (ngModelChange)="patchPolicy(type, 'borrowLimit', $event)" [min]="1" [max]="50" [showButtons]="true" styleClass="w-full" inputStyleClass="w-full"></p-inputnumber>
                                        </div>
                                        <div class="flex flex-col gap-1.5">
                                            <label class="text-xs font-medium text-muted-color">Loan Period (days)</label>
                                            <p-inputnumber [ngModel]="drafts()[type].loanPeriodDays" (ngModelChange)="patchPolicy(type, 'loanPeriodDays', $event)" [min]="1" [max]="365" [showButtons]="true" styleClass="w-full" inputStyleClass="w-full"></p-inputnumber>
                                        </div>
                                        <div class="flex flex-col gap-1.5">
                                            <label class="text-xs font-medium text-muted-color">Renewal Limit</label>
                                            <p-inputnumber [ngModel]="drafts()[type].renewalLimit" (ngModelChange)="patchPolicy(type, 'renewalLimit', $event)" [min]="0" [max]="20" [showButtons]="true" styleClass="w-full" inputStyleClass="w-full"></p-inputnumber>
                                        </div>
                                        <div class="flex flex-col gap-1.5">
                                            <label class="text-xs font-medium text-muted-color">Renewal Period (days)</label>
                                            <p-inputnumber [ngModel]="drafts()[type].renewalPeriodDays" (ngModelChange)="patchPolicy(type, 'renewalPeriodDays', $event)" [min]="1" [max]="180" [showButtons]="true" styleClass="w-full" inputStyleClass="w-full"></p-inputnumber>
                                        </div>
                                        <div class="flex flex-col gap-1.5">
                                            <label class="text-xs font-medium text-muted-color">Reservation Limit</label>
                                            <p-inputnumber [ngModel]="drafts()[type].reservationLimit" (ngModelChange)="patchPolicy(type, 'reservationLimit', $event)" [min]="0" [max]="20" [showButtons]="true" styleClass="w-full" inputStyleClass="w-full"></p-inputnumber>
                                        </div>
                                        <div class="flex flex-col gap-1.5">
                                            <label class="text-xs font-medium text-muted-color">Hold Period (days)</label>
                                            <p-inputnumber [ngModel]="drafts()[type].reservationHoldDays" (ngModelChange)="patchPolicy(type, 'reservationHoldDays', $event)" [min]="1" [max]="30" [showButtons]="true" styleClass="w-full" inputStyleClass="w-full"></p-inputnumber>
                                        </div>
                                        <div class="flex flex-col gap-1.5">
                                            <label class="text-xs font-medium text-muted-color">Grace Period (days)</label>
                                            <p-inputnumber [ngModel]="drafts()[type].gracePeriodDays" (ngModelChange)="patchPolicy(type, 'gracePeriodDays', $event)" [min]="0" [max]="30" [showButtons]="true" styleClass="w-full" inputStyleClass="w-full"></p-inputnumber>
                                        </div>
                                        <div class="flex flex-col gap-1.5">
                                            <label class="text-xs font-medium text-muted-color">Fine / Day</label>
                                            <p-inputnumber [ngModel]="drafts()[type].finePerDay" (ngModelChange)="patchPolicy(type, 'finePerDay', $event)" [min]="0" [max]="1000" [showButtons]="true" styleClass="w-full" inputStyleClass="w-full"></p-inputnumber>
                                        </div>
                                        <div class="flex flex-col gap-1.5">
                                            <label class="text-xs font-medium text-muted-color">Maximum Fine</label>
                                            <p-inputnumber [ngModel]="drafts()[type].maxFine" (ngModelChange)="patchPolicy(type, 'maxFine', $event)" [min]="0" [max]="100000" [showButtons]="true" styleClass="w-full" inputStyleClass="w-full"></p-inputnumber>
                                        </div>
                                        <div class="flex flex-col gap-1.5">
                                            <label class="text-xs font-medium text-muted-color">Lost Book Charge</label>
                                            <p-inputnumber [ngModel]="drafts()[type].lostBookCharge" (ngModelChange)="patchPolicy(type, 'lostBookCharge', $event)" [min]="0" [max]="100000" [showButtons]="true" styleClass="w-full" inputStyleClass="w-full"></p-inputnumber>
                                        </div>
                                        <div class="flex flex-col gap-1.5 col-span-2">
                                            <label class="text-xs font-medium text-muted-color">Damaged Book Charge</label>
                                            <p-inputnumber [ngModel]="drafts()[type].damagedBookCharge" (ngModelChange)="patchPolicy(type, 'damagedBookCharge', $event)" [min]="0" [max]="100000" [showButtons]="true" styleClass="w-full" inputStyleClass="w-full"></p-inputnumber>
                                        </div>
                                    </div>
                                </p-card>
                            }
                        </div>

                        <p-card styleClass="mt-4">
                            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div>
                                    <h3 class="text-base font-semibold">Policy Summary</h3>
                                    <p class="text-sm text-muted-color mt-1">Rule of thumb applied when issuing, renewing and calculating overdue charges.</p>
                                </div>
                                <p-tag [value]="currency()" severity="secondary"></p-tag>
                            </div>
                            <div class="overflow-x-auto mt-3">
                                <table class="w-full text-sm">
                                    <thead>
                                        <tr class="text-left text-muted-color border-b border-surface-200 dark:border-surface-700">
                                            <th class="py-2 pr-4">Member Type</th>
                                            <th class="py-2 pr-4">Borrow</th>
                                            <th class="py-2 pr-4">Loan</th>
                                            <th class="py-2 pr-4">Renewals</th>
                                            <th class="py-2 pr-4">Reservations</th>
                                            <th class="py-2 pr-4">Grace</th>
                                            <th class="py-2">Fine / Day</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        @for (type of memberTypes; track type) {
                                            <tr class="border-b border-surface-100 dark:border-surface-800">
                                                <td class="py-2 pr-4 font-medium">{{ memberLabel(type) }}</td>
                                                <td class="py-2 pr-4">{{ drafts()[type].borrowLimit }} books</td>
                                                <td class="py-2 pr-4">{{ drafts()[type].loanPeriodDays }} days</td>
                                                <td class="py-2 pr-4">{{ drafts()[type].renewalLimit }} × {{ drafts()[type].renewalPeriodDays }} days</td>
                                                <td class="py-2 pr-4">{{ drafts()[type].reservationLimit }} ({{ drafts()[type].reservationHoldDays }}d hold)</td>
                                                <td class="py-2 pr-4">{{ drafts()[type].gracePeriodDays }} days</td>
                                                <td class="py-2">{{ formatCurrency(drafts()[type].finePerDay) }}</td>
                                            </tr>
                                        }
                                    </tbody>
                                </table>
                            </div>
                        </p-card>
                    </div>
                </p-tabpanel>

                <p-tabpanel value="settings">
                    <div class="pt-4 max-w-5xl">
                        <p-card>
                            <ng-template pTemplate="header">
                                <div class="px-4 pt-4">
                                    <h3 class="text-base font-semibold">Library Identity</h3>
                                    <p class="text-xs text-muted-color mt-0.5">Shown on receipts, membership cards and notifications.</p>
                                </div>
                            </ng-template>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm font-medium" for="libraryName">Library Name *</label>
                                    <input pInputText id="libraryName" [ngModel]="settingsDraft().libraryName" (ngModelChange)="patchSettings('libraryName', $event)" />
                                </div>
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm font-medium" for="libraryShortName">Short Name</label>
                                    <input pInputText id="libraryShortName" [ngModel]="settingsDraft().shortName" (ngModelChange)="patchSettings('shortName', $event)" />
                                </div>
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm font-medium" for="libraryEmail">Contact Email</label>
                                    <input pInputText id="libraryEmail" type="email" [ngModel]="settingsDraft().contactEmail" (ngModelChange)="patchSettings('contactEmail', $event)" />
                                </div>
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm font-medium" for="libraryPhone">Contact Phone</label>
                                    <input pInputText id="libraryPhone" [ngModel]="settingsDraft().contactPhone" (ngModelChange)="patchSettings('contactPhone', $event)" />
                                </div>
                                <div class="flex flex-col gap-1.5 sm:col-span-2">
                                    <label class="text-sm font-medium" for="libraryAddress">Address</label>
                                    <input pInputText id="libraryAddress" [ngModel]="settingsDraft().address" (ngModelChange)="patchSettings('address', $event)" />
                                </div>
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm font-medium">Currency</label>
                                    <p-select [ngModel]="settingsDraft().currency" (ngModelChange)="patchSettings('currency', $event)" [options]="currencyOptions" optionLabel="label" optionValue="value" appendTo="body" styleClass="w-full"></p-select>
                                </div>
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm font-medium">Timezone</label>
                                    <p-select [ngModel]="settingsDraft().timezone" (ngModelChange)="patchSettings('timezone', $event)" [options]="timezoneOptions" optionLabel="label" optionValue="value" appendTo="body" styleClass="w-full"></p-select>
                                </div>
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm font-medium">QR Code Prefix</label>
                                    <input pInputText [ngModel]="settingsDraft().qrCodePrefix" (ngModelChange)="patchSettings('qrCodePrefix', $event)" />
                                </div>
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm font-medium">Fine Calculation</label>
                                    <p-select [ngModel]="settingsDraft().fineCalculation" (ngModelChange)="patchSettings('fineCalculation', $event)" [options]="fineCalculationOptions" optionLabel="label" optionValue="value" appendTo="body" styleClass="w-full"></p-select>
                                </div>
                            </div>
                        </p-card>

                        <p-card styleClass="mt-4">
                            <ng-template pTemplate="header">
                                <div class="px-4 pt-4">
                                    <h3 class="text-base font-semibold">Automation &amp; Notifications</h3>
                                    <p class="text-xs text-muted-color mt-0.5">Controls reservation approvals, renewals and member reminders.</p>
                                </div>
                            </ng-template>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <label class="flex items-start gap-3 rounded-lg border border-surface-200 dark:border-surface-700 p-3 cursor-pointer">
                                    <p-checkbox [ngModel]="settingsDraft().autoApproveReservations" (ngModelChange)="patchSettings('autoApproveReservations', $event)" [binary]="true"></p-checkbox>
                                    <span>
                                        <span class="block text-sm font-medium">Auto-approve reservations</span>
                                        <span class="block text-xs text-muted-color mt-0.5">Reservations are confirmed automatically when a copy is available.</span>
                                    </span>
                                </label>
                                <label class="flex items-start gap-3 rounded-lg border border-surface-200 dark:border-surface-700 p-3 cursor-pointer">
                                    <p-checkbox [ngModel]="settingsDraft().autoRenewals" (ngModelChange)="patchSettings('autoRenewals', $event)" [binary]="true"></p-checkbox>
                                    <span>
                                        <span class="block text-sm font-medium">Auto-renew loans</span>
                                        <span class="block text-xs text-muted-color mt-0.5">Eligible loans renew when the renewal limit has not been reached.</span>
                                    </span>
                                </label>
                                <label class="flex items-start gap-3 rounded-lg border border-surface-200 dark:border-surface-700 p-3 cursor-pointer">
                                    <p-checkbox [ngModel]="settingsDraft().emailNotifications" (ngModelChange)="patchSettings('emailNotifications', $event)" [binary]="true"></p-checkbox>
                                    <span>
                                        <span class="block text-sm font-medium">Email notifications</span>
                                        <span class="block text-xs text-muted-color mt-0.5">Due-date reminders, reservation alerts and library announcements.</span>
                                    </span>
                                </label>
                                <label class="flex items-start gap-3 rounded-lg border border-surface-200 dark:border-surface-700 p-3 cursor-pointer">
                                    <p-checkbox [ngModel]="settingsDraft().smsNotifications" (ngModelChange)="patchSettings('smsNotifications', $event)" [binary]="true"></p-checkbox>
                                    <span>
                                        <span class="block text-sm font-medium">SMS notifications</span>
                                        <span class="block text-xs text-muted-color mt-0.5">Send urgent overdue and pickup reminders by SMS.</span>
                                    </span>
                                </label>
                            </div>
                        </p-card>
                    </div>
                </p-tabpanel>
            </p-tabpanels>
        </p-tabs>

        <p-toast></p-toast>
    `
})
export class PoliciesPage {
    readonly data = inject(LibraryDataService);
    private readonly msg = inject(MessageService);

    readonly memberTypes = MEMBER_TYPES;
    readonly activeTab = signal<string | number | undefined>('policies');

    readonly drafts = signal<Record<MemberType, LibraryPolicy>>(this.clonePolicies());
    readonly settingsDraft = signal<LibrarySettings>({ ...this.data.settings() });

    readonly currencyOptions = [
        { label: 'BDT — Bangladeshi Taka', value: 'BDT' },
        { label: 'USD — US Dollar', value: 'USD' },
        { label: 'EUR — Euro', value: 'EUR' },
        { label: 'GBP — Pound Sterling', value: 'GBP' },
        { label: 'INR — Indian Rupee', value: 'INR' }
    ];

    readonly timezoneOptions = [
        { label: 'Asia/Dhaka (UTC+6)', value: 'Asia/Dhaka' },
        { label: 'Asia/Kolkata (UTC+5:30)', value: 'Asia/Kolkata' },
        { label: 'Asia/Dubai (UTC+4)', value: 'Asia/Dubai' },
        { label: 'Europe/London (UTC+0)', value: 'Europe/London' },
        { label: 'America/New_York (UTC-5)', value: 'America/New_York' }
    ];

    readonly fineCalculationOptions = [
        { label: 'Daily', value: 'DAILY' },
        { label: 'Hourly', value: 'HOURLY' }
    ];

    readonly dirty = computed(() => this.policiesDirty() || this.settingsDirty());

    private policiesDirty(): boolean {
        return MEMBER_TYPES.some((type) => {
            const saved = this.data.policies().find((policy) => policy.memberType === type);
            const draft = this.drafts()[type];
            if (!saved) return true;
            return (Object.keys(draft) as (keyof LibraryPolicy)[]).some((key) => draft[key] !== saved[key]);
        });
    }

    private settingsDirty(): boolean {
        const saved = this.data.settings();
        const draft = this.settingsDraft();
        return (Object.keys(draft) as (keyof LibrarySettings)[]).some((key) => draft[key] !== saved[key]);
    }

    readonly currency = computed(() => this.settingsDraft().currency);

    memberLabel(type: MemberType): string {
        if (type === 'STUDENT') return 'Student';
        if (type === 'TEACHER') return 'Teacher / Faculty';
        return 'Staff';
    }

    memberIcon(type: MemberType): string {
        if (type === 'STUDENT') return 'pi pi-user';
        if (type === 'TEACHER') return 'pi pi-graduation-cap';
        return 'pi pi-id-card';
    }

    patchPolicy(type: MemberType, key: PolicyKey, value: number | null): void {
        if (value === null) return;
        this.drafts.update((current) => ({ ...current, [type]: { ...current[type], [key]: value } }));
    }

    patchSettings<K extends keyof LibrarySettings>(key: K, value: LibrarySettings[K]): void {
        this.settingsDraft.update((current) => ({ ...current, [key]: value }));
    }

    resetAll(): void {
        this.drafts.set(this.clonePolicies());
        this.settingsDraft.set({ ...this.data.settings() });
        this.msg.add({ severity: 'info', summary: 'Changes discarded', detail: 'Policies and settings were restored to the saved values.' });
    }

    saveAll(): void {
        if (!this.settingsDraft().libraryName.trim()) {
            this.msg.add({ severity: 'warn', summary: 'Validation', detail: 'Library name is required.' });
            return;
        }
        for (const type of MEMBER_TYPES) {
            const draft = this.drafts()[type];
            if (draft.borrowLimit < 1 || draft.loanPeriodDays < 1 || draft.renewalPeriodDays < 1 || draft.reservationHoldDays < 1) {
                this.msg.add({ severity: 'warn', summary: 'Validation', detail: `${this.memberLabel(type)} policy has invalid limits or period values.` });
                return;
            }
            if (draft.maxFine < draft.finePerDay) {
                this.msg.add({ severity: 'warn', summary: 'Validation', detail: `${this.memberLabel(type)} maximum fine cannot be lower than the daily fine.` });
                return;
            }
        }

        try {
            if (this.policiesDirty()) {
                for (const type of MEMBER_TYPES) {
                    const { id, memberType, createdAt, updatedAt, ...rules } = this.drafts()[type];
                    this.data.updatePolicy(type, rules);
                }
            }
            if (this.settingsDirty()) {
                this.data.updateSettings({ ...this.settingsDraft() });
            }
            this.drafts.set(this.clonePolicies());
            this.settingsDraft.set({ ...this.data.settings() });
            this.msg.add({ severity: 'success', summary: 'Policies saved', detail: 'Library-wide borrowing, fine and system settings have been updated.' });
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Save failed', detail: this.errorText(error) });
        }
    }

    formatCurrency(value: number): string {
        try {
            return new Intl.NumberFormat('en-BD', { style: 'currency', currency: this.currency(), maximumFractionDigits: 0 }).format(value);
        } catch {
            return `${this.currency()} ${value.toLocaleString('en-US')}`;
        }
    }

    private clonePolicies(): Record<MemberType, LibraryPolicy> {
        const build = (type: MemberType): LibraryPolicy => {
            const policy = this.data.policies().find((item) => item.memberType === type);
            return policy ? { ...policy } : {
                id: `policy-${type.toLowerCase()}`,
                memberType: type,
                borrowLimit: 1,
                loanPeriodDays: 7,
                renewalLimit: 0,
                renewalPeriodDays: 7,
                reservationLimit: 0,
                reservationHoldDays: 1,
                finePerDay: 0,
                maxFine: 0,
                gracePeriodDays: 0,
                lostBookCharge: 0,
                damagedBookCharge: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
        };
        return {
            STUDENT: build('STUDENT'),
            TEACHER: build('TEACHER'),
            STAFF: build('STAFF')
        };
    }

    private errorText(error: unknown): string {
        return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
    }
}
