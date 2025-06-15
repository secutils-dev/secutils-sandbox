export interface WebPageContext<T = unknown> {
  previous?: T;
  responseHeaders: Record<string, string>;
  externalResources: WebPageResource[];
}

export interface PageContext<TValue = unknown> {
  params?: unknown;
  tags: string[];
  previousContent?: TrackerDataValue<TValue>;
}

export interface TrackerDataValue<TValue> {
  original: TValue;
}

export interface WebPageResource {
  url: string;
  data: string;
  type: 'script' | 'stylesheet';
}
