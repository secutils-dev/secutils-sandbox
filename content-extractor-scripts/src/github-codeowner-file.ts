import type { WebPageContext } from './types';

export async function run(context: WebPageContext, url: string, teams: string[]): Promise<string> {
  const lines = (await fetch(url).then((response) => response.text())).split('\n') ?? [];

  const rows: Array<Array<string | null | undefined>> = [['Owners', 'Path']];
  for (const line of lines) {
    const [path, owners] = line.split(' ').sort();
    if (owners && teams.some((team) => owners.includes(team))) {
      rows.push([owners, path]);
    }
  }

  const module = await import('markdown-table');
  return module.markdownTable(rows, { align: ['l', 'c'] });
}
