function isLikelyJson(response) {
  const contentType = response.headers?.get?.('content-type') || '';
  return contentType.toLowerCase().includes('application/json');
}

export async function fetchJsonWithFallback(paths, { fetchImpl = fetch } = {}) {
  const failures = [];

  for (const path of paths) {
    try {
      const response = await fetchImpl(path);

      if (!response.ok) {
        failures.push(`${path}: ${response.status} ${response.statusText}`.trim());
        continue;
      }

      if (!isLikelyJson(response)) {
        failures.push(`${path}: non-JSON response`);
        continue;
      }

      return await response.json();
    } catch (error) {
      failures.push(`${path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(`Failed to load JSON from fallback paths: ${failures.join('; ')}`);
}
