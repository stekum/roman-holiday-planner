export interface Family {
  id: string;
  name: string;
  color: string; // hex
}

export interface Settings {
  tripStart: string; // ISO YYYY-MM-DD
  tripEnd: string;   // ISO YYYY-MM-DD
  families: Family[];
}
