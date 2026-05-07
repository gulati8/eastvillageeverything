export interface Neighborhood {
  id: string;
  value: string;
  display: string;
  sort_order: number;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface NeighborhoodSummary {
  id: string;
  value: string;
  display: string;
  is_default: boolean;
  order: string;
}
