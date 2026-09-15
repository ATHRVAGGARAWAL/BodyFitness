/**
 * Reconciles the server copy of the app state with what is on this device when a
 * user signs in. Scalars and settings take the server value; id-keyed collections
 * are unioned so nothing logged on either side is lost.
 */

type Plain = Record<string, unknown>;

const ID_COLLECTIONS = ["meals", "setLogs", "sessions", "weightEntries", "physiqueWeeks", "habits"] as const;
const KEYED_MAPS = ["dailyByDate"] as const;
const STRING_SETS = ["flexDays"] as const;
/** Never synced: device-specific or transient. */
export const LOCAL_ONLY_KEYS = ["hydrated", "restTimer", "activeSessionId", "account"] as const;

function isPlain(value: unknown): value is Plain {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function unionById(server: unknown, local: unknown): unknown[] {
  const out = new Map<string, unknown>();
  for (const source of [local, server]) {
    if (!Array.isArray(source)) continue;
    for (const item of source) {
      const id = isPlain(item) && typeof item.id === "string" ? item.id : JSON.stringify(item);
      out.set(id, item); // server iterated last, so it wins on the same id
    }
  }
  return [...out.values()];
}

export function mergeStates(server: Plain, local: Plain): Plain {
  const merged: Plain = { ...local, ...server };
  for (const key of ID_COLLECTIONS) {
    if (key in server || key in local) merged[key] = unionById(server[key], local[key]);
  }
  for (const key of KEYED_MAPS) {
    const s = isPlain(server[key]) ? server[key] : {};
    const l = isPlain(local[key]) ? local[key] : {};
    merged[key] = { ...l, ...s };
  }
  for (const key of STRING_SETS) {
    const s = Array.isArray(server[key]) ? server[key] : [];
    const l = Array.isArray(local[key]) ? local[key] : [];
    merged[key] = [...new Set([...l, ...s].filter((v): v is string => typeof v === "string"))];
  }
  for (const key of LOCAL_ONLY_KEYS) {
    if (key in local) merged[key] = local[key];
    else delete merged[key];
  }
  return merged;
}

/** Strips functions and device-only keys before upload. */
export function serializableState(state: Plain): Plain {
  const out: Plain = {};
  for (const [key, value] of Object.entries(state)) {
    if (typeof value === "function") continue;
    if ((LOCAL_ONLY_KEYS as readonly string[]).includes(key)) continue;
    out[key] = value;
  }
  return out;
}

/** Sorts newest-first collections after a union so UI ordering stays stable. */
export function normalizeOrder(state: Plain): Plain {
  const byDesc = (key: string, field: string) => {
    const arr = state[key];
    if (Array.isArray(arr)) {
      state[key] = [...arr].sort((a, b) => String((b as Plain)[field] ?? "").localeCompare(String((a as Plain)[field] ?? "")));
    }
  };
  byDesc("meals", "loggedAt");
  byDesc("setLogs", "completedAt");
  byDesc("sessions", "startedAt");
  byDesc("weightEntries", "date");
  byDesc("physiqueWeeks", "date");
  return state;
}
