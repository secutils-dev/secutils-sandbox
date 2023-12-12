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

  const meta: Meta = {
    lastRevisionId: revisions.length > 0 ? revisions[revisions.length - 1].id : '',
  };

  const state = `## Dashboard
* Content Security Policy: ${meta.lastRevisionId === previousMeta?.lastRevisionId ? '✅' : '⚠'} ([view](${
    location.origin
  }/ws/web_security__csp__policies?x-user-share-id=${params.targetCspShareId}))
`;

  return prependMeta(state, meta);
}

// HACK: Prepend the meta to the markdown content as part of the link to not clutter the markdown.
// NOTE: There should be a built-in way to specify metadata and user-facing content separately.
function prependMeta(markdownState: string, meta: Meta): string {
  return `[META](https://meta.secutils.dev/${encodeURIComponent(JSON.stringify(meta))})${markdownState}`;
}

function extractMeta(markdownState: string): Meta {
  return JSON.parse(decodeURIComponent(Array.from(markdownState.matchAll(META_REGEX))[0][1])) as Meta;
}
