/**
 * Datenmodelle der App. Die API liefert Zahlen aus MySQL teils als Strings,
 * deshalb läuft alles über die to*-Mapper.
 */

export enum ListType {
  Private = 0,
  SecretSanta = 1,
  Public = 2,
  Shared = 3,
}

/** Rechte innerhalb einer Liste (eventUser.power) */
export const Power = {
  Follower: 0,
  Member: 50,
  Owner: 100,
} as const;

export interface User {
  userId: number;
  email?: string;
  firstName: string;
  lastName: string;
  uniqueUserId: string;
  power: number;
  imgUrl: string | null;
  imgUrlSmall: string | null;
  loginToken?: string;
}

export interface Wish {
  wishId: number;
  userId: number;
  title: string;
  description: string;
  url: string;
  wishImgUrl: string | null;
  date: string;
  archived: boolean;
  /** Nur bei Ansichten mit Reservierungsinfo gesetzt (0..1, 1 = vollständig) */
  totalClaimed: number | null;
  /** Anteil, den der eingeloggte Nutzer reserviert hat */
  claimedByUser: number;
}

export interface WishList {
  eventId: number;
  eventTitle: string;
  eventCode: string;
  eventType: ListType;
  eventDescription: string;
  deadline: string | null;
  date: string;
  santaGenerated: boolean;
  archived: boolean;
}

/** Ein Mitglied einer Liste: Nutzer plus Rolle */
export interface Member extends User {
  eventId: number;
  power: number;
  notify: boolean;
}

/** Eine Liste mit Mitgliedern (z. B. für gefolgte Listen) */
export interface ListWithMembers extends WishList {
  members: Member[];
}

const num = (v: unknown, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const str = (v: unknown): string => (v == null ? '' : String(v));
const strOrNull = (v: unknown): string | null => (v == null || v === '' ? null : String(v));

export function toUser(r: any): User {
  return {
    userId: num(r.userId, -1),
    email: r.email ?? undefined,
    firstName: str(r.firstName),
    lastName: str(r.lastName),
    uniqueUserId: str(r.uniqueUserId),
    power: num(r.power),
    imgUrl: strOrNull(r.imgUrl),
    imgUrlSmall: strOrNull(r.imgUrlSmall),
    loginToken: r.loginToken ?? undefined,
  };
}

export function toWish(r: any): Wish {
  return {
    wishId: num(r.wishId, -1),
    userId: num(r.userId, -1),
    title: str(r.title),
    description: str(r.description),
    url: str(r.url),
    wishImgUrl: strOrNull(r.wishImgUrl),
    date: str(r.date),
    archived: num(r.archived) > 0,
    totalClaimed: r.totalClaimed == null ? null : num(r.totalClaimed),
    claimedByUser: num(r.claimedByUser),
  };
}

export function toList(r: any): WishList {
  return {
    eventId: num(r.eventId, -1),
    eventTitle: str(r.eventTitle),
    eventCode: str(r.eventCode),
    eventType: num(r.eventType) as ListType,
    eventDescription: str(r.eventDescription),
    deadline: strOrNull(r.deadline),
    date: str(r.date),
    santaGenerated: num(r.santaGenerated) > 0,
    archived: num(r.archived) > 0,
  };
}

export function toMember(r: any): Member {
  return {
    ...toUser(r),
    eventId: num(r.eventId, -1),
    power: num(r.power),
    notify: num(r.notify) > 0,
  };
}

export function fullName(u: Pick<User, 'firstName' | 'lastName'> | null | undefined): string {
  if (!u) return '';
  return `${u.firstName} ${u.lastName}`.trim();
}

export function initials(u: Pick<User, 'firstName' | 'lastName'> | null | undefined): string {
  if (!u) return '?';
  return ((u.firstName?.[0] ?? '') + (u.lastName?.[0] ?? '')).toUpperCase() || '?';
}

export function isFullyClaimed(w: Wish): boolean {
  return (w.totalClaimed ?? 0) >= 1;
}

export function shortUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url.length > 30 ? url.slice(0, 30) + '…' : url;
  }
}

export function emptyWish(): Wish {
  return {
    wishId: -1,
    userId: -1,
    title: '',
    description: '',
    url: '',
    wishImgUrl: null,
    date: '',
    archived: false,
    totalClaimed: null,
    claimedByUser: 0,
  };
}

export function emptyList(): WishList {
  return {
    eventId: -1,
    eventTitle: '',
    eventCode: '',
    eventType: ListType.Private,
    eventDescription: '',
    deadline: null,
    date: '',
    santaGenerated: false,
    archived: false,
  };
}
