import express from 'express';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { google } from 'googleapis';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = 3000;

app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

let firebaseConfig: any = {};
try {
  const cfgPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(cfgPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  }
} catch (e) {
  console.warn('Unable to read firebase-applet-config.json:', e);
}

// Helper functions to get current OAuth credentials
const getClientId = () =>
  process.env.OAUTH_CLIENT_ID ||
  process.env.GOOGLE_CLIENT_ID ||
  process.env.CLIENT_ID ||
  process.env.VITE_GOOGLE_CLIENT_ID ||
  process.env.VITE_OAUTH_CLIENT_ID ||
  firebaseConfig.oAuthClientId ||
  '';

const getClientSecret = () =>
  process.env.OAUTH_CLIENT_SECRET ||
  process.env.GOOGLE_CLIENT_SECRET ||
  process.env.CLIENT_SECRET ||
  process.env.VITE_GOOGLE_CLIENT_SECRET ||
  process.env.VITE_OAUTH_CLIENT_SECRET ||
  '';

const getAppUrl = (req: express.Request) => {
  if (process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL') {
    return process.env.APP_URL.replace(/\/$/, '');
  }
  const host = req.headers.host || `localhost:${PORT}`;
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
  const rawProto = Array.isArray(req.headers['x-forwarded-proto'])
    ? req.headers['x-forwarded-proto'][0]
    : req.headers['x-forwarded-proto'];
  const protocol = rawProto || (isLocal ? 'http' : 'https');
  return `${protocol}://${host}`;
};

const createOAuthClient = (redirectUri: string) => {
  return new google.auth.OAuth2(
    getClientId(),
    getClientSecret(),
    redirectUri
  );
};

const SCOPES = [
  'https://www.googleapis.com/auth/contacts',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/drive.file'
];

// In-memory store for visit status updates and local event overrides
const visitStore: Record<string, { status: string; observation: string; updatedAt: string }> = {};

function parseTokenValue(val: any): any {
  if (!val) return null;
  if (typeof val === 'object') return val;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.startsWith('{')) {
      try { return JSON.parse(trimmed); } catch (e) {}
    }
    try {
      const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
      if (decoded.startsWith('{')) {
        return JSON.parse(decoded);
      }
    } catch (e) {}
    if (trimmed.length > 5) {
      return { access_token: trimmed };
    }
  }
  return null;
}

// Helper to get auth client from request cookies or authorization headers
function getAuthenticatedClient(req: express.Request) {
  let tokenData: any = null;

  // 1. Check cookies
  if (req.cookies?.google_tokens) {
    tokenData = parseTokenValue(req.cookies.google_tokens);
  }

  // 2. Check X-Google-Tokens header
  if (!tokenData && req.headers['x-google-tokens']) {
    tokenData = parseTokenValue(req.headers['x-google-tokens']);
  }

  // 3. Check Authorization header (Bearer token)
  if (!tokenData && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      const raw = authHeader.substring(7).trim();
      tokenData = parseTokenValue(raw);
    }
  }

  if (!tokenData || (!tokenData.access_token && !tokenData.id_token)) return null;

  try {
    const oAuth2Client = createOAuthClient(`${getAppUrl(req)}/api/auth/callback`);
    oAuth2Client.setCredentials(tokenData);
    return oAuth2Client;
  } catch (err) {
    console.error('Error creating auth client:', err);
    return null;
  }
}

