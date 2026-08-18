import { del, get, set } from "idb-keyval";

const prefix = "bodyfitness-photo:";

export async function savePhoto(id: string, blob: Blob) {
  await set(`${prefix}${id}`, blob);
}

export async function loadPhoto(id: string) {
  return get<Blob>(`${prefix}${id}`);
}

export async function deletePhoto(id: string) {
  await del(`${prefix}${id}`);
}
