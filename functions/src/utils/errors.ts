export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const notFound = (message = "Requested resource not found") =>
  new AppError(404, "RESOURCE_NOT_FOUND", message);
export const forbidden = (message = "You are not authorized to access this resource") =>
  new AppError(403, "FORBIDDEN", message);
export const conflict = (code: string, message: string) => new AppError(409, code, message);

