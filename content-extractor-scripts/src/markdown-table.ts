import { markdownTable } from 'markdown-table';
import type { Page } from 'playwright-core';

import type { PageContext } from './types';

export async function execute(page: Page, context: PageContext): Promise<string> {
  return markdownTable(
    [
      ['Page title', await page.title()],
      ['Has previous content?', context.previousContent ? ':white_check_mark:' : ':x:'],
      ['Params', JSON.stringify(context.params)],
      ['Tags', JSON.stringify(context.tags)],
      ['Current time', new Date().toISOString()],
    ],
    { align: ['l', 'c'] },
  );
}
