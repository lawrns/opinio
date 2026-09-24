// DISABLED — Public surfaces are back online
// This file was used to return 410 Gone + maintenance message while data verification was in progress.
// All routes are now restored.

export const config = {
  matcher: ['/disabled'],
};

export function proxy() {
  return new Response('OK', { status: 200 });
}
