// Scope cached workspace data independently from component remounts and requests.
export function workspaceActorScope(actor) {
  return actor?.id && actor?.role ? JSON.stringify([actor.id, actor.role, actor.authVersion ?? 0]) : null;
}
export function workspaceDataIsCurrent(loadedScope, actor) {
  const scope = workspaceActorScope(actor);
  return scope !== null && loadedScope === scope;
}
