/**
 * @file Generic modal shell: scrim, focus trap, close behaviors and focus
 * restore for projected dialog content.
 */
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  input,
  output,
  viewChild,
} from '@angular/core';

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled])';

/**
 * Modal wrapper shared by the channel-management dialogs: renders the
 * scrim and the card, traps Tab focus, closes on Escape and on clicks on
 * the scrim, focuses the first focusable element on open and returns
 * focus to the opening element on destroy.
 */
@Component({
  selector: 'app-dialog-shell',
  templateUrl: './dialog-shell.component.html',
  styleUrl: './dialog-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'closed.emit()',
  },
})
export class DialogShellComponent implements AfterViewInit, OnDestroy {
  readonly labelledBy = input.required<string>();

  readonly size = input<'md' | 'sm'>('md');

  readonly closed = output<void>();

  private readonly previouslyFocused = document.activeElement as HTMLElement | null;

  private readonly card = viewChild.required<ElementRef<HTMLElement>>('card');


  /**
   * Focuses the first focusable element once the dialog is rendered.
   */
  ngAfterViewInit(): void {
    this.focusableElements()[0]?.focus();
  }


  /**
   * Returns focus to the element that opened the dialog.
   */
  ngOnDestroy(): void {
    this.previouslyFocused?.focus();
  }


  /**
   * Closes the dialog when the click lands on the scrim itself.
   * @param event Click event on the overlay.
   */
  protected onOverlayClick(event: Event): void {
    if (event.target === event.currentTarget) this.closed.emit();
  }


  /**
   * Keeps Tab and Shift+Tab cycling inside the dialog.
   * @param event Keydown event of the Tab key.
   */
  protected trapFocus(event: Event): void {
    if (!(event instanceof KeyboardEvent)) return;
    const focusables = this.focusableElements();
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }


  /**
   * Lists the currently visible focusable elements inside the card.
   */
  private focusableElements(): HTMLElement[] {
    const elements = this.card().nativeElement.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    return [...elements].filter(element => element.offsetParent !== null);
  }
}
