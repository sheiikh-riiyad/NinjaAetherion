export const PRESENCE_EXPIRY_MS = 90_000;
export type PresenceSession = { uid: string; admin: boolean; online: boolean; lastActiveAt: number };

export function presenceStatus(sessions: PresenceSession[], now: number) {
  const valid = sessions.filter(session => Number.isFinite(session.lastActiveAt) && session.lastActiveAt > 0);
  const lastActiveAt = valid.reduce((latest, session) => Math.max(latest, session.lastActiveAt), 0);
  const active = valid.some(session => session.online && now - session.lastActiveAt < PRESENCE_EXPIRY_MS);
  if (active) return { active, lastActiveAt, label: "Active now" };
  if (!lastActiveAt) return { active: false, lastActiveAt: 0, label: "Activity unavailable" };
  const minutes = Math.floor(Math.max(0, now - lastActiveAt) / 60_000);
  const label = minutes < 1 ? "Active just now" : minutes < 60 ? `Active ${minutes}m ago` : minutes < 1440 ? `Active ${Math.floor(minutes / 60)}h ago` : `Active ${Math.floor(minutes / 1440)}d ago`;
  return { active: false, lastActiveAt, label };
}
