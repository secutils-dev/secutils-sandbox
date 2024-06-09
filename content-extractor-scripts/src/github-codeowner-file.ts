import type { Endpoints } from '@octokit/types';

import type { WebPageContext } from './types';

export async function run(
  context: WebPageContext,
  owner: string,
  repo: string,
  teams: string[],
  apiToken?: string,
): Promise<string> {
  const codeOwnersUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/.github/CODEOWNERS`;
  const lines = (await fetch(codeOwnersUrl).then((response) => response.text())).split('\n') ?? [];

  // Use API token if provided to avoid rate limiting (GitHub allows only 60 API requests per hour without token)
  // https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api?apiVersion=2022-11-28.
  const headers: Record<string, string> = apiToken
    ? { Authorization: `Bearer ${apiToken}`, 'X-GitHub-Api-Version': '2022-11-28' }
    : { 'X-GitHub-Api-Version': '2022-11-28' };

  const getCommitLink = async (path: string) => {
    try {
      const commits = (await fetch(
        `https://api.github.com/repos/${owner}/${repo}/commits?path=${encodeURIComponent(path)}&per_page=1`,
        { headers },
      ).then((response) => response.json())) as Endpoints['GET /repos/{owner}/{repo}/commits']['response']['data'];
      if (commits.length === 0) {
        return 'N/A (no commits found)';
      }
      const topCommit = commits[0];
      const commitLabel =
        topCommit.commit.author?.name && topCommit.commit.author?.date
          ? `${topCommit.commit.author.name} on ${topCommit.commit.author.date}`
          : topCommit.sha.slice(6);
      return `[${commitLabel}](${topCommit.html_url})`;
    } catch (err) {
      return `N/A (${(err as Error).message ?? 'unknown error'})`;
    }
  };

  const rows: Array<Array<string | null | undefined>> = [['Owners', 'Path', 'Last commit']];
  for (const line of lines) {
    const [path, owners] = line.split(' ').sort();
    if (owners && teams.some((team) => owners.includes(team))) {
      rows.push([owners, path, await getCommitLink(path)]);
    }
  }

  const module = await import('markdown-table');
  return module.markdownTable(rows, { align: ['l', 'c'] });
}
