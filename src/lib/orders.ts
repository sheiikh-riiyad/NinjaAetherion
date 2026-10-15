export const ORDER_STAGES = ["Requested", "Accepted", "Building", "Review", "Delivered"] as const;
export const ORDER_SERVICES = ["Website", "Redesign", "Bug fix", "Custom project"] as const;
export type OrderStage = typeof ORDER_STAGES[number];
export function clientLevel(completed: number) {
  if (completed >= 5) return { name: "Trusted Partner", next: null, remaining: 0, progress: 100 };
  if (completed >= 2) return { name: "Returning Client", next: "Trusted Partner", remaining: 5 - completed, progress: (completed - 2) / 3 * 100 };
  return { name: "New Client", next: "Returning Client", remaining: 2 - completed, progress: completed / 2 * 100 };
}
export function canAdvanceOrder(from: string, to: string) {
  const index = ORDER_STAGES.indexOf(from as OrderStage);
  return index >= 0 && (to === from || to === ORDER_STAGES[index + 1]);
}
