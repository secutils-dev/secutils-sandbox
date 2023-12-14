import type {
  Credentials,
  KibanaMetadata,
  SecurityResponseHeaders,
  SecutilsGetContentSecurityPolicyResponse,
  SecutilsResponderRequest,
} from './index';

interface Meta {
  lastRevisionId: string;
  lastHoneypotTimestamp?: number;
}

const META_REGEX = /\(https:\/\/meta.secutils.dev\/(.+)\)/gm;

const HONEYPOT_SENSITIVE_HEADERS_TO_TRACK = ['cookie', 'authorization'];
const HONEYPOT_HEADERS_TO_TRACK = ['referer', ...HONEYPOT_SENSITIVE_HEADERS_TO_TRACK];

interface Params {
  targetContentTrackerId: string;
  honeypotResponderId: string;
  credentials: Credentials;
  expected: {
    contentSecurityPolicyId: string;
    crossOriginOpenerPolicy: string;
    permissionsPolicy: string;
    referrerPolicy: string;
    strictTransportSecurity: string;
    xContentTypeOptions: string;
    xFrameOptions: string;
  };
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
  const expectedCsp = await getExpectedContentSecurityPolicy(
    params.credentials,
    params.expected.contentSecurityPolicyId,
  );

  const honeypotHeaders = await getHoneypotHeaders(
    params.credentials,
    params.honeypotResponderId,
    previousMeta?.lastHoneypotTimestamp,
  );

  const { injectedMetadata, headers: responseHeaders } = JSON.parse(lastRevision.data) as {
    headers: SecurityResponseHeaders;
    injectedMetadata: KibanaMetadata;
  };
  const state = `
# Project information
|||
| ------ | ----------- |
| **Environment**    | ${injectedMetadata.env.mode.name} |
| **Branch** | ${injectedMetadata.env.packageInfo.branch} |
| **Project ID / Cluster Name** | ${injectedMetadata.clusterInfo?.cluster_name ?? '?'} |
| **Build Flavour** | ${injectedMetadata.env.packageInfo.buildFlavor} |
| **Build Date** | ${injectedMetadata.env.packageInfo.buildDate} |
| **Build Number**    | ${injectedMetadata.env.packageInfo.buildNum} |
| **Build Commit**    | [${injectedMetadata.env.packageInfo.buildSha.slice(
    6,
  )}](https://github.com/elastic/kibana/commit/${injectedMetadata.env.packageInfo.buildSha}) |
| **Version**    | ${injectedMetadata.env.packageInfo.version}|

# Security headers
${renderHeaderContent('Content Security Policy', responseHeaders['content-security-policy'], expectedCsp.policyText)}
[**:mag_right: Inspect**](${location.origin}/ws/web_security__csp__policies?x-user-share-id=${expectedCsp.userShareId})
${renderHeaderContent(
  'Cross Origin Opener Policy',
  responseHeaders['cross-origin-opener-policy'],
  params.expected.crossOriginOpenerPolicy,
)}
${renderHeaderContent('Permissions Policy', responseHeaders['permissions-policy'], params.expected.permissionsPolicy)}
${renderHeaderContent('Referrer Policy', responseHeaders['referrer-policy'], params.expected.referrerPolicy)}
${renderHeaderContent(
  'Strict Transport Security Policy',
  responseHeaders['strict-transport-security'],
  params.expected.strictTransportSecurity,
)}
${renderHeaderContent(
  'Content Type Options',
  responseHeaders['x-content-type-options'],
  params.expected.xContentTypeOptions,
)}
${renderHeaderContent('Frame Options', responseHeaders['x-frame-options'], params.expected.xFrameOptions)}

# Miscellaneous
## Status Page
|||
| ------ | ----------- |
| **${injectedMetadata.anonymousStatusPage ? ':red_circle:' : ':large_green_circle:'} Anonymous** | ${
    injectedMetadata.anonymousStatusPage ? 'Yes' : 'No'
  } |
| **:yellow_circle: Security Plugin Status** | Unknown |

## Honeypot
|||
| ------ | ----------- |
| **${
    HONEYPOT_SENSITIVE_HEADERS_TO_TRACK.some((sensitiveHeaderName) => honeypotHeaders.headers.has(sensitiveHeaderName))
      ? ':red_circle:'
      : ':large_green_circle:'
  } Captured Headers**    | ${[...honeypotHeaders.headers]
    .filter((headerName) => HONEYPOT_HEADERS_TO_TRACK.includes(headerName))
    .join(', ')} |
[**:mag_right: Inspect**](${location.origin}/ws/webhooks__responders)
`;

  return prependMeta(state, {
    lastRevisionId: lastRevision.id,
    lastHoneypotTimestamp: honeypotHeaders.lastHoneypotTimestamp,
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

async function getExpectedContentSecurityPolicy(
  credentials: Credentials,
  contentSecurityPolicyId: string,
): Promise<{ userShareId: string; policyText: string }> {
  const authorizationHeader = `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`;
  // Retrieve policy to get user share ID.
  const getResponse = (await (
    await fetch(`${location.origin}/api/utils/web_security/csp/${contentSecurityPolicyId}`, {
      headers: { Authorization: authorizationHeader, Accept: 'application/json' },
    })
  ).json()) as SecutilsGetContentSecurityPolicyResponse;

  if (!getResponse.userShare) {
    throw new Error(`Could not find user share for policy ${contentSecurityPolicyId}`);
  }

  // Fetch serialized policy
  const serializeResponse = (await (
    await fetch('https://dev.secutils.dev/api/utils/web_security/csp/018c5b81-2908-7583-99e5-0c03fc9f827e/serialize', {
      credentials: 'omit',
      headers: { Authorization: authorizationHeader, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'enforcingHeader' }),
      method: 'POST',
    })
  ).json()) as string;

  return {
    userShareId: getResponse.userShare.id,
    policyText: serializeResponse,
  };
}

function renderHeaderContent(label: string, actualValue: string, expectedValue: string): string {
  return `## ${actualValue === expectedValue ? ':large_green_circle:' : ':red_circle:'} ${label}
\`\`\`
${actualValue === expectedValue ? actualValue : `Expected: ${expectedValue}\nActual:   ${actualValue}`}
\`\`\``;
}

async function getHoneypotHeaders(
  credentials: Credentials,
  honeypotResponderId: string,
  lastHoneypotTimestamp?: number,
): Promise<{ lastHoneypotTimestamp?: number; headers: Set<string> }> {
  const authorizationHeader = `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`;
  // Retrieve policy to get user share ID.
  const responderRequests = (await (
    await fetch(`${location.origin}/api/utils/webhooks/responders/${honeypotResponderId}/history`, {
      method: 'POST',
      headers: { Authorization: authorizationHeader, Accept: 'application/json' },
    })
  ).json()) as SecutilsResponderRequest[];

  if (responderRequests.length === 0) {
    return { headers: new Set() };
  }

  const headers = new Set<string>();
  for (const request of responderRequests) {
    if (lastHoneypotTimestamp && request.createdAt <= lastHoneypotTimestamp) {
      continue;
    }

    request.headers?.forEach(([headerName]) => headers.add(headerName));
  }

  return {
    headers,
    lastHoneypotTimestamp: responderRequests[responderRequests.length - 1].createdAt,
  };
}
