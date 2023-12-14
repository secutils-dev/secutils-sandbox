interface Params {}

interface MetricsObject {
  payload: any;
  meta: any;
}
export async function run(previousContent: string | undefined, params: Params) {
  document.addEventListener('DOMContentLoaded', () => {
    const windowFetch = window.fetch;
    const metricsObject = {} as MetricsObject;

    // Override Fetch
    window.fetch = async function (resource, init) {
      const response = await windowFetch.apply(this, arguments);
      console.log('Fetch call to URL:', resource, 'Status:', response.status);

      // Clone the response so that it's still usable after reading
      const clonedResponse = response.clone();

      metricsObject.payload = clonedResponse;
      return response;
    };

    return metricsObject;
  });
}
