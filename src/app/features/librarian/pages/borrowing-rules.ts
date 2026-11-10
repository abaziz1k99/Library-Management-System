import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PageHeader } from '@/app/shared/components/page-header';
import { LibraryDataService } from '@/app/core/services/library-data.service';
import type { LibraryPolicy, MemberType } from '@/app/core/models/library.models';

type PolicyKey = 'borrowLimit' | 'loanPeriodDays' | 'renewalLimit' | 'renewalPeriodDays' | 'reservationLimit' | 'reservationHoldDays' | 'gracePeriodDays' | 'finePerDay' | 'maxFine' | 'lostBookCharge' | 'damagedBookCharge';

const MEMBER_TYPES: MemberType[] = ['STUDENT', 'TEACHER', 'STAFF'];

@Component({
    selector: 'app-borrowing-rules',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, CardModule, InputNumberModule, MessageModule, ToastModule, PageHeader],
    providers: [MessageService],
    template: `
        <app-page-header title="Borrowing Rules" subtitle="Configure borrowing limits and loan periods for students, teachers and staff">
            <p-button label="Reset" icon="pi pi-undo" severity="secondary" [outlined]="true" [disabled]="!dirty()" (onClick)="reset()"></p-button>
            <p-button label="Save Rules" icon="pi pi-save" [disabled]="!dirty()" (onClick)="save()"></p-button>
        </app-page-header>

        <p-message severity="info" icon="pi pi-info-circle" styleClass="w-full mb-4">
            These limits are applied when issuing books, processing renewals and calculating overdue fines. Super Admin policies remain the system-wide baseline.
        </p-message>

        <div class="grid gap-4 xl:grid-cols-3">
            @for (type of memberTypes; track type) {
                <p-card>
                    <ng-template pTemplate="header">
                        <div class="flex items-center gap-3 px-4 pt-4">
                            <div class="w-10 h-10 rounded-lg flex items-center justify-center bg-primary-100 dark:bg-primary-950 text-primary">
                                <i [class]="memberIcon(type)"></i>
                            </div>
                            <div>
                                <h2 class="text-base font-semibold">{{ memberLabel(type) }} Rules</h2>
                                <p class="text-xs text-muted-color">{{ drafts()[type].borrowLimit }} books · {{ drafts()[type].loanPeriodDays }} days</p>
                            </div>
                        </div>
                    </ng-template>

                    <div class="grid grid-cols-2 gap-3">
                        <div class="flex flex-col gap-1.5">
                            <label class="text-xs font-medium text-muted-color">Borrow Limit</label>
                            <p-inputnumber [ngModel]="drafts()[type].borrowLimit" (ngModelChange)="patch(type, 'borrowLimit', $event)" [min]="1" [max]="50" [showButtons]="true" styleClass="w-full" inputStyleClass="w-full"></p-inputnumber>
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label class="text-xs font-medium text-muted-color">Loan Period (days)</label>
                            <p-inputnumber [ngModel]="drafts()[type].loanPeriodDays" (ngModelChange)="patch(type, 'loanPeriodDays', $event)" [min]="1" [max]="365" [showButtons]="true" styleClass="w-full" inputStyleClass="w-full"></p-inputnumber>
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label class="text-xs font-medium text-muted-color">Renewal Limit</label>
                            <p-inputnumber [ngModel]="drafts()[type].renewalLimit" (ngModelChange)="patch(type, 'renewalLimit', $event)" [min]="0" [max]="20" [showButtons]="true" styleClass="w-full" inputStyleClass="w-full"></p-inputnumber>
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label class="text-xs font-medium text-muted-color">Renewal Days</label>
                            <p-inputnumber [ngModel]="drafts()[type].renewalPeriodDays" (ngModelChange)="patch(type, 'renewalPeriodDays', $event)" [min]="1" [max]="180" [showButtons]="true" styleClass="w-full" inputStyleClass="w-full"></p-inputnumber>
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label class="text-xs font-medium text-muted-color">Reservation Limit</label>
                            <p-inputnumber [ngModel]="drafts()[type].reservationLimit" (ngModelChange)="patch(type, 'reservationLimit', $event)" [min]="0" [max]="20" [showButtons]="true" styleClass="w-full" inputStyleClass="w-full"></p-inputnumber>
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label class="text-xs font-medium text-muted-color">Hold Days</label>
                            <p-inputnumber [ngModel]="drafts()[type].reservationHoldDays" (ngModelChange)="patch(type, 'reservationHoldDays', $event)" [min]="1" [max]="30" [showButtons]="true" styleClass="w-full" inputStyleClass="w-full"></p-inputnumber>
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label class="text-xs font-medium text-muted-color">Grace Days</label>
                            <p-inputnumber [ngModel]="drafts()[type].gracePeriodDays" (ngModelChange)="patch(type, 'gracePeriodDays', $event)" [min]="0" [max]="30" [showButtons]="true" styleClass="w-full" inputStyleClass="w-full"></p-inputnumber>
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label class="text-xs font-medium text-muted-color">Fine / Day</label>
                            <p-inputnumber [ngModel]="drafts()[type].finePerDay" (ngModelChange)="patch(type, 'finePerDay', $event)" [min]="0" [max]="1000" [showButtons]="true" styleClass="w-full" inputStyleClass="w-full"></p-inputnumber>
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label class="text-xs font-medium text-muted-color">Maximum Fine</label>
                            <p-inputnumber [ngModel]="drafts()[type].maxFine" (ngModelChange)="patch(type, 'maxFine', $event)" [min]="0" [max]="100000" [showButtons]="true" styleClass="w-full" inputStyleClass="w-full"></p-inputnumber>
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <label class="text-xs font-medium text-muted-color">Lost Book Charge</label>
                            <p-inputnumber [ngModel]="drafts()[type].lostBookCharge" (ngModelChange)="patch(type, 'lostBookCharge', $event)" [min]="0" [max]="100000" [showButtons]="true" styleClass="w-full" inputStyleClass="w-full"></p-inputnumber>
                        </div>
                        <div class="flex flex-col gap-1.5 col-span-2">
                            <label class="text-xs font-medium text-muted-color">Damaged Book Charge</label>
                            <p-inputnumber [ngModel]="drafts()[type].damagedBookCharge" (ngModelChange)="patch(type, 'damagedBookCharge', $event)" [min]="0" [max]="100000" [showButtons]="true" styleClass="w-full" inputStyleClass="w-full"></p-inputnumber>
                        </div>
                    </div>
                </p-card>
            }
        </div>

        <p-toast></p-toast>
    `
})
export class BorrowingRulesPage {
    readonly data = inject(LibraryDataService);
    private readonly msg = inject(MessageService);

