/**
 * @file Privacy policy page with the DSGVO information sections.
 */
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  viewChild,
} from '@angular/core';

/**
 * Static full-width legal page describing how DABubble processes
 * personal data.
 */
@Component({
  selector: 'app-privacy',
  templateUrl: './privacy.component.html',
  styleUrl: './privacy.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyComponent implements AfterViewInit {
  private readonly title = viewChild<ElementRef<HTMLHeadingElement>>('title');


  /**
   * Moves focus to the page heading after navigation.
   */
  ngAfterViewInit(): void {
    this.title()?.nativeElement.focus({ preventScroll: true });
  }
}
