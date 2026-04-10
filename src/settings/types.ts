export interface Family {
  id: string;
  name: string;
  color: string; // hex
}

export interface Homebase {
  name: string;
  address: string;
  coords: { lat: number; lng: number };
  placeId?: string;
  image?: string;
}

export interface Settings {
  tripStart: string; // ISO YYYY-MM-DD
  tripEnd: string;   // ISO YYYY-MM-DD
  families: Family[];
  homebase?: Homebase;
}
