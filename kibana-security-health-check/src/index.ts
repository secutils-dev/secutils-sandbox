export { run as dashboardRun } from './dashboard';
export { run as trackerRun } from './tracker';

export interface WebPageResource {
  url: string;
  data: string;
  type: 'script' | 'stylesheet';
}

export interface SecurityResponseHeaders {
  'content-security-policy': string;
  'cross-origin-opener-policy': string;
  'permissions-policy': string;
  'referrer-policy': string;
  'strict-transport-security': string;
  'x-content-type-options': string;
  'x-found-handling-cluster': string;
  'x-frame-options': string;
}
