import app from '../server';

export default function handler(req: any, res: any) {
  // Captura o caminho original solicitado pelo cliente que o Vercel passa no header 'x-forwarded-uri'
  const rawOriginalUrl = req.headers['x-forwarded-uri'] || req.headers['x-matched-path'] || req.url || '';

  if (typeof rawOriginalUrl === 'string' && rawOriginalUrl.length > 0) {
    let cleanUrl = rawOriginalUrl;
    // Se o Vercel reescreveu para /api/index.ts, limpa a string
    if (cleanUrl.startsWith('/api/index.ts')) {
      cleanUrl = cleanUrl.replace('/api/index.ts', '/api');
    }
    // Garante o prefixo /api para dar match correto nas rotas do Express
    if (!cleanUrl.startsWith('/api')) {
      cleanUrl = '/api' + (cleanUrl.startsWith('/') ? cleanUrl : '/' + cleanUrl);
    }
    req.url = cleanUrl;
  }

  return app(req, res);
}