// AUTH ENDPOINTS
app.get('/api/auth/google', (req, res) => {
  const clientId = getClientId();

  if (!clientId) {
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Conectando ao Google</title>
          <meta charset="utf-8">
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 2rem; text-align: center; background: #0f172a; color: #f8fafc; }
            .card { background: #1e293b; max-width: 420px; margin: 40px auto; padding: 2rem; border-radius: 1rem; border: 1px solid #334155; shadow: 0 10px 25px rgba(0,0,0,0.5); }
            h2 { color: #f59e0b; margin-top: 0; font-size: 1.25rem; }
            p { font-size: 0.9rem; color: #94a3b8; line-height: 1.5; }
            button { background: #059669; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: bold; cursor: pointer; font-size: 0.95rem; margin-top: 1rem; width: 100%; transition: background 0.2s; }
            button:hover { background: #10b981; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Configuração Google Workspace</h2>
            <p>O Client ID do Google não foi detectado no ambiente.</p>
          </div>
        </body>
      </html>
    `);
  }

  const redirectUri = `${getAppUrl(req)}/api/auth/callback`;
  const oAuth2Client = createOAuthClient(redirectUri);
  const url = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });

  return res.redirect(url);
});

app.get('/api/auth/url', (req, res) => {
  const clientId = getClientId();

  if (!clientId) {
    return res.json({
      configured: false,
      message: 'Client ID do Google não encontrado no ambiente.'
    });
  }

  const redirectUri = `${getAppUrl(req)}/api/auth/callback`;
  const oAuth2Client = createOAuthClient(redirectUri);
  const url = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });

  res.json({ configured: true, url });
});

app.get('/api/auth/callback', async (req, res) => {
  const code = req.query.code as string;
  if (!code) {
    return res.status(400).send('Código de autorização não fornecido.');
  }

  try {
    const redirectUri = `${getAppUrl(req)}/api/auth/callback`;
    const oAuth2Client = createOAuthClient(redirectUri);
    const { tokens } = await oAuth2Client.getToken(code);

    const tokenJson = JSON.stringify(tokens);

    res.cookie('google_tokens', tokenJson, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Autenticação Concluída</title></head>
        <body style="font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; color: #0f172a;">
          <div style="text-align: center; padding: 20px;">
            <h2 style="color: #059669; font-size: 1.25rem;">Conectado com sucesso ao Google!</h2>
            <p style="color: #64748b; font-size: 0.9rem;">Sua conta Google foi vinculada. Esta janela será fechada...</p>
            <script>
              try {
                localStorage.setItem('google_tokens', ${JSON.stringify(tokenJson)});
              } catch (e) {}

              if (window.opener) {
                window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', tokens: ${JSON.stringify(tokenJson)} }, '*');
                setTimeout(function() { window.close(); }, 800);
              } else {
                window.location.href = '/?auth=success';
              }
            </script>
          </div>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error('Erro no callback OAuth:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Erro na Autenticação</title></head>
        <body style="font-family: system-ui, sans-serif; padding: 2rem; background: #f8fafc;">
          <div style="max-width: 500px; margin: 0 auto; background: white; padding: 2rem; border-radius: 12px; border: 1px solid #fee2e2;">
            <h2 style="color: #dc2626; margin-top: 0;">Falha na Autenticação Google</h2>
            <p style="color: #475569;">Ocorreu um erro durante a troca de código OAuth:</p>
            <pre style="background: #f1f5f9; padding: 12px; border-radius: 8px; font-size: 12px; overflow-x: auto; color: #1e293b;">${error?.message || String(error)}</pre>
            <p style="font-size: 12px; color: #64748b;">Feche esta janela e clique em 'Diagnóstico de Conexão' no aplicativo.</p>
          </div>
        </body>
      </html>
    `);
  }
});

// DIAGNOSTIC ENDPOINT FOR OAUTH & GOOGLE CONNECTIVITY
app.get('/api/debug/auth', async (req, res) => {
  const clientId = getClientId();
  const clientSecret = getClientSecret();
  const appUrl = getAppUrl(req);
  const redirectUri = `${appUrl}/api/auth/callback`;

  const logs: string[] = [];

  logs.push(`[1] Verificação de Credenciais do Servidor`);
  logs.push(`- Client ID Configurado: ${clientId ? 'SIM (' + clientId.substring(0, 15) + '...)' : 'NÃO (Falta OAUTH_CLIENT_ID)'}`);
  logs.push(`- Client Secret Configurado: ${clientSecret ? 'SIM (' + clientSecret.substring(0, 5) + '***)' : 'Isento / Opcional (Cliente Web/Navegador)'}`);
  logs.push(`- APP_URL Calculada: ${appUrl}`);
  logs.push(`- Redirect URI OAuth: ${redirectUri}`);

  logs.push(`\n[2] Verificação de Tokens e Cookies Recebidos`);
  const hasCookie = !!req.cookies?.google_tokens;
  const hasHeaderToken = !!req.headers['x-google-tokens'];
  const hasAuthHeader = !!req.headers.authorization;

  logs.push(`- Cookie 'google_tokens' Presente: ${hasCookie ? 'SIM' : 'NÃO (Pode indicar bloqueio de cookies terceiros/SameSite no navegador)'}`);
  logs.push(`- Header 'X-Google-Tokens' Presente: ${hasHeaderToken ? 'SIM' : 'NÃO'}`);
  logs.push(`- Header 'Authorization' Presente: ${hasAuthHeader ? 'SIM' : 'NÃO'}`);

  const authClient = getAuthenticatedClient(req);
  let testUserResult = null;
  let testContactsResult = null;
  let testCalendarResult = null;

  if (authClient) {
    logs.push(`\n[3] Testando Conexão Ativa com APIs do Google`);
    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: authClient });
      const user = await oauth2.userinfo.get();
      testUserResult = { success: true, email: user.data.email, name: user.data.name };
      logs.push(`- Perfil Google: OK (${user.data.email})`);
    } catch (e: any) {
      testUserResult = { success: false, error: e.message || String(e) };
      logs.push(`- Perfil Google: ERRO -> ${e.message || String(e)}`);
    }

    try {
      const people = google.people({ version: 'v1', auth: authClient });
      const contactsRes = await people.people.connections.list({
        resourceName: 'people/me',
        pageSize: 10,
        personFields: 'names,emailAddresses,phoneNumbers'
      });
      testContactsResult = { success: true, count: contactsRes.data.connections?.length || 0 };
      logs.push(`- Google Contatos API: OK (${testContactsResult.count} contatos retornados no teste)`);
    } catch (e: any) {
      testContactsResult = { success: false, error: e.message || String(e) };
      logs.push(`- Google Contatos API: ERRO -> ${e.message || String(e)}`);
    }

    try {
      const calendar = google.calendar({ version: 'v3', auth: authClient });
      const calRes = await calendar.events.list({ calendarId: 'primary', maxResults: 5 });
      testCalendarResult = { success: true, count: calRes.data.items?.length || 0 };
      logs.push(`- Google Agenda API: OK (${testCalendarResult.count} eventos retornados no teste)`);
    } catch (e: any) {
      testCalendarResult = { success: false, error: e.message || String(e) };
      logs.push(`- Google Agenda API: ERRO -> ${e.message || String(e)}`);
    }
  } else {
    logs.push(`\n[3] Teste de APIs ignorado: Nenhuma credencial de sessão ativa encontrada na requisição.`);
  }

  res.json({
    timestamp: new Date().toISOString(),
    configured: !!clientId,
    clientIdPreview: clientId ? clientId.substring(0, 20) + '...' : null,
    appUrl,
    redirectUri,
    cookiesReceived: Object.keys(req.cookies || {}),
    hasTokenCookie: hasCookie,
    hasTokenHeader: hasHeaderToken || hasAuthHeader,
    isAuthenticated: !!authClient && (testUserResult?.success ?? false),
    testUserResult,
    testContactsResult,
    testCalendarResult,
    logs
  });
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const authClient = getAuthenticatedClient(req);
    if (!authClient) {
      return res.json({ isAuthenticated: false, isDemo: true });
    }

    const oauth2 = google.oauth2({ version: 'v2', auth: authClient });
    const userInfo = await oauth2.userinfo.get();
    return res.json({
      isAuthenticated: true,
      isDemo: false,
      name: userInfo.data.name || 'Usuário Google',
      email: userInfo.data.email || '',
      picture: userInfo.data.picture || ''
    });
  } catch (error) {
    console.error('Erro ao buscar perfil do usuário:', error);
    return res.json({ isAuthenticated: false, isDemo: true, error: 'Token expirado ou inválido' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('google_tokens');
  res.json({ success: true });
});

// HELPER FUNCTIONS FOR GOOGLE CONTACTS PARSING & SYNCING
let cachedContactGroupsMap: { data: Record<string, string>; timestamp: number } | null = null;
let cachedGoogleContacts: { data: any[]; timestamp: number } | null = null;

async function getGoogleContactGroupsMap(people: any) {
  if (cachedContactGroupsMap && (Date.now() - cachedContactGroupsMap.timestamp < 5 * 60 * 1000)) {
    return cachedContactGroupsMap.data;
  }

  const groupMap: Record<string, string> = {};
  try {
    const groupsRes = await people.contactGroups.list({
      pageSize: 1000
    });
    if (groupsRes.data.contactGroups) {
      groupsRes.data.contactGroups.forEach((g: any) => {
        if (g.resourceName && g.name) {
          groupMap[g.resourceName] = g.name;
        }
      });
    }
    cachedContactGroupsMap = { data: groupMap, timestamp: Date.now() };
  } catch (e: any) {
    console.warn('Aviso: Não foi possível listar marcadores do Google Contatos:', e?.message || e);
    if (cachedContactGroupsMap) return cachedContactGroupsMap.data;
  }
  return groupMap;
}

function normalizeDateToISO(dateStr: string): string {
  if (!dateStr) return '';
  const clean = dateStr.trim();

  // Match YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

  // Match DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const brMatch = clean.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    const year = brMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Match DD/MM/YY
  const brShortMatch = clean.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2})$/);
  if (brShortMatch) {
    const day = brShortMatch[1].padStart(2, '0');
    const month = brShortMatch[2].padStart(2, '0');
    let year = parseInt(brShortMatch[3], 10);
    year = year > 25 ? 1900 + year : 2000 + year;
    return `${year}-${month}-${day}`;
  }

  return clean;
}

