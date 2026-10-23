export class XpsError extends Error {
  readonly code: string;
  readonly stage: string;
  override readonly cause: unknown;

  constructor(code: string, stage: string, message: string, cause?: unknown) {
    super(message);
    this.name = 'XpsError';
    this.code = code;
    this.stage = stage;
    this.cause = cause;
  }
}

export function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  return new Error(typeof value === 'string' ? value : 'Unknown error');
}
