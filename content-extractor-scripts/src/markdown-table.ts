import { markdownTable } from 'markdown-table';

import type { PageContext } from './types';

export async function execute(context: PageContext): Promise<string> {
  return markdownTable(
    [
      ['Has previous content?', context.previousContent ? ':white_check_mark:' : ':x:'],
      ['Params', JSON.stringify(context.params)],
      ['Current time', new Date().toISOString()],
    ],
    { align: ['l', 'c'] },
  );
}
