export type ConnectedPerson = { uid: string; name: string; workTitle: string; workDescription: string; workUrl: string };
export type PeerThread = { id: string; members: string[]; names: string[] };

export function peerChatId(first: string, second: string) {
  const [a, b] = [first, second].sort();
  return `${a.length}_${a}_${b}`;
}

export function publicWorkUrl(value: string) {
  if (!value) return "";
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.href : ""; }
  catch { return ""; }
}
