import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  const { url } = request.query;

  if (!url || typeof url !== 'string') {
    return response.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    const rssResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      },
      // Timeout 설정 (Vercel 기본은 10~15초 사이)
      signal: AbortSignal.timeout(10000)
    });

    if (!rssResponse.ok) {
      return response.status(rssResponse.status).send(`Failed to fetch RSS: ${rssResponse.statusText}`);
    }

    const contentType = rssResponse.headers.get('content-type');
    const data = await rssResponse.text();

    // CORS 헤더 설정 (로컬 개발 및 Vercel 환경 허용)
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.setHeader('Content-Type', contentType || 'application/xml');
    
    return response.status(200).send(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return response.status(500).json({ error: 'Internal Server Error', message: error instanceof Error ? error.message : String(error) });
  }
}
