import type { WebPageContext } from './types';

export async function run(context: WebPageContext, owner: string, repo: string, teams: string[]): Promise<string> {
  const codeOwnersUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/CODEOWNERS`;
  const lines = (await fetch(codeOwnersUrl).then((response) => response.text())).split('\n') ?? [];

  const getCommitLink = async (path: string) => {
    try {
      const commits = (await fetch(
        `https://api.github.com/repos/${owner}/${repo}/commits?path=${encodeURIComponent(path)}&per_page=1`,
      ).then((response) => response.json())) as Array<{ html_url: string; commit: { author: { date: string } } }>;
      if (commits.length === 0) {
        return 'N/A (no commits found)';
      }
      return `[${commits[0].commit.author.date}](${commits[0].html_url})`;
    } catch {
      return 'N/A (error fetching commit)';
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
