const KEY = "multi_sessions"; // { [email]: { access_token, refresh_token } }

type StoredSession = { access_token: string; refresh_token: string };

export function saveSessionForEmail(email: string, session: StoredSession) {
  const all = getAllSessions();
  all[email] = session;
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function getAllSessions(): Record<string, StoredSession> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export function getSessionForEmail(email: string): StoredSession | null {
  return getAllSessions()[email] ?? null;
}

export function removeSessionForEmail(email: string) {
  const all = getAllSessions();
  delete all[email];
  localStorage.setItem(KEY, JSON.stringify(all));
}