function parseBiographiesText(notes: string) {
  let cns = '';
  let cpf = '';
  let birthDate = '';
  let motherName = '';
  let gender: 'M' | 'F' | 'Outro' | undefined = undefined;
  let microarea = '';
  let addressComplement = '';

  if (!notes) return { cns, cpf, birthDate, motherName, gender, microarea, addressComplement };

  const lines = notes.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Direct check for Birth Date anywhere in line
    if (!birthDate) {
      const birthMatch = trimmed.match(/(?:DATA\s+DE\s+NASCIMENTO|DATA\s+NASC|NASCIMENTO|NASC\.?|D\.?N\.?|DOB|ANIVERS[ÁA]RIO)[:=.\s\-]*(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}|\d{4}-\d{2}-\d{2})/i);
      if (birthMatch) {
        birthDate = normalizeDateToISO(birthMatch[1]);
      }
    }

    const match = trimmed.match(/^([^:=]+)[:=]+\s*(.+)$/i) || trimmed.match(/^([A-ZÀ-Ú\s.]{2,20})\s+([0-9A-Z/.-]+.*)$/i);
    if (match) {
      const key = match[1].trim().toUpperCase();
      const val = match[2].trim();

      if (!cns && (key.includes('CNS') || key.includes('CARTAO SUS') || key.includes('SUS'))) {
        const cnsMatch = val.match(/\d{15}/);
        cns = cnsMatch ? cnsMatch[0] : val;
      } else if (!cpf && key.includes('CPF')) {
        const cpfMatch = val.match(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/);
        cpf = cpfMatch ? cpfMatch[0] : val;
      } else if (!birthDate && (key.includes('NASC') || key.includes('DN') || key.includes('DOB') || key.includes('ANIVERS') || key.includes('NASCIMENTO'))) {
        const dMatch = val.match(/(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}|\d{4}-\d{2}-\d{2})/);
        if (dMatch) birthDate = normalizeDateToISO(dMatch[1]);
        else birthDate = normalizeDateToISO(val);
      } else if (!motherName && (key.includes('MÃE') || key.includes('MAE'))) {
        motherName = val;
      } else if (!gender && (key.includes('GÊNERO') || key.includes('GENERO') || key.includes('SEXO'))) {
        if (/fem/i.test(val) || val.toUpperCase() === 'F' || val.toUpperCase() === 'FEMININO') gender = 'F';
        else if (/masc/i.test(val) || val.toUpperCase() === 'M' || val.toUpperCase() === 'MASCULINO') gender = 'M';
        else gender = 'Outro';
      } else if (!microarea && (key.includes('MICROÁREA') || key.includes('MICROAREA') || key.includes('MICRO AREA') || key === 'MA')) {
        microarea = val;
      } else if (!addressComplement && (key.includes('COMPLEMENTO') || key.includes('CASA'))) {
        addressComplement = val;
      }
    }
  }

  // Fallback: If birthDate still empty, look for any standalone date in notes
  if (!birthDate) {
    const standaloneMatch = notes.match(/\b(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4})\b/);
    if (standaloneMatch) {
      birthDate = normalizeDateToISO(standaloneMatch[1]);
    }
  }

  return { cns, cpf, birthDate, motherName, gender, microarea, addressComplement };
}

function synthesizeHealthProfile(
  existingProfile: any,
  labels: string[],
  notesText: string,
  birthDateStr?: string
) {
  const hp: any = { ...(existingProfile || {}) };
  const allText = (labels.join(' ') + ' ' + notesText).toLowerCase();

  const hasKw = (...keywords: string[]) => keywords.some(kw => allText.includes(kw.toLowerCase()));

  if (hasKw('hipertens', 'p.a', 'pa', 'p.a.', 'pressão alta', 'pressao alta', 'has')) {
    hp.isHypertensive = true;
  }
  if (hasKw('diabet', 'dia', 'dm', 'insulino')) {
    hp.isDiabetic = true;
  }
  if (hasKw('domiciliad', 'acamad')) {
    hp.isBedridden = true;
  }
  if (hasKw('idoso', '60+')) {
    hp.isElderly = true;
  } else if (birthDateStr) {
    const yearMatch = birthDateStr.match(/\b(19\d\d|20\d\d)\b/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1], 10);
      if (new Date().getFullYear() - year >= 60) {
        hp.isElderly = true;
      }
    }
  }

  if (hasKw('saúde mental', 'saude mental', 'psiquiat', 'paliativos e saúde mental')) {
    hp.hasMentalCondition = true;
  }
  if (hasKw('paliativ')) {
    hp.isPalliativeCare = true;
  }
  if (hasKw('câncer', 'cancer', 'oncolog')) {
    hp.hasCancer = true;
  }
  if (hasKw('doenças crônicas', 'doencas cronicas', 'crónica', 'crônica')) {
    hp.hasChronicDiseases = true;
  }
  if (hasKw('vacinação domiciliar', 'vacinacao domiciliar', 'gripe', 'apto a vacinação')) {
    hp.isEligibleFluVaccineHome = true;
  }
  if (hasKw('gestante', 'grávida', 'gravida', 'pré-natal', 'pre-natal')) {
    hp.isPregnant = true;
  }
  if (hasKw('puérpera', 'puerpera', 'pós-parto', 'pos-parto')) {
    hp.isPuerpera = true;
  }
  if (hasKw('bolsa família', 'bolsa familia')) {
    hp.isBolsaFamilia = true;
  }
  if (hasKw('asma')) hp.hasAsthma = true;
  if (hasKw('dpoc')) hp.hasCOPD = true;
  if (hasKw('pcd', 'deficien', 'autis')) hp.hasSpecialNeeds = true;
  if (hasKw('tabagista', 'fumante')) hp.isSmoker = true;
  if (hasKw('álcool', 'alcool', 'etilista')) hp.hasAlcoholism = true;

  return Object.keys(hp).length > 0 ? hp : undefined;
}

function formatBiographiesForGoogle(contact: any) {
  const parts: string[] = [];

  if (contact.birthDate) parts.push(`DATA DE NASCIMENTO:: ${contact.birthDate}`);
  if (contact.motherName) parts.push(`NOME DA MÃE:: ${contact.motherName}`);
  if (contact.cns) parts.push(`CNS:: ${contact.cns}`);
  if (contact.cpf) parts.push(`CPF:: ${contact.cpf}`);
  if (contact.gender) {
    const genderText = contact.gender === 'F' ? 'Feminino' : (contact.gender === 'M' ? 'Masculino' : contact.gender);
    parts.push(`GENERO:: ${genderText}`);
  }
  if (contact.microarea) parts.push(`MICROÁREA:: ${contact.microarea}`);

  if (contact.notes) {
    const filteredExistingNotes = contact.notes
      .split('\n')
      .filter((line: string) => !/^(DATA DE NASCIMENTO|NOME DA MÃE|CNS|CPF|GENERO|MICROÁREA)[:=]+/i.test(line.trim()))
      .join('\n')
      .trim();

    if (filteredExistingNotes) {
      parts.push(filteredExistingNotes);
    }
  }

  return parts.join('\n');
}

