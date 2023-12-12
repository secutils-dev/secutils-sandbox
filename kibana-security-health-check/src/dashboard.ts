import type { KibanaMetadata } from './index';

interface Meta {
  lastRevisionId: string;
}

const META_REGEX = /\(https:\/\/meta.secutils.dev\/(.+)\)/gm;

interface Params {
  targetContentTrackerId: string;
  targetCspShareId: string;
  credentials: { username: string; password: string };
}

interface WebPageContentRevision {
  id: string;
  data: string;
  createdAt: number;
}

export async function run(previousContent: string | undefined, params: Params): Promise<string> {
  const previousMeta = previousContent ? extractMeta(previousContent) : undefined;

  // Fetch tracker history.
  const revisions = (await (
    await fetch(`${location.origin}/api/utils/web_scraping/content/${params.targetContentTrackerId}/history`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${params.credentials.username}:${params.credentials.password}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh: false, calculateDiff: false }),
    })
  ).json()) as WebPageContentRevision[];

  if (revisions.length === 0) {
    return prependMeta(`:red_circle: Data is not available`, { lastRevisionId: '' });
  }

  const lastRevision = revisions[revisions.length - 1];
  const kibanaMetadata = (JSON.parse(lastRevision.data) as { injectedMetadata: KibanaMetadata }).injectedMetadata;
  const state = `
# Project information
|||
| ------ | ----------- |
| **Environment**    | ${kibanaMetadata.env.mode.name} |
| **Branch** | ${kibanaMetadata.env.packageInfo.branch} |
| **Project ID / Cluster Name** | ${kibanaMetadata.clusterInfo?.cluster_name ?? '?'} |
| **Build Flavour** | ${kibanaMetadata.env.packageInfo.buildFlavor} |
| **Build Date** | ${kibanaMetadata.env.packageInfo.buildDate} |
| **Build Number**    | ${kibanaMetadata.env.packageInfo.buildNum} |
| **Build Commit**    | [${kibanaMetadata.env.packageInfo.buildSha.slice(
    6,
  )}](https://github.com/elastic/kibana/commit/${kibanaMetadata.env.packageInfo.buildSha}) |
| **Version**    | ${kibanaMetadata.env.packageInfo.version}|

# Security headers
## Content Security Policy
Status: ${
    lastRevision.id === previousMeta?.lastRevisionId || !previousMeta ? ':white_check_mark:' : ':red_circle:'
  } [view policy](${location.origin}/ws/web_security__csp__policies?x-user-share-id=${params.targetCspShareId})
`;

  return prependMeta(state, {
    lastRevisionId: lastRevision.id,
  });
}

// HACK: Prepend the meta to the markdown content as part of the link to not clutter the markdown.
// NOTE: There should be a built-in way to specify metadata and user-facing content separately.
function prependMeta(markdownState: string, meta: Meta): string {
  return `[:information_source:️️](https://meta.secutils.dev/${encodeURIComponent(
    JSON.stringify(meta),
  )})${markdownState}`;
}

function extractMeta(markdownState: string): Meta {
  return JSON.parse(decodeURIComponent(Array.from(markdownState.matchAll(META_REGEX))[0][1])) as Meta;
}
