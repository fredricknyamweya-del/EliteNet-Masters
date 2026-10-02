const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="16" fill="#0D1B2A"/>
  <path d="M14 38 32 16 50 38" fill="none" stroke="#10B981" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M20 42h24" stroke="#E2E8F0" stroke-width="4" stroke-linecap="round"/>
  <circle cx="32" cy="24" r="4" fill="#22D3EE"/>
</svg>`;

export function GET() {
  return new Response(favicon, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}