async function getOrCreateContactGroupMemberships(people: any, labels: string[], healthProfile?: any) {
  const allLabels = new Set<string>(labels || []);
  if (healthProfile) {
    if (healthProfile.isHypertensive) allLabels.add('P.A');
    if (healthProfile.isDiabetic) allLabels.add('Dia');
    if (healthProfile.isBedridden) allLabels.add('Domiciliado');
    if (healthProfile.isElderly) allLabels.add('Idoso');
    if (healthProfile.hasCancer) allLabels.add('Câncer');
    if (healthProfile.hasChronicDiseases) allLabels.add('Doenças Crônicas');
    if (healthProfile.isPalliativeCare || healthProfile.hasMentalCondition) allLabels.add('Paliativos e Saúde Mental');
    if (healthProfile.isEligibleFluVaccineHome) allLabels.add('Apto a Vacinação Domiciliar da Gripe');
  }

  if (allLabels.size === 0) return undefined;

  try {
    const groupMap = await getGoogleContactGroupsMap(people);
    const nameToResourceMap: Record<string, string> = {};
    Object.entries(groupMap).forEach(([resName, name]) => {
      nameToResourceMap[name.toLowerCase()] = resName;
    });

    const memberships: any[] = [];
    for (const label of Array.from(allLabels)) {
      if (!label || label === 'Google Contatos') continue;
      const lower = label.toLowerCase();
      let resName = nameToResourceMap[lower];

      if (!resName) {
        try {
          const createRes = await people.contactGroups.create({
            requestBody: { contactGroup: { name: label } }
          });
          if (createRes.data?.resourceName) {
            resName = createRes.data.resourceName;
            nameToResourceMap[lower] = resName;
          }
        } catch (err) {
          console.warn(`Aviso ao criar marcador "${label}" no Google Contatos:`, err);
        }
      }

      if (resName) {
        memberships.push({
          contactGroupMembership: { contactGroupResourceName: resName }
        });
      }
    }

    return memberships.length > 0 ? memberships : undefined;
  } catch (err) {
    console.warn('Aviso ao mapear marcadores no Google Contatos:', err);
    return undefined;
  }
}

// GOOGLE CONTACTS ENDPOINTS (GET, POST, PUT, DELETE)
app.get('/api/contacts', async (req, res) => {
  const authClient = getAuthenticatedClient(req);
  if (!authClient) {
    return res.json({ authenticated: false, contacts: [] });
  }

  // Check 60s memory cache first to protect Google People API quota
  const now = Date.now();
  if (cachedGoogleContacts && (now - cachedGoogleContacts.timestamp < 60 * 1000)) {
    return res.json({ authenticated: true, contacts: cachedGoogleContacts.data, cached: true });
  }

  try {
    const people = google.people({ version: 'v1', auth: authClient });

    // 1. Fetch Contact Groups Map (resourceName -> name)
    const groupMap = await getGoogleContactGroupsMap(people);

    // 2. Fetch connections with expanded fields using pagination loop for all pages
    let connections: any[] = [];
    let pageToken: string | undefined = undefined;

    do {
      const response: any = await people.people.connections.list({
        resourceName: 'people/me',
        pageSize: 1000,
        pageToken,
        personFields: 'names,emailAddresses,phoneNumbers,addresses,memberships,userDefined,biographies,photos,organizations,urls,events,birthdays'
      });

      if (response.data?.connections) {
        connections = connections.concat(response.data.connections);
      }
      pageToken = response.data?.nextPageToken;
    } while (pageToken);

    const formattedContacts = connections.map((person, idx) => {
      const name = person.names?.[0]?.displayName || 'Contato Sem Nome';
      const email = person.emailAddresses?.[0]?.value || '';
      const phone = person.phoneNumbers?.[0]?.value || '';
      const address = person.addresses?.[0]?.formattedValue || person.addresses?.[0]?.streetAddress || '';
      const city = person.addresses?.[0]?.city || '';
      const state = person.addresses?.[0]?.region || '';
      const avatarUrl = person.photos?.[0]?.url || '';
      const notes = person.biographies?.[0]?.value || '';
      const company = person.organizations?.[0]?.name || person.organizations?.[0]?.department || '';

      // Parse structured notes
      const parsedFromNotes = parseBiographiesText(notes);

      let cns = parsedFromNotes.cns;
      let cpf = parsedFromNotes.cpf;
      let microarea = parsedFromNotes.microarea;
      let birthDate = parsedFromNotes.birthDate;

      // Extract native Google Contacts birthday if missing from notes
      if (!birthDate && person.birthdays && person.birthdays.length > 0) {
        const b = person.birthdays[0];
        if (b.date) {
          const y = b.date.year || 1990;
          const m = String(b.date.month || 1).padStart(2, '0');
          const d = String(b.date.day || 1).padStart(2, '0');
          birthDate = `${y}-${m}-${d}`;
        } else if (b.text) {
          birthDate = normalizeDateToISO(b.text);
        }
      }

      let motherName = parsedFromNotes.motherName;
      let gender = parsedFromNotes.gender;
      let healthProfile: any = undefined;

      // Extract labels / Marcadores
      const labels: string[] = [];
      if (person.memberships) {
        person.memberships.forEach(m => {
          const resName = m.contactGroupMembership?.contactGroupResourceName;
          if (resName) {
            const displayName = groupMap[resName] || resName.replace('contactGroups/', '');
            if (
              displayName &&
              displayName !== 'myContacts' &&
              displayName !== 'starred' &&
              !displayName.startsWith('systemGroup:')
            ) {
              labels.push(displayName);
            }
          }
        });
      }

      // Check userDefined
      if (person.userDefined) {
        person.userDefined.forEach(ud => {
          if (ud.key === 'CNS' && ud.value) cns = ud.value;
          else if (ud.key === 'CPF' && ud.value) cpf = ud.value;
          else if ((ud.key === 'Microárea' || ud.key === 'Microarea') && ud.value) microarea = ud.value;
          else if ((ud.key === 'Data Nasc' || ud.key === 'Data Nasc.') && ud.value) birthDate = ud.value;
          else if ((ud.key === 'Nome da Mãe' || ud.key === 'Nome da Mae') && ud.value) motherName = ud.value;
          else if (ud.key === 'HealthProfileJSON' && ud.value) {
            try { healthProfile = JSON.parse(ud.value); } catch (e) {}
          } else if (ud.value && !labels.includes(ud.value)) {
            labels.push(ud.value);
          }
        });
      }

      // Synthesize healthProfile from labels & notes
      healthProfile = synthesizeHealthProfile(healthProfile, labels, notes, birthDate);

      if (labels.length === 0) {
        labels.push('Google Contatos');
      }

      return {
        id: person.resourceName || `google_${idx}`,
        name,
        email,
        phone,
        address,
        city,
        state,
        cns: cns || undefined,
        cpf: cpf || undefined,
        motherName: motherName || undefined,
        gender: gender || undefined,
        microarea: microarea || undefined,
        birthDate: birthDate || undefined,
        company: company || undefined,
        healthProfile: healthProfile || undefined,
        labels,
        notes,
        avatarUrl
      };
    });

    cachedGoogleContacts = { data: formattedContacts, timestamp: Date.now() };

    res.json({ authenticated: true, contacts: formattedContacts });
  } catch (error: any) {
    const isQuotaError = error?.code === 429 || error?.status === 429 ||
      /quota|limit|exceeded|resource_exhausted/i.test(error?.message || '');

    if (isQuotaError) {
      console.warn('[Google Contatos API] Cota temporariamente excedida por minuto. Servindo dados do cache/memória.');
      return res.json({
        authenticated: true,
        contacts: cachedGoogleContacts ? cachedGoogleContacts.data : [],
        quotaExceeded: true,
        warning: 'Cota do Google Contatos excedida temporariamente por minuto. Dados preservados na memória local.'
      });
    }

    const isAuthError = error?.code === 401 || error?.code === 403 || 
      /credential|unauthorized|auth|invalid|expired/i.test(error?.message || '');

    if (isAuthError) {
      console.warn('Aviso de autenticação Google Contatos:', error.message || error);
      return res.json({ authenticated: false, contacts: [], error: 'Sessão do Google expirada ou inválida.' });
    }

    console.error('Erro ao buscar Google Contatos:', error);
    res.status(500).json({ error: error.message || 'Erro ao carregar contatos' });
  }
});

