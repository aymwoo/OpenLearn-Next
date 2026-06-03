let currentUserId: string | null = null;

export function setPhase69Actor(userId: string | null) {
  currentUserId = userId;
}

export function getPhase69Actor() {
  return currentUserId;
}

export const auth = async () =>
  currentUserId
    ? { user: { id: currentUserId } }
    : null;

export const handlers = {} as Record<string, unknown>;
export const signIn = async () => undefined;
export const signOut = async () => undefined;
export const authorizeCredentials = async () => null;
