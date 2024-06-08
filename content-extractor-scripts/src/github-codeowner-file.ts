import type { WebPageContext } from './types';

export async function run(context: WebPageContext, teams: string[]): Promise<string> {
  const lines = document.querySelector('pre')?.textContent?.split('\n') ?? [];

  const rows: Array<Array<string | null | undefined>> = [['Owner', 'Path']];
  for (const line of lines) {
    const [path, owners] = line.split(' ');
    if (teams.some((team) => owners.includes(team))) {
      rows.push([owners, path]);
    }
  }

  const module = await import('markdown-table');
  return module.markdownTable(rows, { align: ['l', 'c'] });
}
