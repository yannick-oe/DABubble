/**
 * @file Full-screen mobile search view per the Figma mobile "Search"
 * frame, wrapping the shared search bar in a dialog shell.
 */
import { AfterViewInit, ChangeDetectionStrategy, Component, output, viewChild } from '@angular/core';

import { DialogShellComponent } from '../../../shared/dialog-shell/dialog-shell.component';
import { SearchBarComponent } from '../search-bar/search-bar.component';

/**
 * Dedicated full-screen search view on mobile: own header with title and
 * close button, the shared search bar with inline full-height results.
 * Reuses the dialog shell for focus trap, Escape close and focus restore;
 * any picked result closes the view via the search bar's picked output.
 */
@Component({
  selector: 'app-mobile-search-view',
  imports: [DialogShellComponent, SearchBarComponent],
  templateUrl: './mobile-search-view.component.html',
  styleUrl: './mobile-search-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileSearchViewComponent implements AfterViewInit {
  readonly closed = output<void>();

  readonly userSelected = output<string>();

  private readonly searchBar = viewChild.required(SearchBarComponent);


  /**
   * Focuses the search input on open (the user tapped the search field
   * to get here), overriding the shell's first-focusable default.
   */
  ngAfterViewInit(): void {
    this.searchBar().focusInput();
  }
}
