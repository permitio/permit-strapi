export interface StoreResponse {
  id: number;
  key: string;
  value: string;
  type: string;
  environment: string | null;
  tag: string | null;
}
