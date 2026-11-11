export type DiaryEntry = {
  id: string;
  text: string;
  createdAt: number;
};

export type TrustedContact = {
  id: string;
  name: string;
  phone: string;
};

const DIARY = "realmind.diary.v1";
const CONTACTS = "realmind.contacts.v1";

function readList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeList<T>(key: string, value: T[]) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadDiary(): DiaryEntry[] {
  return readList<DiaryEntry>(DIARY)
    .filter((entry) => entry && typeof entry.text === "string" && typeof entry.id === "string")
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function saveDiaryEntry(text: string): DiaryEntry[] {
  const next = [
    { id: crypto.randomUUID(), text, createdAt: Date.now() },
    ...loadDiary(),
  ];
  writeList(DIARY, next);
  return next;
}

export function deleteDiaryEntry(id: string): DiaryEntry[] {
  const next = loadDiary().filter((entry) => entry.id !== id);
  writeList(DIARY, next);
  return next;
}

export function loadContacts(): TrustedContact[] {
  return readList<TrustedContact>(CONTACTS).filter(
    (contact) =>
      contact &&
      typeof contact.id === "string" &&
      typeof contact.name === "string" &&
      typeof contact.phone === "string",
  );
}

export function saveContact(name: string, phone: string): TrustedContact[] {
  const next = [...loadContacts(), { id: crypto.randomUUID(), name, phone }];
  writeList(CONTACTS, next);
  return next;
}

export function deleteContact(id: string): TrustedContact[] {
  const next = loadContacts().filter((contact) => contact.id !== id);
  writeList(CONTACTS, next);
  return next;
}

export function telHref(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, "");
  return `tel:${cleaned}`;
}
