import type { SecurityResponseHeaders } from './index';
import type { WebPageContext, WebPageResource } from '../types';

interface State {
  headers: SecurityResponseHeaders;
  resources: {
    external: ExternalWebPageResource[];
    internalCount: number;
    internalTotalSize: string;
  };
  injectedMetadata: Record<string, unknown>;
}

interface ExternalWebPageResource extends Omit<WebPageResource, 'data'> {
  size: string;
}

const TRACKED_RESPONSE_HEADERS = [
  'content-security-policy',
  'cross-origin-opener-policy',
  'permissions-policy',
  'referrer-policy',
  'strict-transport-security',
  'x-content-type-options',
  'x-found-handling-cluster',
  'x-frame-options',
];

const TRACKED_INJECTED_METADATA = ['anonymousStatusPage', 'clusterInfo', 'csp', 'env', 'externalUrl'];

export async function run(context: WebPageContext<State>): Promise<State> {
  const { externalResources, internalResources } = context.externalResources.reduce(
    (acc, resource) => {
      if (resource.url.startsWith(location.origin)) {
        acc.internalResources.push(resource);
      } else {
        acc.externalResources.push(resource);
      }
      return acc;
    },
    { externalResources: [] as WebPageResource[], internalResources: [] as WebPageResource[] },
  );

  // Fetch the content of the page.
  const dom = new DOMParser().parseFromString(await (await fetch(location.href)).text(), 'text/html');
  const injectedMetadata = JSON.parse(
    dom.querySelector('kbn-injected-metadata')?.getAttribute('data') ?? '{}',
  ) as Record<string, unknown>;

  return {
    headers: Object.fromEntries(
      Object.entries(context.responseHeaders).filter(([key]) => TRACKED_RESPONSE_HEADERS.includes(key.toLowerCase())),
    ) as unknown as SecurityResponseHeaders,
    resources: {
      external: externalResources.map((resource) => ({
        url: resource.url,
        type: resource.type,
        size: formatBytes(resource.data.length, 3),
      })),
      internalCount: internalResources.length,
      internalTotalSize: formatBytes(
        internalResources.reduce((sum, res) => sum + res.data.length, 0),
        3,
      ),
    },
    injectedMetadata: Object.fromEntries(
      Object.entries(injectedMetadata).filter(([key]) => TRACKED_INJECTED_METADATA.includes(key)),
    ),
  };
}
function formatBytes(bytes: number, decimals: number) {
  if (bytes == 0) {
    return '0 Bytes';
  }

  const k = 1024,
    dm = decimals || 2,
    sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
    i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
