export function getTimestamp(): string {
  const now = new Date();

  const parts = {
    yy: now.getFullYear().toString().slice(-2),
    mm: (now.getMonth() + 1).toString().padStart(2, "0"),
    dd: now.getDate().toString().padStart(2, "0"),
    hh: now.getHours().toString().padStart(2, "0"),
    min: now.getMinutes().toString().padStart(2, "0"),
    ss: now.getSeconds().toString().padStart(2, "0"),
  };
  return `${parts.yy}${parts.mm}${parts.dd}${parts.hh}${parts.min}${parts.ss}`;
}

export function getId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export interface RuntimeResult<T> {
  result: T;
  duration: number;
}

export async function measureRuntime<Args extends any[], Return>(
  fn: (...args: Args) => Promise<Return>,
  ...args: Args
): Promise<RuntimeResult<Return>> {
  const start = performance.now();

  const result = await fn(...args);

  const duration = performance.now() - start;

  return { result: result, duration: duration } as RuntimeResult<Return>;
}

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
