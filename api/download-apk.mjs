export const CANONICAL_APK_URL =
  'https://github.com/Sankofa-Digital-Studio/senatla-ops-internal-automation-solution/releases/download/dev-latest/senatla-ops-dev.apk';

export const HISTORICAL_APK_URL =
  'https://github.com/Sankofa-Digital-Studio/senatla-ops/releases/download/dev-latest/senatla-ops-dev.apk';

export async function handleApkDownload(req, res) {
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

  if (format === 'json') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
    res.end(
      JSON.stringify({
        filename: 'senatla-ops-dev.apk',
        downloadUrl: CANONICAL_APK_URL,
        fallbackUrl: HISTORICAL_APK_URL,
        contentType: 'application/vnd.android.package-archive',
        releaseTag: 'dev-latest',
      })
    );
    return;
  }

  res.statusCode = 302;
  res.setHeader('Location', CANONICAL_APK_URL);
  res.setHeader('Content-Disposition', 'attachment; filename="senatla-ops-dev.apk"');
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  res.end();
}

export default async function handler(req, res) {
  return handleApkDownload(req, res);
}
