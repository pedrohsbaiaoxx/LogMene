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
  id: string;
  requestId: string;
  companyId: string;
  value: number;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface FreightRequestWithQuote extends FreightRequest {
  quote?: Quote;
} 