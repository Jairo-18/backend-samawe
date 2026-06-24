export class FactusApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly responseData: unknown,
    message: string,
  ) {
    super(message);
    this.name = 'FactusApiError';
  }
}
