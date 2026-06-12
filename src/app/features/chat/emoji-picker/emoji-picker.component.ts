/**
 * @file Emoji picker popover with the predefined emoji set.
 */
import { ChangeDetectionStrategy, Component, ElementRef, inject, output } from '@angular/core';

const EMOJI_SET = [
  '✅', '🙌', '👍', '🚀', '🤓', '😀',
  '😂', '❤️', '🎉', '🔥', '😎', '🤔',
  '👀', '💯', '😅', '🙏', '👏', '😍',
  '🥳', '😢', '💡', '⚡', '👎', '🍀',
] as const;

/**
 * Popover with the predefined emoji grid, shared by the reaction flows and
 * the composer. Emits the picked emoji and closes on Escape or any click
 * outside; the opening component positions it and restores focus.
 */
@Component({
  selector: 'app-emoji-picker',
  templateUrl: './emoji-picker.component.html',
  styleUrl: './emoji-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'closed.emit()',
  },
})
export class EmojiPickerComponent {
  readonly picked = output<string>();

  readonly closed = output<void>();

  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly emojis = EMOJI_SET;


  /**
   * Closes the picker when a click lands outside of it. Openers stop the
   * propagation of their own toggle click.
   * @param event Document-level click event.
   */
  protected onDocumentClick(event: Event): void {
    if (!this.host.nativeElement.contains(event.target as Node)) this.closed.emit();
  }
}
