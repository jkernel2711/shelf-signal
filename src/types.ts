import type { ModelFit, ModelId } from './engine/forecast';
import type { Adf } from './engine/stats';

export type { ModelFit, ModelId };

export type Category =
  | 'staples'
  | 'dairy'
  | 'beverages'
  | 'snacks'
  | 'personal'
  | 'household'
  | 'produce'
  | 'frozen';

export type Abc = 'A' | 'B' | 'C';
export type Role = 'planner' | 'buyer' | 'store';
export type PoStatus = 'draft' | 'submitted' | 'approved' | 'in_transit' | 'received' | 'cancelled';
export type TransferStatus = 'in_transit' | 'received' | 'cancelled';
export type ExceptionKind = 'stockout' | 'risk' | 'expiring' | 'miss' | 'overstock' | 'event';
export type ExceptionSeverity = 'crit' | 'warn' | 'info';

export type User = {
  id: string;
  name: string;
  role: Role;
  title: string;
  storeId?: string;
  region?: string;
};

export type Store = {
  id: string;
  name: string;
  city: string;
  state: string;
  format: 'flagship' | 'super' | 'compact';
  sizeIndex: number;
  manager: string;
  profile: 'it' | 'family' | 'traditional' | 'mixed';
  tier: 1 | 2 | 3;
};

export type Supplier = {
  id: string;
  name: string;
  leadDays: number;
  otif: number;
  city: string;
  ticker?: string;
  last?: number;
  chg?: number;
};

export type Waste = {
  at: string;
  skuId: string;
  storeId: string;
  qty: number;
  reason: 'expiry' | 'damage' | 'shrink';
};

export type Sku = {
  id: string;
  name: string;
  brand: string;
  category: Category;
  pack: string;
  unit: string;
  casePack: number;
  mrp: number;
  cost: number;
  gst: number;
  shelfLifeDays: number;
  perishable: boolean;
  abc: Abc;
  moq: number;
  supplierId: string;
  baseDemand: number;
};

export type Festival = {
  id: string;
  name: string;
  start: string;
  end: string;
  lifts: Partial<Record<Category, number>>;
};

export type Promo = {
  id: string;
  skuId: string;
  name: string;
  start: string;
  end: string;
  lift: number;
};

export type Position = {
  onHand: number;
  inbound: number;
  nearestExpiry?: string;
};

export type Series = {
  actual: number[];
  fitted: number[];
  forecast: number[];
  best: ModelId;
  models: Partial<Record<ModelId, ModelFit>>;
  adf: Adf;
};

export type PurchaseOrder = {
  id: string;
  supplierId: string;
  storeId: string;
  status: PoStatus;
  createdAt: string;
  eta: string;
  lines: { skuId: string; qty: number; cost: number }[];
  note?: string;
};

export type Transfer = {
  id: string;
  skuId: string;
  fromStoreId: string;
  toStoreId: string;
  qty: number;
  status: TransferStatus;
  createdAt: string;
};

export type Override = {
  daily: number;
  reason: string;
};

export type Exception = {
  id: string;
  kind: ExceptionKind;
  severity: ExceptionSeverity;
  skuId: string;
  storeId: string;
  title: string;
  detail: string;
  metric: string;
  coverDays: number;
  suggestedQty: number;
};

export type SuggestedLine = {
  key: string;
  skuId: string;
  storeId: string;
  supplierId: string;
  onHand: number;
  inbound: number;
  coverDays: number;
  daily: number;
  qty: number;
  value: number;
  reason: string;
  urgent: boolean;
};
