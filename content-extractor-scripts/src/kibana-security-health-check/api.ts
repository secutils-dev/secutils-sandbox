interface Params {
  url: string;
  method: string;
  headers: [string, string][];
  body: string;
}

export async function run(params: Params) {
  const { url, method, headers } = params;

  const body = params.body && typeof params.body === 'string' ? params.body : JSON.stringify(params.body);

  const response = await fetch(url, { method, headers, body });

  const responseBody = await response.json();
  return {
    status: response.status,
    headers: Array.from(response.headers.entries()),
    body: JSON.stringify(responseBody),
  };
}
