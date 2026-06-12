/**
 * @file Topbar search field with the grouped live-result dropdown.
 */
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { LayoutService } from '../../../services/layout.service';
import { MessageFocusService } from '../../../services/message-focus.service';
import { DEFAULT_AVATAR_PATH } from '../../../services/registration.service';
import {
  ChannelHit,
  MessageHit,
  SearchResults,
  SearchService,
  UserHit,
} from '../../../services/search.service';

const DEBOUNCE_MS = 250;
const MIN_TERM_LENGTH = 2;
const DESKTOP_PLACEHOLDER = 'Devspace durchsuchen';
const MOBILE_PLACEHOLDER = 'Gehe zu...';

type SearchHit = ChannelHit | UserHit | MessageHit;

/**
 * "Devspace durchsuchen" per the topbar frame with a token-based grouped
 * result dropdown (no Figma design exists for the dropdown — styled in
 * line with the mention dropdowns). Searching debounces and starts at two
 * characters; results navigate to channels, open profiles or jump to the
 * matched message.
 */
@Component({
  selector: 'app-search-bar',
  imports: [ReactiveFormsModule],
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class SearchBarComponent {
  readonly userSelected = output<string>();

  private readonly searchService = inject(SearchService);

  private readonly messageFocusService = inject(MessageFocusService);

  private readonly router = inject(Router);

  private readonly host = inject(ElementRef<HTMLElement>);

  private readonly layoutService = inject(LayoutService);

  protected readonly placeholder = computed(() =>
    this.layoutService.isMobile() ? MOBILE_PLACEHOLDER : DESKTOP_PLACEHOLDER,
  );

  private readonly searchInput = viewChild.required<ElementRef<HTMLInputElement>>('searchInput');

  protected readonly searchControl = new FormControl('', { nonNullable: true });

  private readonly term = toSignal(
    this.searchControl.valueChanges.pipe(debounceTime(DEBOUNCE_MS), distinctUntilChanged()),
    { initialValue: '' },
  );

  protected readonly results = signal<SearchResults | null>(null);

  protected readonly activeIndex = signal(0);

  private searchRequestId = 0;

  protected readonly flatHits = computed<SearchHit[]>(() => {
    const results = this.results();
    if (!results) return [];
    return [...results.channels, ...results.users, ...results.messages];
  });


  /**
   * Re-runs the search whenever the debounced term changes.
   */
  constructor() {
    effect(() => this.runSearch(this.term()));
  }


  /**
   * Handles search keys: result navigation, Enter picks, Escape closes
   * and keeps focus in the input.
   * @param event Keydown event of the search input.
   */
  protected onKeydown(event: Event): void {
    if (!(event instanceof KeyboardEvent)) return;
    const count = this.flatHits().length;
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && count > 0) {
      event.preventDefault();
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      this.activeIndex.set((this.activeIndex() + delta + count) % count);
      return;
    }
    if (event.key === 'Enter' && count > 0) return this.pick(this.flatHits()[this.activeIndex()]);
    if (event.key === 'Escape') this.closeOnEscape(event);
  }


  /**
   * Resolves a clicked or keyboard-picked result.
   * @param hit Search hit to open.
   */
  protected pick(hit: SearchHit): void {
    this.results.set(null);
    if (hit.kind === 'channel') void this.router.navigate(['/app/channel', hit.id]);
    if (hit.kind === 'user') this.userSelected.emit(hit.uid);
    if (hit.kind === 'message') void this.openMessage(hit);
  }


  /**
   * Builds the avatar URL of a user hit.
   * @param hit User search hit.
   */
  protected avatarSrc(hit: UserHit): string {
    const path = hit.avatarPath;
    return !path || path.startsWith('http') ? `/${DEFAULT_AVATAR_PATH}` : `/${path}`;
  }


  /**
   * Computes the flat keyboard index of a hit inside its group.
   * @param group Group offset key.
   * @param index Index within the group.
   */
  protected flatIndex(group: 'channels' | 'users' | 'messages', index: number): number {
    const results = this.results();
    if (!results) return index;
    if (group === 'channels') return index;
    if (group === 'users') return results.channels.length + index;
    return results.channels.length + results.users.length + index;
  }


  /**
   * Closes the dropdown when a click lands outside the search bar.
   * @param event Document-level click event.
   */
  protected onDocumentClick(event: Event): void {
    if (!this.host.nativeElement.contains(event.target as Node)) this.results.set(null);
  }


  /**
   * Navigates to the matched message and marks it for scroll + highlight.
   * @param hit Message search hit.
   */
  private async openMessage(hit: MessageHit): Promise<void> {
    this.messageFocusService.focus(hit.id);
    await this.router.navigate(hit.route);
  }


  /**
   * Closes the dropdown via Escape, keeping focus in the input.
   * @param event Escape keydown event.
   */
  private closeOnEscape(event: KeyboardEvent): void {
    if (this.results() === null) return;
    event.stopPropagation();
    this.results.set(null);
    this.searchInput().nativeElement.focus();
  }


  /**
   * Runs the debounced search; terms below the minimum length clear the
   * dropdown without querying.
   * @param term Current debounced term.
   */
  private async runSearch(term: string): Promise<void> {
    if (term.trim().length < MIN_TERM_LENGTH) return this.results.set(null);
    const requestId = (this.searchRequestId += 1);
    const results = await this.searchService.search(term);
    if (requestId !== this.searchRequestId) return;
    this.results.set(results);
    this.activeIndex.set(0);
  }
}
