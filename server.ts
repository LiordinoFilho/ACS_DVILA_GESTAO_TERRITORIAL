import express from 'express';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import { google } from 'googleapis';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());
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
  'https://www.googleapis.com/auth/userinfo.profile'
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
    const oAuth2Client = new google.auth.OAuth2();
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
  const clientSecret = getClientSecret();

  if (!clientId || !clientSecret) {
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Conectando ao Google</title>
          <meta charset="utf-8">
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 2rem; text-align: center; background: #0f172a; color: #f8fafc; }
            .card { background: #1e293b; max-width: 420px; margin: 40px auto; padding: 2rem; border-radius: 1rem; border: 1px solid #334155; shadow: 0 10px 25px rgba(0,0,0,0.5); }
            h2 { color: #34d399; margin-top: 0; font-size: 1.25rem; }
            p { font-size: 0.9rem; color: #94a3b8; line-height: 1.5; }
            button { background: #059669; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: bold; cursor: pointer; font-size: 0.95rem; margin-top: 1rem; width: 100%; transition: background 0.2s; }
            button:hover { background: #10b981; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Configuração Google Workspace</h2>
            <p>O aplicativo está pronto para autenticação. Clique no botão abaixo para tentar conectar com sua Conta Google.</p>
            <button onclick="window.location.href='/api/auth/google'">Acessar Conta Google</button>
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
  const clientSecret = getClientSecret();

  if (!clientId || !clientSecret) {
    return res.json({
      configured: false,
      message: 'Credenciais OAuth do Google não encontradas no ambiente.'
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
  logs.push(`- Client Secret Configurado: ${clientSecret ? 'SIM (' + clientSecret.substring(0, 5) + '***)' : 'NÃO (Falta OAUTH_CLIENT_SECRET)'}`);
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
  const authClient = getAuthenticatedClient(req);
  if (!authClient) {
    return res.json({ isAuthenticated: false, isDemo: true });
  }

  try {
    const oauth2 = google.oauth2({ version: 'v2', auth: authClient });
    const userInfo = await oauth2.userinfo.get();
    res.json({
      isAuthenticated: true,
      isDemo: false,
      name: userInfo.data.name || 'Usuário Google',
      email: userInfo.data.email || '',
      picture: userInfo.data.picture || ''
    });
  } catch (error) {
    console.error('Erro ao buscar perfil do usuário:', error);
    res.json({ isAuthenticated: false, isDemo: true, error: 'Token expirado' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('google_tokens');
  res.json({ success: true });
});

// HELPER FUNCTIONS FOR GOOGLE CONTACTS PARSING & SYNCING
async function getGoogleContactGroupsMap(people: any) {
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
  } catch (e: any) {
    console.warn('Aviso: Não foi possível listar marcadores do Google Contatos:', e?.message || e);
  }
  return groupMap;
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

  const lines = notes.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(/^([^:=]+)[:=]+\s*(.+)$/i);
    if (match) {
      const key = match[1].trim().toUpperCase();
      const val = match[2].trim();

      if (key.includes('CNS')) {
        cns = val;
      } else if (key.includes('CPF')) {
        cpf = val;
      } else if (key.includes('NASCIMENTO') || key.includes('DATA NASC') || key === 'DOB' || key === 'DATA DE NASCIMENTO') {
        birthDate = val;
      } else if (key.includes('MÃE') || key.includes('MAE') || key.includes('NOME DA MÃE') || key.includes('NOME DA MAE')) {
        motherName = val;
      } else if (key.includes('GÊNERO') || key.includes('GENERO') || key.includes('SEXO')) {
        if (/fem/i.test(val) || val.toUpperCase() === 'F' || val.toUpperCase() === 'FEMININO') gender = 'F';
        else if (/masc/i.test(val) || val.toUpperCase() === 'M' || val.toUpperCase() === 'MASCULINO') gender = 'M';
        else gender = 'Outro';
      } else if (key.includes('MICROÁREA') || key.includes('MICROAREA') || key === 'MICRO AREA') {
        microarea = val;
      } else if (key.includes('COMPLEMENTO') || key.includes('CASA')) {
        addressComplement = val;
      }
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
        personFields: 'names,emailAddresses,phoneNumbers,addresses,memberships,userDefined,biographies,photos,organizations,urls,events'
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

    res.json({ authenticated: true, contacts: formattedContacts });
  } catch (error: any) {
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
    res.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao excluir contato no Google:', error);
    res.status(500).json({ error: error.message || 'Erro ao excluir contato no Google' });
  }
});

// GOOGLE CALENDAR ENDPOINTS
app.get('/api/calendar/events', async (req, res) => {
  const authClient = getAuthenticatedClient(req);
  const dateParam = (req.query.date as string) || new Date().toISOString().split('T')[0];

  if (!authClient) {
    return res.json({ authenticated: false, events: [] });
  }

  try {
    const calendar = google.calendar({ version: 'v3', auth: authClient });

    // Range for selected date
    const timeMin = new Date(`${dateParam}T00:00:00Z`).toISOString();
    const timeMax = new Date(`${dateParam}T23:59:59Z`).toISOString();

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

      const startTimeStr = start.includes('T') ? start.split('T')[1].substring(0, 5) : '08:00';
      const endTimeStr = end.includes('T') ? end.split('T')[1].substring(0, 5) : '09:00';

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

    res.json({ authenticated: true, events: formattedEvents });
  } catch (error: any) {
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

    const startDateTime = `${date}T${startTime}:00`;
    const endDateTime = `${date}T${endTime}:00`;

    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: title,
        location: address,
        description: `${description || ''}\nContato: ${contactName || ''}\nAgendado via Minha Programação de Trabalho`,
        start: { dateTime: new Date(startDateTime).toISOString() },
        end: { dateTime: new Date(endDateTime).toISOString() }
      }
    });

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

// START EXPRESS & VITE MIDDLEWARE
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log('Environment keys related to Auth/Google/Client:', 
      Object.keys(process.env).filter(k => 
        /CLIENT|OAUTH|GOOGLE|AUTH|SECRET|KEY|ID/i.test(k)
      )
    );
  });
}

startServer();
