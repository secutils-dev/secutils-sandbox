interface FetchApiParams {
  url: string;
  method?: string;
  headers?: HeadersInit;
  body?: BodyInit;
}

interface FetchApiResult {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export async function run({ url, method = 'GET', headers, body }: FetchApiParams): Promise<FetchApiResult> {
  const response = await fetch(url, { method, headers, body });
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: (await response.text()) ?? '',
  };
}
