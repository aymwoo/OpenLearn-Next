export function updateTag(_tag: string) {
  return undefined;
}

export function revalidateTag(_tag: string, _profile?: string | { expire?: number }) {
  return undefined;
}

export function cacheTag(..._tags: string[]) {
  return undefined;
}

export function cacheLife(_profile: string | { expire?: number; stale?: number; revalidate?: number }) {
  return undefined;
}
