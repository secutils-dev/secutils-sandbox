import type { WebPageContext } from './types';

export async function run(context: WebPageContext): Promise<string> {
  const module = await import('markdown-table');
  return module.markdownTable(
    [
      ['Has previous content?', context.previous ? ':white_check_mark:' : ':x:'],
      ['How many response headers?', Object.keys(context.responseHeaders).length.toString()],
      ['Current time', new Date().toISOString()],
    ],
    { align: ['l', 'c'] },
  );
}
