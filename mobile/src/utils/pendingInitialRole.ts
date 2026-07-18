/**
 * In-memory store for the role the user chose during registration.
 * Consumed once by HomeScreen after the auth flow resolves,
 * to auto-navigate new owners to CreateBarbershopScreen.
 */
let _pendingRole: 'owner' | null = null;

export function setPendingInitialRole(role: 'owner'): void {
  _pendingRole = role;
}

export function consumePendingInitialRole(): 'owner' | null {
  const role = _pendingRole;
  _pendingRole = null;
  return role;
}
