/**
 * Best-effort Instagram-Metadaten-Scraper.
 *
 * Static-Site-Realität: wir können Instagram nicht direkt fetchen (CORS + Anti-Bot).
 * Wir gehen über öffentliche CORS-Proxies und parsen `og:*` + `twitter:*` Meta-Tags
 * + eingebetteten JSON-Blobs aus dem HTML.
 *
 * Location-Daten sind in Instagrams öffentlichen Pages inzwischen rausgestrippt,
 * also bleibt der Ort meistens leer → POI landet in der Inbox.
 *
 * Proxies sind externe Dienste und können jederzeit kaputtgehen oder ratelimiten.
 * Fallback ist immer ein detaillierter Fehler für den Caller.
 */

export interface IgMetadata {
  image?: string;
  title?: string;
  description?: string;
  author?: string;
}

export interface IgFetchResult {
  ok: boolean;
  meta?: IgMetadata;
  error?: string;
  proxyTried?: string[];
}

const PROXIES = [
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url)}`,
];

const TIMEOUT_MS = 8000;

function pickMeta(html: string, properties: string[]): string | undefined {
  for (const property of properties) {
    const patterns = [
      new RegExp(
        `<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["']`,
        'i',
      ),
      new RegExp(
        `<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${property}["']`,
        'i',
      ),
      new RegExp(
        `<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']+)["']`,
        'i',
      ),
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m?.[1]) return decodeHtmlEntities(m[1]);
    }
  }
  return undefined;
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)));
}

/** Cleans up Instagram's over-zealous titles like "User on Instagram: 'caption'". */
function cleanTitle(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let t = raw
    .replace(/\s+on Instagram:.*$/s, '')
    .replace(/\s+on Instagram\s*$/, '')
    .trim();
  if (t.length > 120) t = `${t.slice(0, 117)}…`;
  return t || undefined;
}

function cleanAuthor(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const m = raw.match(/^(.*?)\s+on Instagram/);
  return m?.[1]?.trim() || raw.trim() || undefined;
}

export function isInstagramUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return /(^|\.)instagram\.com$/.test(u.hostname);
  } catch {
    return false;
  }
}

function parseHtml(html: string): IgMetadata {
  const image = pickMeta(html, [
    'og:image:secure_url',
    'og:image',
    'twitter:image',
  ]);
  const rawTitle = pickMeta(html, ['og:title', 'twitter:title']);
  const description = pickMeta(html, [
    'og:description',
    'twitter:description',
    'description',
  ]);
  return {
    image,
    title: cleanTitle(rawTitle),
    description,
    author: cleanAuthor(rawTitle),
  };
}

async function fetchThroughProxy(
  proxyUrl: string,
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(proxyUrl, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchIgMetadata(url: string): Promise<IgFetchResult> {
  if (!isInstagramUrl(url)) {
    return { ok: false, error: 'Das ist kein Instagram-Link.' };
  }

  const tried: string[] = [];

  for (const makeProxy of PROXIES) {
    const proxied = makeProxy(url);
    const hostname = (() => {
      try {
        return new URL(proxied).hostname;
      } catch {
        return proxied;
      }
    })();
    tried.push(hostname);

    const html = await fetchThroughProxy(proxied);
    if (!html) continue;

    const meta = parseHtml(html);
    // Accept even partial metadata — image-only is fine.
    if (meta.image || meta.title || meta.description) {
      return { ok: true, meta, proxyTried: tried };
    }
  }

  return {
    ok: false,
    error: `Keiner der CORS-Proxies hat lesbare Metadaten geliefert. Getestet: ${tried.join(', ')}`,
    proxyTried: tried,
  };
}
