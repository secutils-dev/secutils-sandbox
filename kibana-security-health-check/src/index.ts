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

export interface KibanaMetadata {
  anonymousStatusPage: boolean;
  clusterInfo: {
    cluster_build_flavor: 'serverless';
    cluster_name: 'b5781f679cf342218a5fb77db34863d2';
    cluster_uuid: '8s9cUhNXR4Wa9oUu_czSPw';
    cluster_version: '8.11.0';
  };
  env: {
    mode: {
      name: string;
    };
    packageInfo: {
      branch: string;
      buildDate: string;
      buildFlavor: string;
      buildNum: number;
      buildSha: string;
      version: string;
    };
  };
}
