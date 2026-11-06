import { Injectable, isDevMode } from '@angular/core';
import { environment } from '../../environments/environment';
import {
  ListType,
  Member,
  User,
  Wish,
  WishList,
  toList,
  toMember,
  toUser,
  toWish,
} from './models';
import { storage, StorageKeys } from './storage';

/** Fehler, den die API mit `result: 'not ok'` meldet */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly sessionError = false,
  ) {
    super(message);
  }
}

export interface LoginResult {
  user: User;
  session: string;
}

/**
 * Zugriff auf rest-api.php. Alle Aufrufe sind POST mit `{ action, session, ... }`.
 * Läuft die Session ab, wird einmal per loginToken neu eingeloggt und wiederholt.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  readonly endpoint = environment.apiUrl;

  async call<T = any>(action: string, data: Record<string, unknown> = {}, withSession = true, retry = true): Promise<T> {
    const body: Record<string, unknown> = { ...data, action };
    if (withSession) body['session'] = storage.get(StorageKeys.session);

    // Im Dev-Modus die Action an die URL hängen, damit man sie im Netzwerk-Tab sieht
    const url = isDevMode() ? `${this.endpoint}?${action}` : this.endpoint;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new ApiError(`HTTP ${response.status}`);

    const result = await response.json();
    if (result && !Array.isArray(result) && (result.result === 'not ok' || result.error)) {
      const sessionError = result.session !== undefined || result.message === 'Session not set';
      if (sessionError && withSession && retry && storage.get(StorageKeys.loginToken)) {
        await this.loginWithToken(storage.get(StorageKeys.loginToken)!);
        return this.call<T>(action, data, withSession, false);
      }
      throw new ApiError(result.message ?? result.error ?? 'Unbekannter Fehler', sessionError);
    }
    return result as T;
  }

  // ---------- Auth ----------

  async login(email: string, password: string): Promise<LoginResult> {
    const r = await this.call('login', { email, password }, false);
    storage.set(StorageKeys.session, r.session);
    return { user: toUser(r.user), session: r.session };
  }

  async loginWithToken(loginToken: string): Promise<LoginResult> {
    const r = await this.call('login', { loginToken }, false, false);
    if (!r?.user) throw new ApiError('Login fehlgeschlagen', true);
    storage.set(StorageKeys.session, r.session);
    return { user: toUser(r.user), session: r.session };
  }

  register(data: { email: string; password: string; firstName: string; lastName: string }) {
    return this.call('register', data, false);
  }

  forgotPassword(mail: string) {
    return this.call('forgotPasswordMail', { mail }, false);
  }

  resetPassword(resetCode: string, newPassword: string) {
    return this.call('resetPassword', { resetCode, newPassword }, false);
  }

  /**
   * Passwort ändern. Das Backend hat dafür keine eigene Action: Wir prüfen das alte
   * Passwort per Login und setzen das neue über resetPassword mit dem resetCode,
   * den der Login zurückgibt (danach erzeugt das Backend einen neuen resetCode).
   */
  async changePassword(email: string, oldPassword: string, newPassword: string) {
    const r = await this.call('login', { email, password: oldPassword }, false);
    storage.set(StorageKeys.session, r.session);
    const resetCode = r.user?.resetCode;
    if (!resetCode) throw new ApiError('Passwort konnte nicht geändert werden');
    await this.resetPassword(resetCode, newPassword);
  }

  // ---------- Nutzer ----------

  editUser(u: Pick<User, 'userId' | 'firstName' | 'lastName' | 'email'>) {
    return this.call('editUser', {
      userId: u.userId,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
    });
  }

  async getUser(userId: number): Promise<User | null> {
    const r = await this.call<any[]>('getUser', { userId });
    return r.length ? toUser(r[0]) : null;
  }

  async searchUsers(search: string, adminMode = false): Promise<User[]> {
    const data: Record<string, unknown> = { search };
    if (adminMode) data['adminMode'] = true;
    const r = await this.call<any[]>('getUser', data);
    return r.map(toUser);
  }

  /** Profilbild hochladen (multipart, Antwort ist Text/JSON) */
  async uploadUserImage(file: File): Promise<void> {
    const form = new FormData();
    form.append('file', file, file.name);
    form.append('action', 'setUserImage');
    form.append('session', storage.get(StorageKeys.session) ?? '');
    const response = await fetch(this.endpoint, { method: 'POST', body: form });
    const text = await response.text();
    if (!response.ok || text.startsWith('#fail#') || text.includes('"not ok"')) {
      let message = text;
      try {
        message = JSON.parse(text).message ?? text;
      } catch {
        /* Text-Antwort */
      }
      throw new ApiError(message.replace('#fail#', '') || 'Upload fehlgeschlagen');
    }
  }

  // ---------- Wünsche ----------

  async getWishesOfUser(userId: number): Promise<Wish[]> {
    return (await this.call<any[]>('getWishes', { userId })).map(toWish);
  }

  async getWishesOfList(eventId: number, userId?: number): Promise<Wish[]> {
    const data: Record<string, unknown> = { eventId };
    if (userId != null) data['userId'] = userId;
    return (await this.call<any[]>('getWishes', data)).map(toWish);
  }

  /** Eigenen Wunsch per ID laden */
  async getOwnWish(wishId: number): Promise<Wish | null> {
    const r = await this.call<any[]>('getWishes', { wishId });
    return r.length ? toWish(r[0]) : null;
  }

  /** Wünsche eines Nutzers in einer Liste mit Reservierungsstand */
  async getWishesClaimed(userId: number, eventId: number): Promise<Wish[]> {
    return (await this.call<any[]>('getWishesClaimed', { userId, eventId })).map(toWish);
  }

  async addWish(w: Pick<Wish, 'title' | 'description' | 'url' | 'wishImgUrl'>): Promise<number> {
    const r = await this.call('addWish', {
      title: w.title,
      description: w.description,
      url: w.url,
      wishImgUrl: w.wishImgUrl ?? '',
    });
    return Number(r.wishId);
  }

  editWish(w: Pick<Wish, 'wishId' | 'title' | 'description' | 'url' | 'archived'>) {
    return this.call('editWish', {
      wishId: w.wishId,
      title: w.title,
      description: w.description,
      url: w.url,
      archived: w.archived ? 1 : 0,
    });
  }

  deleteWish(wishId: number) {
    return this.call('deleteWish', { wishId });
  }

  claimWish(wishId: number, amount = 1) {
    return this.call('claimWish', { wishId, amount });
  }

  /** amount 0 hebt die Reservierung auf */
  editClaim(wishId: number, amount: number) {
    return this.call('editClaim', { wishId, amount });
  }

  // ---------- Listen ----------

  /** Listen, in denen der Nutzer Mitglied oder Besitzer ist (power >= 50) */
  async getMyLists(userId: number): Promise<WishList[]> {
    return (await this.call<any[]>('getEvents', { userId })).map(toList);
  }

  async getList(eventId: number): Promise<WishList | null> {
    const r = await this.call<any[]>('getEvents', { eventId });
    return r.length ? toList(r[0]) : null;
  }

  async addList(l: Pick<WishList, 'eventTitle' | 'eventType' | 'deadline' | 'eventDescription'>) {
    const r = await this.call('addEvent', {
      eventTitle: l.eventTitle,
      eventType: l.eventType,
      deadline: l.deadline ?? '',
      eventDescription: l.eventDescription,
    });
    return { eventId: Number(r.eventId), eventCode: String(r.eventCode) };
  }

  editList(l: WishList) {
    return this.call('editEvent', {
      eventId: l.eventId,
      eventTitle: l.eventTitle,
      eventType: l.eventType,
      deadline: l.deadline || null,
      eventDescription: l.eventDescription,
      archived: l.archived ? 1 : 0,
    });
  }

  deleteList(eventId: number) {
    return this.call('deleteEvent', { eventId });
  }

  addWishToList(eventId: number, wishId: number) {
    return this.call('addEventWish', { eventId, wishId });
  }

  removeWishFromList(eventId: number, wishId: number) {
    return this.call('deleteEventWish', { eventId, wishId });
  }

  async getMembers(eventId: number): Promise<Member[]> {
    return (await this.call<any[]>('getEventUsers', { eventId })).map(toMember);
  }

  /** Öffentliche und (für Mitglieder sichtbare) geteilte Listen eines Nutzers */
  async getVisibleListsOfUser(userId: number): Promise<WishList[]> {
    return (await this.call<any[]>('getEventUsers', { userId })).map(toList);
  }

  /** Listen, denen der Nutzer folgt (power 0) */
  async getFollowedLists(userId: number): Promise<WishList[]> {
    return (await this.call<any[]>('getEventFollowed', { userId })).map(toList);
  }

  addMember(eventId: number, userId: number, power: number, notify = false) {
    return this.call('addEventUser', { eventId, userId, power, notify: notify ? 1 : 0 });
  }

  removeMember(eventId: number, userId: number) {
    return this.call('deleteEventUser', { eventId, userId });
  }

  setMemberPower(eventId: number, userId: number, power: number) {
    return this.call('updateEventUserPower', { eventId, userId, power });
  }

  setMemberNotify(eventId: number, userId: number, notify: boolean) {
    return this.call('updateEventUserNotify', { eventId, userId, notify: notify ? 1 : 0 });
  }

  // ---------- Folgen ----------

  /** Personen, denen der Nutzer folgt */
  async getFollowing(userId: number): Promise<User[]> {
    return (await this.call<any[]>('getFollowers', { followerId: userId })).map(toUser);
  }

  follow(userId: number) {
    return this.call('followUser', { userId });
  }

  unfollow(userId: number) {
    return this.call('unfollowUser', { userId });
  }

  // ---------- Wichteln ----------

  generateSecretSanta(eventId: number) {
    return this.call('generateSecretSanta', { eventId });
  }

  resetSecretSanta(eventId: number) {
    return this.call('resetSecretSanta', { eventId });
  }

  async getMySantaReceiver(eventId: number): Promise<User | null> {
    const r = await this.call<any[]>('getYourSecretSanta', { eventId });
    return r.length ? toUser(r[0]) : null;
  }
}