// CREATE Contact in Google Contacts
app.post('/api/contacts', async (req, res) => {
  const authClient = getAuthenticatedClient(req);
  if (!authClient) {
    return res.status(401).json({ error: 'Não autenticado no Google' });
  }

  const { name, phone, email, address, city, state, cns, cpf, motherName, gender, microarea, birthDate, company, notes, labels, healthProfile } = req.body;

  try {
    const people = google.people({ version: 'v1', auth: authClient });

    const userDefined: { key: string; value: string }[] = [];
    if (cns) userDefined.push({ key: 'CNS', value: cns });
    if (cpf) userDefined.push({ key: 'CPF', value: cpf });
    if (microarea) userDefined.push({ key: 'Microárea', value: microarea });
    if (birthDate) userDefined.push({ key: 'Data Nasc', value: birthDate });
    if (motherName) userDefined.push({ key: 'Nome da Mãe', value: motherName });
    if (healthProfile) userDefined.push({ key: 'HealthProfileJSON', value: JSON.stringify(healthProfile) });

    const formattedBiographies = formatBiographiesForGoogle({ cns, cpf, birthDate, motherName, gender, microarea, notes });
    const memberships = await getOrCreateContactGroupMemberships(people, labels || [], healthProfile);

    const response = await people.people.createContact({
      requestBody: {
        names: [{ givenName: name }],
        phoneNumbers: phone ? [{ value: phone }] : [],
        emailAddresses: email ? [{ value: email }] : [],
        addresses: address ? [{ formattedValue: address, city: city || '', region: state || '' }] : [],
        organizations: company ? [{ name: company }] : undefined,
        userDefined: userDefined.length > 0 ? userDefined : undefined,
        biographies: formattedBiographies ? [{ value: formattedBiographies }] : undefined,
        memberships
      }
    });

    cachedGoogleContacts = null;
    res.json({
      success: true,
      contact: {
        id: response.data.resourceName,
        name,
        email,
        phone,
        address,
        city,
        state,
        cns,
        cpf,
        motherName,
        gender,
        microarea,
        birthDate,
        company,
        notes: formattedBiographies,
        labels: labels || ['Google Contatos'],
        healthProfile
      }
    });
  } catch (error: any) {
    console.error('Erro ao criar contato no Google:', error);
    res.status(500).json({ error: error.message || 'Erro ao criar contato no Google' });
  }
});

// UPDATE Contact in Google Contacts
app.put('/api/contacts', async (req, res) => {
  const authClient = getAuthenticatedClient(req);
  if (!authClient) {
    return res.status(401).json({ error: 'Não autenticado no Google' });
  }

  const { id, resourceName: paramResourceName, name, phone, email, address, city, state, cns, cpf, motherName, gender, microarea, birthDate, company, notes, labels, healthProfile } = req.body;
  const resourceName = paramResourceName || id;

  if (!resourceName || !resourceName.startsWith('people/')) {
    return res.status(400).json({ error: 'resourceName do Google Contatos é obrigatório' });
  }

  try {
    const people = google.people({ version: 'v1', auth: authClient });

    // Get current contact etag
    const existing = await people.people.get({
      resourceName,
      personFields: 'names,emailAddresses,phoneNumbers,addresses,userDefined,biographies,memberships,organizations'
    });

    const userDefined: { key: string; value: string }[] = [];
    if (cns) userDefined.push({ key: 'CNS', value: cns });
    if (cpf) userDefined.push({ key: 'CPF', value: cpf });
    if (microarea) userDefined.push({ key: 'Microárea', value: microarea });
    if (birthDate) userDefined.push({ key: 'Data Nasc', value: birthDate });
    if (motherName) userDefined.push({ key: 'Nome da Mãe', value: motherName });
    if (healthProfile) userDefined.push({ key: 'HealthProfileJSON', value: JSON.stringify(healthProfile) });

    const formattedBiographies = formatBiographiesForGoogle({ cns, cpf, birthDate, motherName, gender, microarea, notes });
    const memberships = await getOrCreateContactGroupMemberships(people, labels || [], healthProfile);

    const updated = await people.people.updateContact({
      resourceName,
      updatePersonFields: 'names,emailAddresses,phoneNumbers,addresses,userDefined,biographies,organizations,memberships',
      requestBody: {
        etag: existing.data.etag,
        names: [{ givenName: name }],
        phoneNumbers: phone ? [{ value: phone }] : [],
        emailAddresses: email ? [{ value: email }] : [],
        addresses: address ? [{ formattedValue: address, city: city || '', region: state || '' }] : [],
        organizations: company ? [{ name: company }] : undefined,
        userDefined: userDefined.length > 0 ? userDefined : undefined,
        biographies: formattedBiographies ? [{ value: formattedBiographies }] : undefined,
        memberships
      }
    });

    cachedGoogleContacts = null;
    res.json({ success: true, contact: updated.data });
  } catch (error: any) {
    console.error('Erro ao atualizar contato no Google:', error);
    res.status(500).json({ error: error.message || 'Erro ao atualizar contato no Google' });
  }
});

// DELETE Contact in Google Contacts
app.delete('/api/contacts', async (req, res) => {
  const authClient = getAuthenticatedClient(req);
  if (!authClient) {
    return res.status(401).json({ error: 'Não autenticado no Google' });
  }

  const resourceName = req.query.resourceName as string || req.query.id as string;

  if (!resourceName || !resourceName.startsWith('people/')) {
    return res.status(400).json({ error: 'resourceName válido é obrigatório' });
  }

  try {
    const people = google.people({ version: 'v1', auth: authClient });
    await people.people.deleteContact({ resourceName });
    cachedGoogleContacts = null;
    res.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao excluir contato no Google:', error);
    res.status(500).json({ error: error.message || 'Erro ao excluir contato no Google' });
  }
});

// GOOGLE CALENDAR ENDPOINTS
let cachedGoogleEvents: { [dateKey: string]: { data: any[]; timestamp: number } } = {};

function getBrasiliaDateStrServer(): string {
  try {
    const parts = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());

    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;

    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
  } catch (e) {}
  return new Date().toISOString().split('T')[0];
}

