/**
 * Servidor de APIs Gratuitas e Públicas para o App do ACS
 * 1. ViaCEP API (Consulsta de CEP sem chave)
 * 2. Nominatim / OpenStreetMap API (Geocodificação gratuita para rotas)
 * 3. IBGE Localidades API (Cidades e Estados)
 */

export interface ViaCepResult {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia?: string;
  ddd?: string;
  siafi?: string;
  erro?: boolean;
}

export interface GeocodeResult {
  lat: number;
  lon: number;
  displayName: string;
}

/**
 * Busca endereço gratuito por CEP brasileiro com múltiplos provedores resilientes (ViaCEP, BrasilAPI, AwesomeAPI)
 * @param cep String contendo o CEP (ex: 01001-000 ou 01001000)
 */
export async function searchAddressByCEP(cep: string): Promise<ViaCepResult | null> {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) {
    return null;
  }

  // Helper fetch com timeout para resiliência rápida de rede
  const fetchWithTimeout = async (url: string, timeoutMs = 3500) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      clearTimeout(timeoutId);
      return null;
    }
  };

  // 1. Provedor Primário: ViaCEP
  try {
    const data = await fetchWithTimeout(`https://viacep.com.br/ws/${cleanCep}/json/`);
    if (data && !data.erro && (data.cep || data.logradouro || data.localidade)) {
      return {
        cep: data.cep || cleanCep,
        logradouro: data.logradouro || '',
        complemento: data.complemento || '',
        bairro: data.bairro || '',
        localidade: data.localidade || '',
        uf: data.uf || '',
        ibge: data.ibge || '',
        ddd: data.ddd || '',
      };
    }
  } catch {
    console.warn('ViaCEP indisponível no momento, tentando BrasilAPI...');
  }

  // 2. Provedor Secundário: BrasilAPI
  try {
    const data = await fetchWithTimeout(`https://brasilapi.com.br/api/cep/v1/${cleanCep}`);
    if (data && (data.cep || data.street || data.city)) {
      return {
        cep: data.cep || cleanCep,
        logradouro: data.street || '',
        complemento: '',
        bairro: data.neighborhood || '',
        localidade: data.city || '',
        uf: data.state || '',
        ibge: '',
      };
    }
  } catch {
    console.warn('BrasilAPI indisponível no momento, tentando AwesomeAPI...');
  }

  // 3. Provedor Terciário: AwesomeAPI CEP
  try {
    const data = await fetchWithTimeout(`https://cep.awesomeapi.com.br/json/${cleanCep}`);
    if (data && (data.cep || data.address || data.city)) {
      return {
        cep: data.cep || cleanCep,
        logradouro: data.address || '',
        complemento: '',
        bairro: data.district || '',
        localidade: data.city || '',
        uf: data.state || '',
        ibge: data.city_ibge || '',
      };
    }
  } catch {
    console.warn('Provedor de CEP secundário indisponível.');
  }

  return null;
}

/**
 * Geocodificação gratuita de endereço para coordenadas via OpenStreetMap Nominatim API
 * @param address Endereço completo (Rua, Número, Bairro, Cidade)
 */
export async function geocodeAddressFree(address: string): Promise<GeocodeResult | null> {
  if (!address || address.trim().length < 3) return null;

  try {
    const query = encodeURIComponent(`${address}, Brasil`);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`,
      {
        headers: {
          'Accept-Language': 'pt-BR,pt;q=0.9',
          'User-Agent': 'ACS-App-Saude-Territorio'
        }
      }
    );

    if (!response.ok) return null;
    const data = await response.json();

    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        displayName: data[0].display_name
      };
    }
    return null;
  } catch (error) {
    console.error('Erro na API gratuita Nominatim OpenStreetMap:', error);
    return null;
  }
}

/**
 * Busca lista de Estados Brasileiros via API Gratuita do IBGE
 */
export async function fetchIBGEStates(): Promise<{ id: number; sigla: string; nome: string }[]> {
  try {
    const res = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome');
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Erro na API IBGE:', err);
    return [];
  }
}
