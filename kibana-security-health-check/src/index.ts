interface State {
  headers: Record<string, string>;
  resources: {
    external: WebPageResource[];
    internalCount: number;
    internalTotalSize: string;
  };
  injectedMetadata: Record<string, unknown>;
}

interface WebPageResource {
  url: string;
  data: string;
  type: 'script' | 'stylesheet';
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

export async function run(
  previousContent: State | undefined,
  remoteResources: WebPageResource[],
  responseHeaders: Record<string, string>,
): Promise<State> {
  const { externalResources, internalResources } = remoteResources.reduce(
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
      Object.entries(responseHeaders).filter(([key]) => TRACKED_RESPONSE_HEADERS.includes(key.toLowerCase())),
    ),
    resources: {
      external: externalResources,
      internalCount: internalResources.length,
      internalTotalSize: formatBytes(
        internalResources.reduce((sum, res) => sum + res.data.length, 0),
        3,
      ),
    },
    injectedMetadata,
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
