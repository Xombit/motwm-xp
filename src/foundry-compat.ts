export function getFoundryProperty<T = unknown>(object: unknown, path: string): T | undefined {
  const getter = foundry?.utils?.getProperty;
  if (typeof getter === "function") {
    return getter(object, path) as T | undefined;
  }

  if (!object || !path) return undefined;

  let current: any = object;
  for (const segment of path.split(".")) {
    if (current == null) return undefined;
    current = current[segment];
  }

  return current as T | undefined;
}

export function getFoundryVersion(): string {
  return String((game as any)?.release?.version ?? (game as any)?.version ?? (game as any)?.data?.version ?? "0.0.0");
}

export function getFoundryMajorVersion(): number {
  const generation = Number((game as any)?.release?.generation ?? 0);
  if (generation > 0) return generation;
  const match = getFoundryVersion().match(/\d+/);
  return Number(match?.[0] ?? 0);
}

export function getApplicationElement(source: unknown): HTMLElement | null {
  const element = (source as any)?.element ?? source;
  if (!element) return null;
  if (element instanceof HTMLElement) return element;
  if (element[0] instanceof HTMLElement) return element[0];
  return null;
}

export function collectionToArray<T>(value: unknown): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (value instanceof Set || value instanceof Map) return Array.from(value.values()) as T[];
  if (typeof (value as any)[Symbol.iterator] === "function") {
    try {
      return Array.from(value as Iterable<T>);
    } catch {
      return [];
    }
  }
  if (typeof (value as any).values === "function") {
    try {
      return Array.from((value as any).values()) as T[];
    } catch {
      return [];
    }
  }
  return [];
}

export function getControlledTokens<T = any>(): T[] {
  return collectionToArray<T>(canvas?.tokens?.controlled ?? canvas?.primary?.controlled ?? canvas?.activeLayer?.controlled);
}

export function getUserTargets<T = any>(): T[] {
  return collectionToArray<T>(game.user?.targets);
}

export function getTokenDocument(token: any): any {
  return token?.document ?? token ?? null;
}

export function getTokenActor<T = Actor>(token: any): T | null {
  return (token?.actor ?? token?.document?.actor ?? null) as T | null;
}

export function getTokenDisposition(token: any): number | null {
  const document = getTokenDocument(token);
  const disposition = document?.disposition;
  return Number.isFinite(disposition) ? Number(disposition) : null;
}

export function getTokenId(token: any): string | null {
  return String(token?.id ?? token?.document?.id ?? token?.document?._id ?? "") || null;
}

export function getActorImage(actor: any, fallback = "icons/svg/mystery-man.svg"): string {
  return actor?.img ?? actor?.prototypeToken?.texture?.src ?? fallback;
}

export async function createChatMessage(content: string, rollMode = "publicroll"): Promise<string | null> {
  const message = await (ChatMessage as any)?.create?.({ content, rollMode });
  return message?.id ?? null;
}