function formatTimeToBrasiliaHHMM(dateTimeStr?: string, defaultVal = '08:00'): string {
  if (!dateTimeStr) return defaultVal;
  if (!dateTimeStr.includes('T')) return defaultVal;
  try {
    const d = new Date(dateTimeStr);
    if (isNaN(d.getTime())) return defaultVal;
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(d);
  } catch (e) {
    return dateTimeStr.split('T')[1]?.substring(0, 5) || defaultVal;
  }
}

app.get('/api/calendar/events', async (req, res) => {
  const authClient = getAuthenticatedClient(req);
  const dateParam = (req.query.date as string) || getBrasiliaDateStrServer();

  if (!authClient) {
    return res.json({ authenticated: false, events: [] });
  }

  // Check 60s memory cache first for calendar events
  const now = Date.now();
  if (cachedGoogleEvents[dateParam] && (now - cachedGoogleEvents[dateParam].timestamp < 60 * 1000)) {
    return res.json({ authenticated: true, events: cachedGoogleEvents[dateParam].data, cached: true });
  }

  try {
    const calendar = google.calendar({ version: 'v3', auth: authClient });

    // Exact 24-hour range for selected date in Brasília Time (America/Sao_Paulo / UTC-3)
    const timeMin = new Date(`${dateParam}T00:00:00-03:00`).toISOString();
    const timeMax = new Date(`${dateParam}T23:59:59-03:00`).toISOString();

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime'
    });

    const items = response.data.items || [];
    const formattedEvents = items.map(ev => {
      const start = ev.start?.dateTime || ev.start?.date || '';
      const end = ev.end?.dateTime || ev.end?.date || '';

      const startTimeStr = formatTimeToBrasiliaHHMM(start, '08:00');
      const endTimeStr = formatTimeToBrasiliaHHMM(end, '09:00');

      const localStatus = visitStore[ev.id || '']?.status || 'pendente';
      const localObs = visitStore[ev.id || '']?.observation || '';
      const localUpdated = visitStore[ev.id || '']?.updatedAt || '';

      return {
        id: ev.id || `cal_${Math.random()}`,
        googleEventId: ev.id,
        title: ev.summary || 'Compromisso',
        address: ev.location || 'Sem endereço cadastrado',
        startTime: startTimeStr,
        endTime: endTimeStr,
        date: dateParam,
        description: ev.description || '',
        status: localStatus,
        observation: localObs,
        updatedAt: localUpdated
      };
    });

    cachedGoogleEvents[dateParam] = { data: formattedEvents, timestamp: Date.now() };

    res.json({ authenticated: true, events: formattedEvents });
  } catch (error: any) {
    const isQuotaError = error?.code === 429 || error?.status === 429 ||
      /quota|limit|exceeded|resource_exhausted/i.test(error?.message || '');

    if (isQuotaError) {
      console.warn('[Google Agenda API] Cota excedida por minuto. Servindo agenda em cache.');
      return res.json({
        authenticated: true,
        events: cachedGoogleEvents[dateParam] ? cachedGoogleEvents[dateParam].data : [],
        quotaExceeded: true,
        warning: 'Cota de requisições do Google Agenda atingida temporariamente.'
      });
    }

    const isAuthError = error?.code === 401 || error?.code === 403 || 
      /credential|unauthorized|auth|invalid|expired/i.test(error?.message || '');

    if (isAuthError) {
      console.warn('Aviso de autenticação Google Agenda:', error.message || error);
      return res.json({ authenticated: false, events: [], error: 'Sessão do Google expirada ou inválida.' });
    }

    console.error('Erro ao buscar eventos do Google Agenda:', error);
    res.status(500).json({ error: error.message || 'Erro ao carregar agenda' });
  }
});

app.post('/api/calendar/events', async (req, res) => {
  const authClient = getAuthenticatedClient(req);
  const { title, address, date, startTime, endTime, description, contactName } = req.body;

  if (!authClient) {
    return res.status(401).json({ error: 'Não autenticado no Google' });
  }

  try {
    const calendar = google.calendar({ version: 'v3', auth: authClient });

    const startISO = new Date(`${date}T${startTime}:00-03:00`).toISOString();
    const endISO = new Date(`${date}T${endTime}:00-03:00`).toISOString();

    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: title,
        location: address,
        description: `${description || ''}\nContato: ${contactName || ''}\nAgendado via Minha Programação de Trabalho`,
        start: { dateTime: startISO, timeZone: 'America/Sao_Paulo' },
        end: { dateTime: endISO, timeZone: 'America/Sao_Paulo' }
      }
    });

    cachedGoogleEvents = {};
    res.json({ success: true, event: event.data });
  } catch (error: any) {
    console.error('Erro ao criar evento no Google Agenda:', error);
    res.status(500).json({ error: error.message || 'Erro ao criar evento' });
  }
});

// VISIT STATUS OVERRIDES
app.put('/api/visits/:eventId', (req, res) => {
  const { eventId } = req.params;
  const { status, observation } = req.body;

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  visitStore[eventId] = {
    status,
    observation: observation || '',
    updatedAt: timeStr
  };

  res.json({ success: true, visit: visitStore[eventId] });
});

// VIA CEP SERVER PROXY & BACKEND STANDARDIZATION ENDPOINTS
async function fetchViaCepServer(rawCep: string) {
  const digits = rawCep.replace(/\D/g, '');
  if (!digits) return null;
  const cleanCep = digits.length === 7 ? `0${digits}` : digits;
  if (cleanCep.length !== 8) return null;

  // 1. Primary: ViaCEP
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`, {
      headers: { 'User-Agent': 'ACS-DVila-App/1.0' }
    });
    if (res.ok) {
      const data: any = await res.json();
      if (data && !data.erro && (data.cep || data.logradouro || data.localidade)) {
        return {
          cep: data.cep || cleanCep,
          logradouro: data.logradouro || '',
          complemento: data.complemento || '',
          bairro: data.bairro || '',
          localidade: data.localidade || '',
          uf: data.uf || '',
          ibge: data.ibge || ''
        };
      }
    }
  } catch (err) {
    console.warn('[Backend ViaCEP] Primary failed, trying BrasilAPI...', err);
  }

  // 2. Secondary: BrasilAPI
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanCep}`);
    if (res.ok) {
      const data: any = await res.json();
      if (data && (data.cep || data.street || data.city)) {
        return {
          cep: data.cep || cleanCep,
          logradouro: data.street || '',
          complemento: '',
          bairro: data.neighborhood || '',
          localidade: data.city || '',
          uf: data.state || '',
          ibge: ''
        };
      }
    }
  } catch (err) {
    console.warn('[Backend ViaCEP] Secondary failed, trying AwesomeAPI...', err);
  }

  // 3. Tertiary: AwesomeAPI
  try {
    const res = await fetch(`https://cep.awesomeapi.com.br/json/${cleanCep}`);
    if (res.ok) {
      const data: any = await res.json();
      if (data && (data.cep || data.address || data.city)) {
        return {
          cep: data.cep || cleanCep,
          logradouro: data.address || '',
          complemento: '',
          bairro: data.district || '',
          localidade: data.city || '',
          uf: data.state || '',
          ibge: ''
        };
      }
    }
  } catch (err) {
    console.warn('[Backend ViaCEP] All CEP providers failed.', err);
  }

  return null;
}

