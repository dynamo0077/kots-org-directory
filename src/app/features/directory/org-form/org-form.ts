import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  AsyncValidatorFn,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Observable, map, of, timer } from 'rxjs';
import { I18n } from '../../../core/i18n.service';
import { ORG_STATUSES, OrgStatus } from '../../../core/models';
import { OrganisationStore } from '../../../core/organisation.store';

interface OrgFormModel {
  name: FormControl<string>;
  status: FormControl<OrgStatus | ''>;
  ownerEmail: FormControl<string>;
  memberCount: FormControl<string>;
}

/** Optional field, but if filled it must be a whole number of 0 or more. */
const memberCountFormat: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const raw = control.value;
  if (raw === '' || raw === null || raw === undefined) {
    return null;
  }
  return /^\d+$/.test(String(raw).trim()) ? null : { memberCountFormat: true };
};

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-org-form',
  styleUrl: './org-form.scss',
  templateUrl: './org-form.html',
})
export class OrgForm {
  protected readonly i18n = inject(I18n);
  protected readonly store = inject(OrganisationStore);
  protected readonly statuses = ORG_STATUSES.filter((status) => status !== 'unknown');
  protected readonly submitted = signal(false);
  protected readonly success = signal<string | null>(null);

  /** Case-insensitive uniqueness check against everything already listed. */
  private readonly uniqueName: AsyncValidatorFn = (
    control: AbstractControl,
  ): Observable<ValidationErrors | null> => {
    const value = typeof control.value === 'string' ? control.value.trim().toLowerCase() : '';
    if (value === '') {
      return of(null);
    }
    return timer(0).pipe(map(() => (this.store.takenNames().has(value) ? { duplicate: true } : null)));
  };

  /**
   * Typed, non-nullable reactive form. Every control updates on blur so
   * errors appear when the user leaves a field, not on every keystroke.
   */
  protected readonly form = new FormGroup<OrgFormModel>({
    name: new FormControl('', {
      nonNullable: true,
      updateOn: 'blur',
      validators: [Validators.required, Validators.minLength(3), Validators.maxLength(80)],
      asyncValidators: [this.uniqueName],
    }),
    status: new FormControl<OrgStatus | ''>('', {
      nonNullable: true,
      updateOn: 'blur',
      validators: [Validators.required],
    }),
    ownerEmail: new FormControl('', {
      nonNullable: true,
      updateOn: 'blur',
      validators: [Validators.required, Validators.email],
    }),
    memberCount: new FormControl('', {
      nonNullable: true,
      updateOn: 'blur',
      validators: [memberCountFormat],
    }),
  });

  protected showError(controlName: keyof OrgFormModel): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || this.submitted());
  }

  protected errorKey(controlName: keyof OrgFormModel): string | null {
    const errors = this.form.controls[controlName].errors;
    if (!errors) {
      return null;
    }
    switch (controlName) {
      case 'name':
        if (errors['required']) return 'form.name.required';
        if (errors['minlength']) return 'form.name.minLength';
        if (errors['maxlength']) return 'form.name.maxLength';
        if (errors['duplicate']) return 'form.name.duplicate';
        return null;
      case 'status':
        return errors['required'] ? 'form.status.required' : null;
      case 'ownerEmail':
        if (errors['required']) return 'form.owner.required';
        return errors['email'] ? 'form.owner.invalid' : null;
      case 'memberCount':
        return errors['memberCountFormat'] ? 'form.members.invalid' : null;
      default:
        return null;
    }
  }

  /** Summary of everything wrong right now: the submit button is never the only signal. */
  protected errorList(): { field: string; message: string }[] {
    const labels: Record<keyof OrgFormModel, string> = {
      name: this.i18n.t('form.name.label'),
      status: this.i18n.t('form.status.label'),
      ownerEmail: this.i18n.t('form.owner.label'),
      memberCount: this.i18n.t('form.members.label'),
    };
    const items: { field: string; message: string }[] = [];
    for (const controlName of Object.keys(labels) as (keyof OrgFormModel)[]) {
      if (!this.showError(controlName)) {
        continue;
      }
      const key = this.errorKey(controlName);
      if (key !== null) {
        items.push({ field: labels[controlName], message: this.i18n.t(key) });
      }
    }
    return items;
  }

  protected submit(): void {
    this.submitted.set(true);
    this.success.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const name = value.name.trim();
    this.store.addOrganisation({
      name,
      status: value.status as OrgStatus,
      ownerEmail: value.ownerEmail.trim(),
      memberCount: value.memberCount.trim() === '' ? null : Number(value.memberCount.trim()),
    });
    this.success.set(this.i18n.t('form.success', { name }));
    this.form.reset({ name: '', status: '', ownerEmail: '', memberCount: '' });
    this.submitted.set(false);
  }

  protected reset(): void {
    this.form.reset({ name: '', status: '', ownerEmail: '', memberCount: '' });
    this.submitted.set(false);
    this.success.set(null);
  }

}
