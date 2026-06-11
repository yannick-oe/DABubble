/**
 * @file Reset-password screen: sets a new password for a valid reset link.
 */
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FirebaseError } from 'firebase/app';

import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';

const PASSWORD_MIN_LENGTH = 6;
const TOAST_MESSAGE = 'Anmelden';
const GENERAL_ERROR_MESSAGE = 'Das hat leider nicht geklappt. Bitte versuche es später erneut.';
const INVALID_CODE_ERRORS = ['auth/expired-action-code', 'auth/invalid-action-code'];

const PASSWORD_ERROR_MESSAGES: Record<string, string> = {
  required: 'Bitte gib ein Passwort ein',
  minlength: 'Dein Passwort muss mindestens 6 Zeichen lang sein',
};

/** Validity state of the reset code from the e-mail link. */
type CodeState = 'checking' | 'valid' | 'invalid';

/**
 * Group validator reporting a mismatch between password and confirmation.
 * @param group Form group holding password and confirm controls.
 */
function passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirm')?.value;
  return password === confirm ? null : { passwordMismatch: true };
}

/**
 * Verifies the Firebase reset code and lets the user set a new password.
 * Without a valid code the form is replaced by a re-request hint.
 */
@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordComponent implements OnInit, AfterViewInit {
  private readonly authService = inject(AuthService);

  private readonly formBuilder = inject(NonNullableFormBuilder);

  private readonly router = inject(Router);

  private readonly toast = inject(ToastService);

  private readonly title = viewChild<ElementRef<HTMLHeadingElement>>('title');

  readonly oobCode = input<string>();

  protected readonly codeState = signal<CodeState>('checking');

  protected readonly pending = signal(false);

  protected readonly generalError = signal('');

  protected readonly form = this.formBuilder.group(
    {
      password: ['', [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH)]],
      confirm: ['', Validators.required],
    },
    { validators: passwordsMatchValidator },
  );


  /**
   * Verifies the reset code from the e-mail link query parameters.
   */
  async ngOnInit(): Promise<void> {
    const code = this.oobCode();
    if (!code) {
      this.codeState.set('invalid');
      return;
    }
    await this.verifyCode(code);
  }


  /**
   * Moves focus to the page heading after navigation.
   */
  ngAfterViewInit(): void {
    this.title()?.nativeElement.focus({ preventScroll: true });
  }


  /**
   * Asks Firebase whether the reset code is still valid.
   * @param code Firebase oobCode query parameter.
   */
  private async verifyCode(code: string): Promise<void> {
    try {
      await this.authService.verifyResetCode(code);
      this.codeState.set('valid');
    } catch {
      this.codeState.set('invalid');
    }
  }


  /**
   * Resolves the visible error message for the password control.
   */
  protected passwordError(): string {
    const control = this.form.controls.password;
    if (!control.touched || !control.errors) return '';
    const key = Object.keys(control.errors)[0];
    return PASSWORD_ERROR_MESSAGES[key] ?? '';
  }


  /**
   * Resolves the visible error message for the confirmation control.
   */
  protected confirmError(): string {
    const control = this.form.controls.confirm;
    if (!control.touched) return '';
    if (control.errors?.['required']) return 'Bitte bestätige dein Passwort';
    if (this.form.errors?.['passwordMismatch']) return 'Deine Passwörter stimmen nicht überein';
    return '';
  }


  /**
   * Reports whether the confirmation should be marked invalid.
   */
  protected isConfirmInvalid(): boolean {
    return this.form.controls.confirm.touched && this.confirmError() !== '';
  }


  /**
   * Reports whether the password control should be marked invalid.
   */
  protected isPasswordInvalid(): boolean {
    const control = this.form.controls.password;
    return control.touched && control.invalid;
  }


  /**
   * Sets the new password for the verified reset code.
   */
  protected async submit(): Promise<void> {
    const code = this.oobCode();
    if (this.form.invalid || this.pending() || !code) return;
    this.pending.set(true);
    this.generalError.set('');
    try {
      await this.authService.completePasswordReset(code, this.form.getRawValue().password);
      this.finishSuccessfully();
    } catch (error: unknown) {
      this.handleResetError(error);
    } finally {
      this.pending.set(false);
    }
  }


  /**
   * Shows the confirmation toast and returns to the login page.
   */
  private finishSuccessfully(): void {
    this.toast.show(TOAST_MESSAGE);
    this.router.navigate(['/auth/login']);
  }


  /**
   * Maps reset errors to the invalid-code state or a general message.
   * @param error Unknown error thrown by the reset request.
   */
  private handleResetError(error: unknown): void {
    const code = error instanceof FirebaseError ? error.code : '';
    if (INVALID_CODE_ERRORS.includes(code)) {
      this.codeState.set('invalid');
      return;
    }
    this.generalError.set(GENERAL_ERROR_MESSAGE);
  }


  /**
   * Returns to the login page.
   */
  protected goBack(): void {
    this.router.navigate(['/auth/login']);
  }
}
