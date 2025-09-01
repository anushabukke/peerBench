export class EnvVariableNeededError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "EnvVariableNeededError";
    Error.captureStackTrace(this, this.constructor);
  }
}
