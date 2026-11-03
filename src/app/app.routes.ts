import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './core/guards';
import { Shell } from './layout/shell';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },

  // Ohne App-Rahmen
  { path: 'login', canActivate: [guestGuard], loadComponent: () => import('./features/auth/login') },
  { path: 'register', canActivate: [guestGuard], loadComponent: () => import('./features/auth/register') },
  { path: 'forgot-password', loadComponent: () => import('./features/auth/forgot-password') },
  { path: 'reset-password', loadComponent: () => import('./features/auth/reset-password') },
  { path: 'reset-password/:resetCode', loadComponent: () => import('./features/auth/reset-password') },

  // Mit App-Rahmen, nur eingeloggt
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: 'home', loadComponent: () => import('./features/home/home') },
      { path: 'wishes', loadComponent: () => import('./features/wishes/wishes') },
      { path: 'wish-edit', loadComponent: () => import('./features/wishes/wish-edit') },
      { path: 'wish-edit/:id', loadComponent: () => import('./features/wishes/wish-edit') },
      { path: 'wish-edit/:id/:eventId', loadComponent: () => import('./features/wishes/wish-edit') },
      { path: 'events', loadComponent: () => import('./features/events/events') },
      { path: 'event/:id', loadComponent: () => import('./features/events/event-detail') },
      { path: 'event-edit', loadComponent: () => import('./features/events/event-edit') },
      { path: 'event-edit/:id', loadComponent: () => import('./features/events/event-edit') },
      { path: 'following', loadComponent: () => import('./features/following/following') },
      { path: 'user/:id', loadComponent: () => import('./features/users/user-profile') },
      { path: 'profile', loadComponent: () => import('./features/profile/profile') },
      { path: 'admin', canActivate: [adminGuard], loadComponent: () => import('./features/admin/admin') },
      { path: 'not-found', loadComponent: () => import('./features/not-found') },
    ],
  },
  { path: '**', redirectTo: 'not-found' },
];
