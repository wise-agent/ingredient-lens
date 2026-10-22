import dictionary from '@/data/additives.json';

/** Versioned, read-only official-reference content; access remains the Site's existing private policy. */
export async function GET() {
  return Response.json(dictionary, { headers: { 'Cache-Control': 'private, max-age=300', 'X-Content-Type-Options': 'nosniff' } });
}
