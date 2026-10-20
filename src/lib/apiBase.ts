// Browser-facing API URL. Inlined into the client bundle at build time.
export const TRACECART_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// For server-side calls only (route handlers, server components). Read at
// runtime, so a container can reach the API over the private network
// (e.g. http://api:4000) instead of looping out through the public hostname.
export const SERVER_API_URL = process.env.API_INTERNAL_URL || TRACECART_API_URL;