app.get('/api/viacep/:cep', async (req, res) => {
  const result = await fetchViaCepServer(req.params.cep);
  if (result) {
    return res.json({ success: true, data: result });
  }
  return res.status(404).json({ success: false, error: 'CEP não encontrado ou indisponível' });
});

// SERVER CACHE BACKUP ENDPOINTS (Triple-layer storage resilience)
const getCacheFilePath = () => {
  if (process.env.VERCEL) {
    return path.join('/tmp', 'data-cache.json');
  }
  return path.join(process.cwd(), 'data-cache.json');
};

app.get('/api/cache/backup', (req, res) => {
  try {
    const cachePath = getCacheFilePath();
    if (fs.existsSync(cachePath)) {
      const raw = fs.readFileSync(cachePath, 'utf-8');
      const data = JSON.parse(raw);
      return res.json({ success: true, data });
    }
  } catch (e) {
    console.error('Erro ao ler cache do servidor:', e);
  }
  return res.json({ success: false, data: null });
});

app.post('/api/cache/backup', (req, res) => {
  try {
    const body = req.body;
    const content = JSON.stringify(
      {
        ...body,
        updatedAt: new Date().toISOString()
      },
      null,
      2
    );

    let cachePath = getCacheFilePath();
    try {
      fs.writeFileSync(cachePath, content);
    } catch (writeErr) {
      cachePath = path.join('/tmp', 'data-cache.json');
      fs.writeFileSync(cachePath, content);
    }
    return res.json({ success: true, message: 'Memória cache salva no servidor com sucesso.' });
  } catch (e: any) {
    console.error('Erro ao salvar cache no servidor:', e);
    return res.status(200).json({ success: false, warning: 'Não foi possível gravar no disco do servidor, dados salvos no cliente.', error: e.message });
  }
});

// GOOGLE DRIVE AUTOMATIC BACKUP & RESTORE ENDPOINTS
const DRIVE_BACKUP_FILENAME = 'ACS_DVila_Backup_Auto.json';

app.get('/api/drive/backup', async (req, res) => {
  const authClient = getAuthenticatedClient(req);
  if (!authClient) {
    return res.status(401).json({ success: false, authenticated: false, error: 'Usuário não autenticado no Google.' });
  }

  try {
    const drive = google.drive({ version: 'v3', auth: authClient });
    
    const searchRes = await drive.files.list({
      q: `name = '${DRIVE_BACKUP_FILENAME}' and trashed = false`,
      fields: 'files(id, name, modifiedTime, size)',
      pageSize: 1
    });

    const files = searchRes.data.files;
    if (!files || files.length === 0) {
      return res.json({ success: false, authenticated: true, message: 'Nenhum backup encontrado no Google Drive.' });
    }

    const file = files[0];
    const fileContentRes = await drive.files.get(
      { fileId: file.id!, alt: 'media' },
      { responseType: 'text' }
    );

    let parsedData = null;
    try {
      parsedData = typeof fileContentRes.data === 'string' ? JSON.parse(fileContentRes.data) : fileContentRes.data;
    } catch (e) {}

    return res.json({
      success: true,
      authenticated: true,
      fileId: file.id,
      modifiedTime: file.modifiedTime,
      data: parsedData
    });
  } catch (err: any) {
    console.error('Erro ao buscar backup no Google Drive:', err);
    return res.status(500).json({ success: false, authenticated: true, error: err.message || 'Erro de conexão com o Google Drive' });
  }
});

app.post('/api/drive/backup', async (req, res) => {
  const authClient = getAuthenticatedClient(req);
  if (!authClient) {
    return res.status(401).json({ success: false, authenticated: false, error: 'Usuário não autenticado no Google.' });
  }

  try {
    const drive = google.drive({ version: 'v3', auth: authClient });
    const backupContent = JSON.stringify(req.body, null, 2);

    const searchRes = await drive.files.list({
      q: `name = '${DRIVE_BACKUP_FILENAME}' and trashed = false`,
      fields: 'files(id, name)',
      pageSize: 1
    });

    const files = searchRes.data.files;
    let fileId = '';

    if (files && files.length > 0) {
      fileId = files[0].id!;
      await drive.files.update({
        fileId,
        media: {
          mimeType: 'application/json',
          body: backupContent
        }
      });
    } else {
      const createRes = await drive.files.create({
        requestBody: {
          name: DRIVE_BACKUP_FILENAME,
          mimeType: 'application/json',
          description: "Backup automático do aplicativo ACS D'Vila (Pacientes, Domicílios e Visitas)"
        },
        media: {
          mimeType: 'application/json',
          body: backupContent
        },
        fields: 'id'
      });
      fileId = createRes.data.id!;
    }

    return res.json({
      success: true,
      fileId,
      updatedAt: new Date().toISOString(),
      message: 'Backup atualizado no Google Drive com sucesso.'
    });
  } catch (err: any) {
    console.error('Erro ao salvar backup no Google Drive:', err);
    return res.status(500).json({ success: false, error: err.message || 'Erro ao sincronizar com Google Drive' });
  }
});

app.post('/api/address/standardize', async (req, res) => {
  const { address, cep: userCep } = req.body;

  let cepDigits = '';
  if (userCep) {
    cepDigits = userCep.replace(/\D/g, '');
  } else if (address) {
    const match = address.match(/\b(\d{7,8})\b/) || address.match(/\(\s*(\d{7,8})\s*\)/);
    if (match) cepDigits = match[1];
  }

  if (cepDigits) {
    const viaCepData = await fetchViaCepServer(cepDigits);
    if (viaCepData && viaCepData.logradouro) {
      return res.json({
        success: true,
        standardizedLogradouro: viaCepData.logradouro,
        bairro: viaCepData.bairro,
        city: viaCepData.localidade,
        state: viaCepData.uf,
        cep: viaCepData.cep,
        hasCep: true
      });
    }
  }

  // Se algum endereço não conter o CEP, deixar o endereço do cadastro
  return res.json({
    success: true,
    standardizedLogradouro: address || '',
    hasCep: false,
    message: 'Endereço mantido do cadastro original (Sem CEP / ViaCEP indisponível)'
  });
});

// GEMINI AI ENDPOINTS (Agente Aguiar Assistente Virtual do ACS)
function getGeminiAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Chave de API do Gemini (GEMINI_API_KEY) não encontrada no servidor.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

