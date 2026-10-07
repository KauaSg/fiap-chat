export function buildDirectConversationId(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('_');
}
