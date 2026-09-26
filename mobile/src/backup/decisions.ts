export function incomingAction(
  local: { cloudRevision: number; pending: boolean } | null,
  remoteRevision: number,
): "ignore" | "restore" | "conflict" {
  if (!local) return "restore";
  if (remoteRevision <= local.cloudRevision) return "ignore";
  return local.pending ? "conflict" : "restore";
}

export function retryDelayMs(attempts: number) {
  return Math.min(60 * 60_000, 30_000 * 2 ** Math.min(attempts, 7));
}