// 1. Assistente Geral do ACS (Dúvidas e-SUS, VD, Fichas, Grupos Prioritários)
app.post('/api/gemini/assistant', async (req, res) => {
  try {
    const { message, history = [], contextData } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'Mensagem inválida ou ausente.' });
    }

    const ai = getGeminiAI();

    let contextSnippet = '';
    if (contextData) {
      contextSnippet = `\n[SITUAÇÃO ATUAL DO TERRITÓRIO ACS]:
- Domicílios cadastrados: ${contextData.domicilesCount || 0}
- Munícipes/Pacientes: ${contextData.patientsCount || 0}
- Visitas agendadas hoje: ${contextData.todayVisitsCount || 0}
- Microárea padrão: ${contextData.microarea || 'Geral'}\n`;
    }

    const systemInstruction = `Você é o "Agente Aguiar IA", o Assistente Virtual Oficial do Agente Comunitário de Saúde (ACS) no projeto ACS D'Vila (Atenção Primária à Saúde / e-SUS AB).
Sua missão é dar suporte imediato, prático e fundamentado ao ACS nas suas atividades de rotina no território.

DIRETRIZES FUNDAMENTAIS:
1. Responda em Português do Brasil com tom profissional, empático, claro e direto ao ponto.
2. Esclareça dúvidas sobre fichas do e-SUS (Cadastro Individual, Cadastro Domiciliar, Visita Domiciliar - VD).
3. Oriente sobre acompanhamento de grupos prioritários: Gestantes (sinais de alerta, consultas de pré-natal), Hipertensos/Diabéticos (aferição, hábitos, medicação), Idosos (risco de queda, acamados), Puerpério/Lactantes, Crianças/Vacinação, Arboviroses/Dengue, Escorpiões e Saúde Mental.
4. NUNCA solicite dados pessoais sensíveis ou identificáveis que violem a LGPD (como CPF, RG ou nome completo dos munícipes).
5. Forneça respostas organizadas em marcadores/tópicos simples quando couber, facilitando a leitura rápida no celular do ACS durante a rua.
6. Se a pergunta for fora do contexto de ACS ou saúde pública, responda educadamente redirecionando para a prática de saúde territorial.`;

    const formattedContents = [];
    if (Array.isArray(history) && history.length > 0) {
      for (const h of history.slice(-6)) {
        if (h.role === 'user' || h.role === 'model') {
          formattedContents.push({
            role: h.role,
            parts: [{ text: h.content || h.text || '' }]
          });
        }
      }
    }

    formattedContents.push({
      role: 'user',
      parts: [{ text: contextSnippet + message }]
    });

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: formattedContents,
        config: {
          systemInstruction,
          temperature: 0.7
        }
      });
    } catch (modelErr: any) {
      console.warn('Fallback para gemini-2.0-flash:', modelErr?.message);
      response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: formattedContents,
        config: {
          systemInstruction,
          temperature: 0.7
        }
      });
    }

    return res.json({
      success: true,
      reply: response.text || 'Não foi possível gerar uma resposta no momento.'
    });
  } catch (error: any) {
    console.error('Erro no endpoint /api/gemini/assistant:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao comunicar com a inteligência artificial Gemini.'
    });
  }
});

// 2. Gerador de Orientações de Visita Domiciliar por Paciente (Anonimizado)
app.post('/api/gemini/patient-advice', async (req, res) => {
  try {
    const { priorityTags = [], ageCategory = '', conditionNotes = '', visitReason = '' } = req.body;

    const ai = getGeminiAI();

    const systemInstruction = `Você é um Consultor Técnico de Saúde da Família e Atenção Básica para ACS.
Sua tarefa é gerar de 3 a 5 recomendações práticas, humanizadas e cirúrgicas para o ACS realizar durante a Visita Domiciliar (VD) a um munícipe.

REGRAS:
- Não use nomes próprios ou dados de identificação pessoal.
- Foque no que o ACS deve OBSERVAR, PERGUNTAR e ORIENTAR.
- Se houver sinais de alerta vermelho (ex: PA descompensada, sangramento em gestante, vacina atrasada, febre alta em bebê), destaque com "🚨 ATENÇÃO:".
- Retorne em formato JSON contendo "adviceList" (array de strings) e "summary" (uma frase síntese).`;

    const prompt = `Munícipe com o seguinte perfil no território:
- Marcadores de Prioridade: ${priorityTags.join(', ') || 'Nenhum específico'}
- Faixa Etária/Perfil: ${ageCategory || 'Adulto'}
- Motivo da Visita / Acompanhamento: ${visitReason || 'Acompanhamento de Rotina'}
- Observações prévias: ${conditionNotes || 'Sem observações'}

Gere o plano de abordagem da visita.`;

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.5
        }
      });
    } catch (e: any) {
      response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.5
        }
      });
    }

    let resultJson = { adviceList: [], summary: '' };
    try {
      if (response.text) {
        resultJson = JSON.parse(response.text.trim());
      }
    } catch (e) {
      resultJson = {
        adviceList: [response.text || 'Verificar condições de saúde e atualizar ficha do e-SUS.'],
        summary: 'Acompanhamento de rotina de saúde territorial.'
      };
    }

    return res.json({
      success: true,
      data: resultJson
    });
  } catch (error: any) {
    console.error('Erro no endpoint /api/gemini/patient-advice:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao gerar orientações de visita com Gemini.'
    });
  }
});

// 3. Gerador do Roteiro e Resumo Operacional do Dia do ACS
app.post('/api/gemini/daily-summary', async (req, res) => {
  try {
    const { domicilesCount = 0, patientsCount = 0, scheduledVisitsCount = 0, prioritiesSummary = {}, dateStr = '' } = req.body;

    const ai = getGeminiAI();

    const systemInstruction = `Você é um Tutor do e-SUS e Coordenador Virtual de Saúde Comunitária.
Gere uma mensagem motivadora, organizada e prática para o Agente Comunitário de Saúde iniciar ou planejar o seu dia de trabalho no território.

Aponte prioridades epidemiológicas, incentivo para o alcance das metas do e-SUS e dicas de segurança para a rua.`;

    const prompt = `Data: ${dateStr || 'Hoje'}
Dados da Microárea do ACS:
- Total de Residências/Domicílios: ${domicilesCount}
- Total de Munícipes Cadastrados: ${patientsCount}
- Visitas Domiciliares Agendadas: ${scheduledVisitsCount}
- Distribuição de Grupos Prioritários: ${JSON.stringify(prioritiesSummary)}

Elabore um resumo estratégico curto para o dia (3 parágrafos ou seções curtas).`;

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7
        }
      });
    } catch (e: any) {
      response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7
        }
      });
    }

    return res.json({
      success: true,
      summary: response.text || 'Tenha um excelente dia de trabalho no território!'
    });
  } catch (error: any) {
    console.error('Erro no endpoint /api/gemini/daily-summary:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao gerar resumo diário com Gemini.'
    });
  }
});

// Fallback para rotas de API não encontradas (Evita erro 500 no Vercel quando a rota não casa)
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Rota de API não encontrada no servidor.',
    url: req.originalUrl || req.url
  });
});

// START EXPRESS & VITE MIDDLEWARE
async function startServer() {
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor rodando em http://localhost:${PORT}`);
      console.log('Environment keys related to Auth/Google/Client:', 
        Object.keys(process.env).filter(k => 
          /CLIENT|OAUTH|GOOGLE|AUTH|SECRET|KEY|ID/i.test(k)
        )
      );
    });
  }
}

export default app;

if (!process.env.VERCEL) {
  startServer();
}
