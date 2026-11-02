export const CANONICAL_APK_URL =
  'https://github.com/Sankofa-Digital-Studio/senatla-ops-internal-automation-solution/releases/download/dev-latest/senatla-ops-dev.apk';

export const HISTORICAL_APK_URL =
  'https://github.com/Sankofa-Digital-Studio/senatla-ops/releases/download/dev-latest/senatla-ops-dev.apk';

export const RELEASES_API_URL =
  'https://api.github.com/repos/Sankofa-Digital-Studio/senatla-ops-internal-automation-solution/releases?per_page=20';

let cachedRelease = null;

export async function resolveLatestApkRelease({ fetchImpl = fetch, now = Date.now() } = {}) {
  if (cachedRelease && cachedRelease.expiresAt > now) return cachedRelease;

  try {
    const response = await fetchImpl(RELEASES_API_URL, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'SenatlaOps-APK-Resolver/1.0',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (!response.ok) throw new Error(`GitHub releases request failed with HTTP ${response.status}`);
    const releases = await response.json();
    for (const release of Array.isArray(releases) ? releases : []) {
      if (release?.draft || !release?.prerelease || !String(release?.tag_name || '').startsWith('dev-')) continue;
      const asset = Array.isArray(release.assets)
        ? release.assets.find((candidate) => candidate?.name === 'senatla-ops-dev.apk')
        : null;
      if (!asset?.browser_download_url) continue;
      const downloadUrl = new URL(asset.browser_download_url);
      if (downloadUrl.protocol !== 'https:' || downloadUrl.hostname !== 'github.com') continue;
      cachedRelease = {
        downloadUrl: downloadUrl.toString(),
        releaseTag: String(release.tag_name),
        fallback: false,
        expiresAt: now + 300_000,
      };
      return cachedRelease;
    }
  } catch {
    // Keep the last known immutable release usable during a transient GitHub API failure.
  }

  return {
    downloadUrl: CANONICAL_APK_URL,
    releaseTag: 'dev-latest',
    fallback: true,
    expiresAt: now + 60_000,
  };
}

export async function handleApkDownload(req, res, { resolveRelease = resolveLatestApkRelease } = {}) {
  const method = (req.method || 'GET').toUpperCase();

  if (method !== 'GET' && method !== 'HEAD') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, HEAD');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Method Not Allowed. Use GET or HEAD.' }));
    return;
  }

  const url = new URL(req.url || '/', 'http://localhost');
  const format = url.searchParams.get('format');
  const release = await resolveRelease();

  if (format === 'json') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
    res.end(
      JSON.stringify({
        filename: 'senatla-ops-dev.apk',
        downloadUrl: release.downloadUrl,
        fallbackUrl: HISTORICAL_APK_URL,
        contentType: 'application/vnd.android.package-archive',
        releaseTag: release.releaseTag,
        fallback: release.fallback,
      })
    );
    return;
  }

  res.statusCode = 302;
  res.setHeader('Location', release.downloadUrl);
  res.setHeader('Content-Disposition', 'attachment; filename="senatla-ops-dev.apk"');
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  res.end();
}

export default async function handler(req, res) {
  return handleApkDownload(req, res);
}
