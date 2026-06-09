import { Injectable, signal } from '@angular/core';

/** Manages transient UI state such as panel visibility. */
@Injectable({ providedIn: 'root' })
export class UiStateService {
  readonly isSidebarOpen = signal(true);
  readonly isThreadPanelOpen = signal(false);
  readonly activeThreadMessageId = signal<string | null>(null);

  /** Toggle sidebar collapsed/expanded state. */
  toggleSidebar(): void {
    this.isSidebarOpen.update(open => !open);
  }

  /** Open the thread panel for a given message. */
  openThread(messageId: string): void {
    this.activeThreadMessageId.set(messageId);
    this.isThreadPanelOpen.set(true);
  }

  /** Close the thread panel and reset active thread. */
  closeThread(): void {
    this.isThreadPanelOpen.set(false);
    this.activeThreadMessageId.set(null);
  }
}
