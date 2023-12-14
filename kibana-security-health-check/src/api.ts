interface MetricsObject {
  payload: Response;
}

export function run() {
  // placeholder to use previousContent in the future
  // previousContent: string | undefined
  //   const previousMeta = previousContent || undefined;

  document.addEventListener('DOMContentLoaded', () => {
    const windowFetch = window.fetch;
    const metricsObject = {} as MetricsObject;

    // Override Fetch
    window.fetch = async function (resource, init) {
      const response = await windowFetch(resource, init);
      console.log('Fetch call to URL:', resource, 'Status:', response.status);

      // Clone the response so that it's still usable after reading
      const clonedResponse = response.clone();

      metricsObject.payload = clonedResponse;
      return response;
    };

    return metricsObject;
  });
}
