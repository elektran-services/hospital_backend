export interface HttpError extends Error {
  status?: number;
}

export function createHttpError(message: string, status: number): HttpError {
  const error = new Error(message) as HttpError;
  error.status = status;
  return error;
}

export function getErrorStatus(error: unknown, fallback = 400): number {
  if (typeof error === "object" && error !== null && "status" in error) {
    const { status } = error as { status?: unknown };
    if (typeof status === "number") {
      return status;
    }
  }
  return fallback;
}
