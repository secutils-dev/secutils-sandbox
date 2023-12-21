export interface WebPageContext<T = unknown> {
  previous?: T;
  responseHeaders: Record<string, string>;
  externalResources: WebPageResource[];
}

export interface WebPageResource {
  url: string;
  data: string;
  type: 'script' | 'stylesheet';
}
