/**
 * Domain errors. Each carries a stable `code` safe to return to clients;
 * messages must never include secrets or another tenant's data.
 */
export type DomainErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_FAILED"
  | "ILLEGAL_TRANSITION"
  | "GUARD_FAILED"
  | "CONFLICT"
  | "INTEGRATION_NOT_CONFIGURED"
  | "INTEGRATION_ERROR"
  | "SIGNATURE_INVALID";

export class DomainError extends Error {
  constructor(
    readonly code: DomainErrorCode,
    message: string,
    readonly details?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export const unauthenticated = (msg = "Authentication required") => new DomainError("UNAUTHENTICATED", msg);
export const forbidden = (msg = "You do not have permission to perform this action", details?: Record<string, unknown>) =>
  new DomainError("FORBIDDEN", msg, details);
export const notFound = (resource: string) => new DomainError("NOT_FOUND", `${resource} not found`);
export const validationFailed = (msg: string, details?: Record<string, unknown>) =>
  new DomainError("VALIDATION_FAILED", msg, details);
export const conflict = (msg: string, details?: Record<string, unknown>) => new DomainError("CONFLICT", msg, details);

export function isDomainError(err: unknown): err is DomainError {
  return err instanceof DomainError;
}
