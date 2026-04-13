import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_DOMAINS = ['huggingface.co', 'ollama.com'];

function isAllowedDomain(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_DOMAINS.some(
      (d) => parsed.hostname === d || parsed.hostname === `www.${d}`,
    );
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const targetUrl = request.nextUrl.searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json(
      { error: 'Missing "url" query parameter' },
      { status: 400 },
    );
  }

  if (!isAllowedDomain(targetUrl)) {
    return NextResponse.json(
      { error: `Domain not allowed. Supported: ${ALLOWED_DOMAINS.join(', ')}` },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(targetUrl, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${response.status}` },
        { status: 502 },
      );
    }

    const data = await response.json();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'private, max-age=300' },
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to fetch: ${err instanceof Error ? err.message : 'unknown error'}` },
      { status: 502 },
    );
  }
}

export async function POST(request: NextRequest) {
  let body: { url?: string; body?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const targetUrl = body.url;
  if (!targetUrl) {
    return NextResponse.json(
      { error: 'Missing "url" in request body' },
      { status: 400 },
    );
  }

  if (!isAllowedDomain(targetUrl)) {
    return NextResponse.json(
      { error: `Domain not allowed. Supported: ${ALLOWED_DOMAINS.join(', ')}` },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body.body ?? {}),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${response.status}` },
        { status: 502 },
      );
    }

    const data = await response.json();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'private, max-age=300' },
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to fetch: ${err instanceof Error ? err.message : 'unknown error'}` },
      { status: 502 },
    );
  }
}
