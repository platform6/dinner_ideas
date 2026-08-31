// Typed failure taxonomy for the claude-proxy pipeline. (intent 007, bolt 038)
// error_code values recorded in ai_usage_log.error_code and returned in the ProxyError body.

export type ErrorCode =
  'no_household' | 'no_api_key' | 'rate_limited' | 'bad_request' | 'upstream_error' | 'timeout';

export class ProxyFailure extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly httpStatus: number,
  ) {
    super(message);
    this.name = 'ProxyFailure';
  }
}
