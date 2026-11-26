/** Error shape shared by the mock and a future HTTP client. */
export class ApiError extends Error {
  constructor(status, message, fieldErrors = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

export const notFound = (what) => new ApiError(404, `${what} was not found.`)
export const invalid = (fieldErrors) => new ApiError(422, 'Please check the highlighted fields.', fieldErrors)
export const forbidden = (message) => new ApiError(403, message)
