export interface BusRoute {
  from: string;
  via: string;
  to: string;
  departureTime: string;
  typeOfService: string;
  operator: string;
  serviceDays: string[];
}

export interface FilterOptions {
  from?: string;
  via?: string;
  to?: string;
  departureTime?: string;
  operator?: string;
  typeOfService?: string;
  serviceDay?: string;
} 