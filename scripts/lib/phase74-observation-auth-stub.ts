let currentUserId: string | null = null;

export function setPhase74ObservationActor(userId: string | null) {
  currentUserId = userId;
}

export function getPhase74ObservationActor() {
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
