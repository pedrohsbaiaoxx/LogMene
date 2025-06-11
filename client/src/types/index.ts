export interface FreightRequest {
  id: string;
  clientId: string;
  origin: string;
  destination: string;
  weight: number;
  volume: number;
  description: string;
  status: 'pending' | 'quoted' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface Quote {
  id: number;
  requestId: number;
  value: number;
  estimatedDays: number;
  notes?: string;
  distanceKm?: number;
  createdAt: Date;
}

export interface FreightRequestWithQuote extends FreightRequest {
  quote?: Quote;
} 