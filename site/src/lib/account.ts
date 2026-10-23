import type { Product } from "./catalog";
export type AccountUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
};
export type Position = {
  product: Product;
  maxAmount: number;
  leading: boolean;
  lastBidAt: string;
};
export type AccountData = {
  user: AccountUser;
  positions: Position[] | null;
  favorites: Product[] | null;
  products: Product[] | null;
  updatedAt: number;
  warnings: string[];
};
export type AccountResult = { data: AccountData | null; status: number };
