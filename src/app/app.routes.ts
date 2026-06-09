import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login.component').then(m => m.LoginComponent),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/register/register.component').then(m => m.RegisterComponent),
      },
      {
        path: 'avatar',
        loadComponent: () =>
          import('./features/auth/avatar-picker/avatar-picker.component').then(
            m => m.AvatarPickerComponent,
          ),
      },
      {
        path: 'reset-password',
        loadComponent: () =>
          import('./features/auth/reset-password/reset-password.component').then(
            m => m.ResetPasswordComponent,
          ),
      },
      {
        path: 'new-password',
        loadComponent: () =>
          import('./features/auth/new-password/new-password.component').then(
            m => m.NewPasswordComponent,
          ),
      },
    ],
  },
  {
    path: 'app',
    loadComponent: () =>
      import('./features/chat/app-shell/app-shell.component').then(m => m.AppShellComponent),
    children: [
      {
        path: 'channel/:channelId',
        loadComponent: () =>
          import('./features/chat/channel-view/channel-view.component').then(
            m => m.ChannelViewComponent,
          ),
      },
      {
        path: 'direct/:userId',
        loadComponent: () =>
          import('./features/chat/direct-message-view/direct-message-view.component').then(
            m => m.DirectMessageViewComponent,
          ),
      },
      {
        path: 'new-message',
        loadComponent: () =>
          import('./features/chat/new-message/new-message.component').then(
            m => m.NewMessageComponent,
          ),
      },
    ],
  },
  {
    path: 'legal',
    children: [
      {
        path: 'imprint',
        loadComponent: () =>
          import('./features/legal/imprint/imprint.component').then(m => m.ImprintComponent),
      },
      {
        path: 'privacy',
        loadComponent: () =>
          import('./features/legal/privacy/privacy.component').then(m => m.PrivacyComponent),
      },
    ],
  },
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
  { path: '**', redirectTo: 'auth/login' },
];
