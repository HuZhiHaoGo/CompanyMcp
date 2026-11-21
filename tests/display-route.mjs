export async function requestDisplay(route, endpoint, args, signal) {
  const response = await route.fetch(new Request(`http://localhost${route.path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ endpoint, args }),
    signal,
  }));
  const mediaType = response.headers.get('content-type');
  if (response.ok && mediaType?.startsWith('image/')) {
    return { ok: true, value: { mediaType, bytes: new Uint8Array(await response.arrayBuffer()) } };
  }
  return response.json();
}