    readonly memberTypes = MEMBER_TYPES;
    readonly drafts = signal<Record<MemberType, LibraryPolicy>>(this.clone());

    readonly dirty = computed(() =>
        MEMBER_TYPES.some((type) => {
            const saved = this.data.policies().find((policy) => policy.memberType === type);
            const draft = this.drafts()[type];
            if (!saved) return true;
            return (Object.keys(draft) as (keyof LibraryPolicy)[]).some((key) => draft[key] !== saved[key]);
        })
    );

    memberLabel(type: MemberType): string {
        return type === 'STUDENT' ? 'Student' : type === 'TEACHER' ? 'Teacher / Faculty' : 'Staff';
    }

    memberIcon(type: MemberType): string {
        return type === 'STUDENT' ? 'pi pi-user' : type === 'TEACHER' ? 'pi pi-graduation-cap' : 'pi pi-id-card';
    }

    patch(type: MemberType, key: PolicyKey, value: number | null): void {
        if (value === null) return;
        this.drafts.update((current) => ({ ...current, [type]: { ...current[type], [key]: value } }));
    }

    reset(): void {
        this.drafts.set(this.clone());
        this.msg.add({ severity: 'info', summary: 'Changes discarded', detail: 'Rules were restored to the saved values.' });
    }

    save(): void {
        for (const type of MEMBER_TYPES) {
            const draft = this.drafts()[type];
            if (draft.borrowLimit < 1 || draft.loanPeriodDays < 1 || draft.renewalPeriodDays < 1 || draft.reservationHoldDays < 1) {
                this.msg.add({ severity: 'warn', summary: 'Validation', detail: `${this.memberLabel(type)} has invalid limits or periods.` });
                return;
            }
            if (draft.maxFine < draft.finePerDay) {
                this.msg.add({ severity: 'warn', summary: 'Validation', detail: `${this.memberLabel(type)} maximum fine cannot be lower than the daily fine.` });
                return;
            }
        }
        try {
            for (const type of MEMBER_TYPES) {
                const { id, memberType, createdAt, updatedAt, ...rules } = this.drafts()[type];
                this.data.updatePolicy(type, rules);
            }
            this.drafts.set(this.clone());
            this.msg.add({ severity: 'success', summary: 'Borrowing rules saved', detail: 'The new limits apply to future loans and renewals.' });
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Save failed', detail: error instanceof Error ? error.message : 'Something went wrong.' });
        }
    }

    private clone(): Record<MemberType, LibraryPolicy> {
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
        return { STUDENT: build('STUDENT'), TEACHER: build('TEACHER'), STAFF: build('STAFF') };
    }
}
