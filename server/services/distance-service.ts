import { log } from '../vite';

// Coordenadas aproximadas de algumas cidades brasileiras
const cityCoordinates: Record<string, { lat: number; lng: number }> = {
  'sao paulo': { lat: -23.5505, lng: -46.6333 },
  'rio de janeiro': { lat: -22.9068, lng: -43.1729 },
  'belo horizonte': { lat: -19.9167, lng: -43.9345 },
  'brasilia': { lat: -15.7801, lng: -47.9292 },
  'salvador': { lat: -12.9714, lng: -38.5014 },
  'fortaleza': { lat: -3.7319, lng: -38.5267 },
  'recife': { lat: -8.0476, lng: -34.8770 },
  'porto alegre': { lat: -30.0346, lng: -51.2177 },
  'curitiba': { lat: -25.4290, lng: -49.2671 },
  'manaus': { lat: -3.1190, lng: -60.0217 },
  'belem': { lat: -1.4558, lng: -48.4902 },
  'goiania': { lat: -16.6864, lng: -49.2643 },
  'guarulhos': { lat: -23.4543, lng: -46.5337 },
  'campinas': { lat: -22.9056, lng: -47.0608 },
  'natal': { lat: -5.7793, lng: -35.2009 },
  'santos': { lat: -23.9619, lng: -46.3342 },
  'campo grande': { lat: -20.4695, lng: -54.6201 },
  'maceio': { lat: -9.6498, lng: -35.7089 },
  'cuiaba': { lat: -15.5989, lng: -56.0949 },
  'florianopolis': { lat: -27.5969, lng: -48.5495 }
};

// Fórmula Haversine para calcular distância entre coordenadas em km
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Raio da Terra em km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distância em km
  
  return parseFloat(distance.toFixed(2));
}

function toRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}

// Encontra a cidade mais próxima com base no nome (fuzzy match)
function findClosestCity(cityName: string): { lat: number; lng: number } | null {
  const normalizedName = cityName.toLowerCase().trim();
  
  // Tenta encontrar correspondência exata
  if (cityCoordinates[normalizedName]) {
    return cityCoordinates[normalizedName];
  }
  
  // Tenta encontrar correspondência parcial
  for (const [name, coords] of Object.entries(cityCoordinates)) {
    if (normalizedName.includes(name) || name.includes(normalizedName)) {
      return coords;
    }
  }
  
  // Tenta verificar se alguma palavra do endereço coincide com uma cidade
  const words = normalizedName.split(/[\s,.-]+/);
  for (const word of words) {
    if (word.length > 3) { // Ignorar palavras muito curtas
      for (const [name, coords] of Object.entries(cityCoordinates)) {
        if (name.includes(word)) {
          return coords;
        }
      }
    }
  }
  
  return null;
}

// Analisa endereço para tentar extrair cidade
function extractCity(address: string): string {
  // Remover CEP, números e outros elementos comuns em endereços
  const cleanedAddress = address
    .replace(/\d{5}-?\d{3}/g, '') // Remove CEP
    .replace(/,?\s*n[º°]?\s*\d+/gi, '') // Remove números de casa/prédio
    .replace(/\d+/g, '') // Remove outros números
    .replace(/apto|apartamento|casa|bloco|sala|conjunto/gi, '') // Remove termos comuns
    .trim();
  
  // Divide o endereço em partes
  const parts = cleanedAddress.split(/,|\.|\-/);
  
  // Tenta identificar a parte que mais parece ser uma cidade
  // (geralmente é a última parte antes do estado ou a primeira mais longa)
  if (parts.length > 1) {
    const possibleCity = parts[parts.length - 2].trim();
    if (possibleCity.length > 3) {
      return possibleCity;
    }
  }
  
  // Se não conseguir identificar, retorna o endereço limpo
  return cleanedAddress;
}

// Função principal que estima a distância entre dois endereços
export function estimateDistance(fromAddress: string, toAddress: string): number | null {
  try {
    const fromCity = extractCity(fromAddress);
    const toCity = extractCity(toAddress);
    
    log(`Tentando calcular distância de "${fromCity}" para "${toCity}"`, 'distance-service');
    
    const fromCoordinates = findClosestCity(fromCity);
    const toCoordinates = findClosestCity(toCity);
    
    if (!fromCoordinates || !toCoordinates) {
      log(`Não foi possível encontrar coordenadas para um dos endereços`, 'distance-service');
      return null;
    }
    
    const distance = calculateDistance(
      fromCoordinates.lat, fromCoordinates.lng,
      toCoordinates.lat, toCoordinates.lng
    );
    
    log(`Distância estimada: ${distance} km`, 'distance-service');
    
    return distance;
  } catch (error) {
    log(`Erro ao calcular distância: ${error}`, 'distance-service');
    return null;
  }
}

// API endpoint para calcular distância
export async function getDistanceBetweenAddresses(fromAddress: string, toAddress: string): Promise<{
  success: boolean;
  distance?: number;
  unit?: string;
  error?: string;
}> {
  try {
    const distance = estimateDistance(fromAddress, toAddress);
    
    if (distance === null) {
      return {
        success: false,
        error: "Não foi possível calcular a distância entre os endereços fornecidos."
      };
    }
    
    return {
      success: true,
      distance,
      unit: "km"
    };
  } catch (error) {
    log(`Erro no serviço de distância: ${error}`, 'distance-service');
    return {
      success: false,
      error: "Erro ao processar a solicitação de cálculo de distância."
    };
  }
}