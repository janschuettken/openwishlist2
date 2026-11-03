import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from './auth.store';

export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  await auth.init();
  return auth.isLoggedIn() ? true : router.createUrlTree(['/login'], { queryParams: { next: state.url } });
};

export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthStore);
  await auth.init();
  return auth.isLoggedIn() ? inject(Router).createUrlTree(['/home']) : true;
};

export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthStore);
  await auth.init();
  return auth.isAdmin() ? true : inject(Router).createUrlTree(['/home']);
};
