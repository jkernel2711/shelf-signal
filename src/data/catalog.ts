import type { Festival, Promo, Sku, Store, Supplier, User } from '../types';

export const AS_OF = '2026-09-11';
export const HISTORY = 84;
export const HORIZON = 28;
export const TEST_H = 14;
export const HORIZON_LONG = 60;
export const REVIEW_DAYS = 7;

export const REGION_LABEL: Record<string, string> = {
  TG: 'Telangana',
  AP: 'Andhra',
  KA: 'Karnataka',
  TN: 'Tamil Nadu',
  MH: 'Maharashtra',
};

export const USERS: User[] = [
  { id: 'meera', name: 'Meera Iyer', role: 'planner', title: 'Head of Planning, HQ' },
  { id: 'rohan', name: 'Rohan Deshmukh', role: 'buyer', title: 'FMCG buyer, chain' },
  { id: 'kavya', name: 'Kavya Menon', role: 'buyer', title: 'Fresh & dairy buyer' },
  { id: 'vikram', name: 'Vikram Shah', role: 'planner', title: 'West region', region: 'MH' },
  { id: 'fatima', name: 'Fatima Shaik', role: 'store', title: 'Gachibowli', storeId: 'hyd-gachi' },
  { id: 'anand', name: 'Anand Rao', role: 'store', title: 'Banjara Hills', storeId: 'hyd-banjara' },
  { id: 'priya', name: 'Priya Nair', role: 'store', title: 'Indiranagar', storeId: 'blr-indi' },
  { id: 'ramesh', name: 'Ramesh Goud', role: 'store', title: 'Hanamkonda · Warangal', storeId: 'wgl-hanamkonda' },
];

export const STORES: Store[] = [
  { id: 'hyd-banjara', name: 'Banjara Hills', city: 'Hyderabad', state: 'TG', format: 'flagship', sizeIndex: 1.45, manager: 'Anand Rao', profile: 'mixed', tier: 1 },
  { id: 'hyd-gachi', name: 'Gachibowli', city: 'Hyderabad', state: 'TG', format: 'super', sizeIndex: 1.32, manager: 'Fatima Shaik', profile: 'it', tier: 1 },
  { id: 'hyd-kphb', name: 'Kukatpally', city: 'Hyderabad', state: 'TG', format: 'super', sizeIndex: 1.18, manager: 'Srinivas Reddy', profile: 'family', tier: 2 },
  { id: 'hyd-sec', name: 'Secunderabad', city: 'Hyderabad', state: 'TG', format: 'super', sizeIndex: 1.12, manager: 'Neha Joshi', profile: 'mixed', tier: 2 },
  { id: 'hyd-madhapur', name: 'Madhapur', city: 'Hyderabad', state: 'TG', format: 'super', sizeIndex: 1.28, manager: 'Arjun Varma', profile: 'it', tier: 1 },
  { id: 'hyd-lbnagar', name: 'LB Nagar', city: 'Hyderabad', state: 'TG', format: 'compact', sizeIndex: 0.95, manager: 'Swapna Reddy', profile: 'family', tier: 3 },
  { id: 'wgl-hanamkonda', name: 'Hanamkonda', city: 'Warangal', state: 'TG', format: 'compact', sizeIndex: 0.82, manager: 'Ramesh Goud', profile: 'traditional', tier: 2 },
  { id: 'vja-benz', name: 'Benz Circle', city: 'Vijayawada', state: 'AP', format: 'super', sizeIndex: 1.05, manager: 'Lakshmi Prasad', profile: 'traditional', tier: 2 },
  { id: 'viz-mvp', name: 'MVP Colony', city: 'Visakhapatnam', state: 'AP', format: 'super', sizeIndex: 0.98, manager: 'Ravi Teja', profile: 'family', tier: 2 },
  { id: 'viz-gaju', name: 'Gajuwaka', city: 'Visakhapatnam', state: 'AP', format: 'compact', sizeIndex: 0.84, manager: 'Padma Rao', profile: 'family', tier: 3 },
  { id: 'gnt-brodie', name: 'Brodipet', city: 'Guntur', state: 'AP', format: 'compact', sizeIndex: 0.8, manager: 'Suresh Babu', profile: 'traditional', tier: 3 },
  { id: 'tpt-tirumala', name: 'Tirupati', city: 'Tirupati', state: 'AP', format: 'super', sizeIndex: 1.08, manager: 'Divya Naidu', profile: 'traditional', tier: 2 },
  { id: 'blr-indi', name: 'Indiranagar', city: 'Bengaluru', state: 'KA', format: 'super', sizeIndex: 1.3, manager: 'Priya Nair', profile: 'it', tier: 1 },
  { id: 'blr-white', name: 'Whitefield', city: 'Bengaluru', state: 'KA', format: 'super', sizeIndex: 1.26, manager: 'Rahul Hegde', profile: 'it', tier: 1 },
  { id: 'blr-jaya', name: 'Jayanagar', city: 'Bengaluru', state: 'KA', format: 'flagship', sizeIndex: 1.22, manager: 'Anitha Rao', profile: 'family', tier: 1 },
  { id: 'mys-chamundi', name: 'Chamundi', city: 'Mysuru', state: 'KA', format: 'compact', sizeIndex: 0.88, manager: 'Sanjay Gowda', profile: 'traditional', tier: 2 },
  { id: 'maa-tnagar', name: 'T. Nagar', city: 'Chennai', state: 'TN', format: 'flagship', sizeIndex: 1.28, manager: 'Karthik R', profile: 'traditional', tier: 1 },
  { id: 'maa-vela', name: 'Velachery', city: 'Chennai', state: 'TN', format: 'super', sizeIndex: 1.1, manager: 'Lakshmi Iyer', profile: 'family', tier: 1 },
  { id: 'cbe-rspuram', name: 'RS Puram', city: 'Coimbatore', state: 'TN', format: 'super', sizeIndex: 0.96, manager: 'Mohan Kumar', profile: 'family', tier: 2 },
  { id: 'pune-kothrud', name: 'Kothrud', city: 'Pune', state: 'MH', format: 'super', sizeIndex: 1.08, manager: 'Sneha Kulkarni', profile: 'family', tier: 1 },
  { id: 'pune-baner', name: 'Baner', city: 'Pune', state: 'MH', format: 'super', sizeIndex: 1.16, manager: 'Amit Deshpande', profile: 'it', tier: 1 },
  { id: 'mum-andheri', name: 'Andheri West', city: 'Mumbai', state: 'MH', format: 'flagship', sizeIndex: 1.4, manager: 'Nisha Mehta', profile: 'mixed', tier: 1 },
  { id: 'mum-thane', name: 'Thane', city: 'Thane', state: 'MH', format: 'super', sizeIndex: 1.14, manager: 'Rohit Patil', profile: 'family', tier: 1 },
  { id: 'ngp-dharampeth', name: 'Dharampeth', city: 'Nagpur', state: 'MH', format: 'compact', sizeIndex: 0.9, manager: 'Pooja Deshmukh', profile: 'family', tier: 2 },
];

export function visibleStores(user: User | null, regionFilter: string, storeFilter: string): Store[] {
  let list = STORES;
  if (user?.storeId) return STORES.filter((s) => s.id === user.storeId);
  if (user?.region) list = list.filter((s) => s.state === user.region);
  else if (regionFilter !== 'all') list = list.filter((s) => s.state === regionFilter);
  if (storeFilter !== 'all' && list.some((s) => s.id === storeFilter)) list = list.filter((s) => s.id === storeFilter);
  return list;
}

export const SUPPLIERS: Supplier[] = [
  { id: 'itc', name: 'ITC', leadDays: 5, otif: 0.94, city: 'Hyderabad DC', ticker: 'ITC', last: 259.85, chg: 0.21 },
  { id: 'hul', name: 'HUL', leadDays: 6, otif: 0.91, city: 'Hyderabad DC', ticker: 'HINDUNILVR', last: 1934, chg: -0.18 },
  { id: 'amul', name: 'Amul', leadDays: 1, otif: 0.97, city: 'Local dairy' },
  { id: 'nestle', name: 'Nestlé India', leadDays: 5, otif: 0.93, city: 'Secunderabad', ticker: 'NESTLEIND', last: 1389.7, chg: 0.25 },
  { id: 'brit', name: 'Britannia', leadDays: 4, otif: 0.9, city: 'Hyderabad' },
  { id: 'parle', name: 'Parle', leadDays: 5, otif: 0.88, city: 'Hyderabad' },
  { id: 'tata', name: 'Tata Consumer', leadDays: 6, otif: 0.95, city: 'Hyderabad DC' },
  { id: 'marico', name: 'Marico', leadDays: 7, otif: 0.89, city: 'Vijayawada' },
  { id: 'coke', name: 'Coca-Cola', leadDays: 3, otif: 0.92, city: 'Local bottler' },
  { id: 'pepsi', name: 'PepsiCo', leadDays: 4, otif: 0.9, city: 'Local DC' },
  { id: 'reckitt', name: 'Reckitt', leadDays: 8, otif: 0.86, city: 'Mumbai DC' },
  { id: 'fresh', name: 'Sattva Fresh DC', leadDays: 1, otif: 0.84, city: 'Hyderabad hub' },
  { id: 'mondelez', name: 'Mondelez', leadDays: 6, otif: 0.91, city: 'Bengaluru' },
  { id: 'mdh', name: 'MDH', leadDays: 8, otif: 0.87, city: 'Delhi DC' },
];

export const SKUS: Sku[] = [
  { id: 'atta-5', name: 'Atta 5 kg', brand: 'Aashirvaad', category: 'staples', pack: '5 kg', unit: 'bag', casePack: 6, mrp: 260, cost: 218, gst: 5, shelfLifeDays: 90, perishable: false, abc: 'A', moq: 6, supplierId: 'itc', baseDemand: 18 },
  { id: 'rice-1', name: 'Basmati 1 kg', brand: 'India Gate', category: 'staples', pack: '1 kg', unit: 'bag', casePack: 10, mrp: 159, cost: 128, gst: 5, shelfLifeDays: 180, perishable: false, abc: 'A', moq: 10, supplierId: 'tata', baseDemand: 14 },
  { id: 'dal-1', name: 'Toor dal 1 kg', brand: 'Sattva', category: 'staples', pack: '1 kg', unit: 'bag', casePack: 10, mrp: 129, cost: 108, gst: 5, shelfLifeDays: 150, perishable: false, abc: 'A', moq: 10, supplierId: 'fresh', baseDemand: 12 },
  { id: 'salt-1', name: 'Salt 1 kg', brand: 'Tata', category: 'staples', pack: '1 kg', unit: 'pack', casePack: 20, mrp: 32, cost: 22, gst: 5, shelfLifeDays: 365, perishable: false, abc: 'B', moq: 20, supplierId: 'tata', baseDemand: 9 },
  { id: 'oil-1', name: 'Sunflower oil 1 L', brand: 'Fortune', category: 'staples', pack: '1 L', unit: 'bottle', casePack: 12, mrp: 155, cost: 132, gst: 5, shelfLifeDays: 270, perishable: false, abc: 'A', moq: 12, supplierId: 'marico', baseDemand: 16 },
  { id: 'sugar-1', name: 'Sugar 1 kg', brand: 'Madhur', category: 'staples', pack: '1 kg', unit: 'pack', casePack: 10, mrp: 60, cost: 51, gst: 5, shelfLifeDays: 365, perishable: false, abc: 'A', moq: 10, supplierId: 'fresh', baseDemand: 11 },
  { id: 'masala-100', name: 'Garam masala 100 g', brand: 'MDH', category: 'staples', pack: '100 g', unit: 'box', casePack: 24, mrp: 84, cost: 58, gst: 5, shelfLifeDays: 365, perishable: false, abc: 'C', moq: 24, supplierId: 'mdh', baseDemand: 4 },
  { id: 'milk-500', name: 'Taaza 500 ml', brand: 'Amul', category: 'dairy', pack: '500 ml', unit: 'pack', casePack: 20, mrp: 29, cost: 25, gst: 5, shelfLifeDays: 3, perishable: true, abc: 'A', moq: 20, supplierId: 'amul', baseDemand: 48 },
  { id: 'butter-100', name: 'Butter 100 g', brand: 'Amul', category: 'dairy', pack: '100 g', unit: 'pack', casePack: 20, mrp: 62, cost: 51, gst: 12, shelfLifeDays: 90, perishable: true, abc: 'B', moq: 20, supplierId: 'amul', baseDemand: 8 },
  { id: 'paneer-200', name: 'Paneer 200 g', brand: 'Amul', category: 'dairy', pack: '200 g', unit: 'pack', casePack: 16, mrp: 90, cost: 76, gst: 5, shelfLifeDays: 7, perishable: true, abc: 'B', moq: 16, supplierId: 'amul', baseDemand: 7 },
  { id: 'curd-400', name: 'Curd 400 g', brand: 'Mother Dairy', category: 'dairy', pack: '400 g', unit: 'cup', casePack: 12, mrp: 50, cost: 41, gst: 5, shelfLifeDays: 6, perishable: true, abc: 'A', moq: 12, supplierId: 'fresh', baseDemand: 14 },
  { id: 'eggs-12', name: 'Eggs 12', brand: 'Sattva Fresh', category: 'dairy', pack: '12 pcs', unit: 'tray', casePack: 6, mrp: 73, cost: 61, gst: 0, shelfLifeDays: 14, perishable: true, abc: 'A', moq: 6, supplierId: 'fresh', baseDemand: 15 },
  { id: 'tea-250', name: 'Tea Gold 250 g', brand: 'Tata', category: 'beverages', pack: '250 g', unit: 'pack', casePack: 24, mrp: 155, cost: 118, gst: 5, shelfLifeDays: 365, perishable: false, abc: 'B', moq: 24, supplierId: 'tata', baseDemand: 6 },
  { id: 'bru-50', name: 'Instant 50 g', brand: 'Bru', category: 'beverages', pack: '50 g', unit: 'jar', casePack: 24, mrp: 125, cost: 92, gst: 18, shelfLifeDays: 365, perishable: false, abc: 'B', moq: 24, supplierId: 'hul', baseDemand: 5 },
  { id: 'coke-750', name: 'Coca-Cola 750 ml', brand: 'Coca-Cola', category: 'beverages', pack: '750 ml', unit: 'bottle', casePack: 12, mrp: 40, cost: 28, gst: 28, shelfLifeDays: 180, perishable: false, abc: 'B', moq: 12, supplierId: 'coke', baseDemand: 22 },
  { id: 'water-1', name: 'Water 1 L', brand: 'Bisleri', category: 'beverages', pack: '1 L', unit: 'bottle', casePack: 12, mrp: 20, cost: 12, gst: 18, shelfLifeDays: 180, perishable: false, abc: 'B', moq: 12, supplierId: 'fresh', baseDemand: 20 },
  { id: 'juice-1', name: 'Mixed fruit 1 L', brand: 'Tropicana', category: 'beverages', pack: '1 L', unit: 'carton', casePack: 12, mrp: 130, cost: 98, gst: 12, shelfLifeDays: 180, perishable: false, abc: 'C', moq: 12, supplierId: 'pepsi', baseDemand: 6 },
  { id: 'parleg-250', name: 'Parle-G 250 g', brand: 'Parle', category: 'snacks', pack: '250 g', unit: 'pack', casePack: 24, mrp: 35, cost: 26, gst: 18, shelfLifeDays: 180, perishable: false, abc: 'A', moq: 24, supplierId: 'parle', baseDemand: 18 },
  { id: 'maggi-70', name: 'Maggi 70 g', brand: 'Nestlé', category: 'snacks', pack: '70 g', unit: 'pack', casePack: 48, mrp: 14, cost: 10, gst: 18, shelfLifeDays: 270, perishable: false, abc: 'A', moq: 48, supplierId: 'nestle', baseDemand: 28 },
  { id: 'lays-52', name: 'Magic Masala 52 g', brand: "Lay's", category: 'snacks', pack: '52 g', unit: 'pack', casePack: 48, mrp: 20, cost: 14, gst: 18, shelfLifeDays: 120, perishable: false, abc: 'B', moq: 48, supplierId: 'pepsi', baseDemand: 16 },
  { id: 'bhujia-200', name: 'Aloo bhujia 200 g', brand: 'Haldiram', category: 'snacks', pack: '200 g', unit: 'pack', casePack: 20, mrp: 68, cost: 50, gst: 12, shelfLifeDays: 120, perishable: false, abc: 'B', moq: 20, supplierId: 'fresh', baseDemand: 8 },
  { id: 'dairymilk-50', name: 'Dairy Milk 50 g', brand: 'Cadbury', category: 'snacks', pack: '50 g', unit: 'bar', casePack: 36, mrp: 45, cost: 32, gst: 18, shelfLifeDays: 270, perishable: false, abc: 'B', moq: 36, supplierId: 'mondelez', baseDemand: 12 },
  { id: 'goodday-200', name: 'Good Day 200 g', brand: 'Britannia', category: 'snacks', pack: '200 g', unit: 'pack', casePack: 24, mrp: 40, cost: 29, gst: 18, shelfLifeDays: 180, perishable: false, abc: 'B', moq: 24, supplierId: 'brit', baseDemand: 9 },
  { id: 'bread-400', name: 'Bread 400 g', brand: 'Britannia', category: 'snacks', pack: '400 g', unit: 'loaf', casePack: 12, mrp: 50, cost: 34, gst: 5, shelfLifeDays: 4, perishable: true, abc: 'A', moq: 12, supplierId: 'brit', baseDemand: 18 },
  { id: 'dove-75', name: 'Dove soap 75 g', brand: 'Dove', category: 'personal', pack: '75 g', unit: 'bar', casePack: 48, mrp: 52, cost: 38, gst: 18, shelfLifeDays: 730, perishable: false, abc: 'B', moq: 48, supplierId: 'hul', baseDemand: 7 },
  { id: 'colgate-200', name: 'Strong Teeth 200 g', brand: 'Colgate', category: 'personal', pack: '200 g', unit: 'tube', casePack: 24, mrp: 125, cost: 92, gst: 18, shelfLifeDays: 730, perishable: false, abc: 'B', moq: 24, supplierId: 'fresh', baseDemand: 5 },
  { id: 'dettol-200', name: 'Handwash 200 ml', brand: 'Dettol', category: 'personal', pack: '200 ml', unit: 'pump', casePack: 12, mrp: 99, cost: 72, gst: 18, shelfLifeDays: 730, perishable: false, abc: 'B', moq: 12, supplierId: 'reckitt', baseDemand: 6 },
  { id: 'whisper-15', name: 'Ultra 15 pads', brand: 'Whisper', category: 'personal', pack: '15 pcs', unit: 'pack', casePack: 12, mrp: 145, cost: 105, gst: 12, shelfLifeDays: 1095, perishable: false, abc: 'B', moq: 12, supplierId: 'hul', baseDemand: 5 },
  { id: 'surf-1', name: 'Surf Excel 1 kg', brand: 'Surf Excel', category: 'household', pack: '1 kg', unit: 'pack', casePack: 12, mrp: 175, cost: 132, gst: 18, shelfLifeDays: 730, perishable: false, abc: 'A', moq: 12, supplierId: 'hul', baseDemand: 8 },
  { id: 'vim-500', name: 'Vim liquid 500 ml', brand: 'Vim', category: 'household', pack: '500 ml', unit: 'bottle', casePack: 12, mrp: 118, cost: 86, gst: 18, shelfLifeDays: 730, perishable: false, abc: 'B', moq: 12, supplierId: 'hul', baseDemand: 6 },
  { id: 'harpic-500', name: 'Harpic 500 ml', brand: 'Harpic', category: 'household', pack: '500 ml', unit: 'bottle', casePack: 12, mrp: 103, cost: 74, gst: 18, shelfLifeDays: 730, perishable: false, abc: 'C', moq: 12, supplierId: 'reckitt', baseDemand: 4 },
  { id: 'onion-1', name: 'Onion 1 kg', brand: 'Sattva Fresh', category: 'produce', pack: '1 kg', unit: 'loose', casePack: 1, mrp: 54, cost: 36, gst: 0, shelfLifeDays: 12, perishable: true, abc: 'A', moq: 10, supplierId: 'fresh', baseDemand: 32 },
  { id: 'tomato-1', name: 'Tomato 1 kg', brand: 'Sattva Fresh', category: 'produce', pack: '1 kg', unit: 'loose', casePack: 1, mrp: 39, cost: 26, gst: 0, shelfLifeDays: 6, perishable: true, abc: 'A', moq: 10, supplierId: 'fresh', baseDemand: 28 },
  { id: 'potato-1', name: 'Potato 1 kg', brand: 'Sattva Fresh', category: 'produce', pack: '1 kg', unit: 'loose', casePack: 1, mrp: 23, cost: 16, gst: 0, shelfLifeDays: 14, perishable: true, abc: 'A', moq: 10, supplierId: 'fresh', baseDemand: 30 },
  { id: 'peas-500', name: 'Green peas 500 g', brand: 'Safal', category: 'frozen', pack: '500 g', unit: 'pack', casePack: 20, mrp: 75, cost: 56, gst: 5, shelfLifeDays: 270, perishable: false, abc: 'C', moq: 20, supplierId: 'fresh', baseDemand: 5 },
  { id: 'oats-400', name: 'Oats 400 g', brand: 'Saffola', category: 'staples', pack: '400 g', unit: 'box', casePack: 12, mrp: 199, cost: 152, gst: 5, shelfLifeDays: 270, perishable: false, abc: 'C', moq: 12, supplierId: 'marico', baseDemand: 5 },
  { id: 'jam-500', name: 'Mixed fruit jam 500 g', brand: 'Kissan', category: 'snacks', pack: '500 g', unit: 'jar', casePack: 12, mrp: 165, cost: 118, gst: 12, shelfLifeDays: 365, perishable: false, abc: 'C', moq: 12, supplierId: 'hul', baseDemand: 3 },
  { id: 'gold-500', name: 'Gold milk 500 ml', brand: 'Amul', category: 'dairy', pack: '500 ml', unit: 'pack', casePack: 20, mrp: 35, cost: 30, gst: 5, shelfLifeDays: 3, perishable: true, abc: 'A', moq: 20, supplierId: 'amul', baseDemand: 32 },
  { id: 'ghee-1', name: 'Ghee 1 L', brand: 'Amul', category: 'dairy', pack: '1 L', unit: 'tin', casePack: 6, mrp: 625, cost: 548, gst: 12, shelfLifeDays: 270, perishable: false, abc: 'B', moq: 6, supplierId: 'amul', baseDemand: 4 },
  { id: 'cheese-200', name: 'Cheese slices 200 g', brand: 'Amul', category: 'dairy', pack: '200 g', unit: 'pack', casePack: 16, mrp: 145, cost: 118, gst: 12, shelfLifeDays: 90, perishable: true, abc: 'B', moq: 16, supplierId: 'amul', baseDemand: 6 },
  { id: 'moong-1', name: 'Moong dal 1 kg', brand: 'Sattva', category: 'staples', pack: '1 kg', unit: 'bag', casePack: 10, mrp: 115, cost: 96, gst: 5, shelfLifeDays: 150, perishable: false, abc: 'A', moq: 10, supplierId: 'fresh', baseDemand: 10 },
  { id: 'urad-1', name: 'Urad dal 1 kg', brand: 'Sattva', category: 'staples', pack: '1 kg', unit: 'bag', casePack: 10, mrp: 125, cost: 105, gst: 5, shelfLifeDays: 150, perishable: false, abc: 'B', moq: 10, supplierId: 'fresh', baseDemand: 7 },
  { id: 'chana-1', name: 'Chana dal 1 kg', brand: 'Sattva', category: 'staples', pack: '1 kg', unit: 'bag', casePack: 10, mrp: 90, cost: 76, gst: 5, shelfLifeDays: 150, perishable: false, abc: 'B', moq: 10, supplierId: 'fresh', baseDemand: 8 },
  { id: 'sona-5', name: 'Sona masoori 5 kg', brand: 'Sattva', category: 'staples', pack: '5 kg', unit: 'bag', casePack: 4, mrp: 285, cost: 238, gst: 5, shelfLifeDays: 180, perishable: false, abc: 'A', moq: 4, supplierId: 'fresh', baseDemand: 16 },
  { id: 'mustard-1', name: 'Mustard oil 1 L', brand: 'Fortune', category: 'staples', pack: '1 L', unit: 'bottle', casePack: 12, mrp: 185, cost: 158, gst: 5, shelfLifeDays: 270, perishable: false, abc: 'A', moq: 12, supplierId: 'marico', baseDemand: 9 },
  { id: 'parachute-500', name: 'Coconut oil 500 ml', brand: 'Parachute', category: 'personal', pack: '500 ml', unit: 'bottle', casePack: 12, mrp: 142, cost: 108, gst: 18, shelfLifeDays: 540, perishable: false, abc: 'B', moq: 12, supplierId: 'marico', baseDemand: 7 },
  { id: 'redlabel-250', name: 'Red Label 250 g', brand: 'Brooke Bond', category: 'beverages', pack: '250 g', unit: 'pack', casePack: 24, mrp: 145, cost: 112, gst: 5, shelfLifeDays: 365, perishable: false, abc: 'B', moq: 24, supplierId: 'hul', baseDemand: 8 },
  { id: 'boost-500', name: 'Boost 500 g', brand: 'Boost', category: 'beverages', pack: '500 g', unit: 'jar', casePack: 12, mrp: 285, cost: 218, gst: 18, shelfLifeDays: 365, perishable: false, abc: 'B', moq: 12, supplierId: 'brit', baseDemand: 5 },
  { id: 'sprite-750', name: 'Sprite 750 ml', brand: 'Sprite', category: 'beverages', pack: '750 ml', unit: 'bottle', casePack: 12, mrp: 40, cost: 28, gst: 28, shelfLifeDays: 180, perishable: false, abc: 'B', moq: 12, supplierId: 'coke', baseDemand: 18 },
  { id: 'thums-750', name: 'Thums Up 750 ml', brand: 'Thums Up', category: 'beverages', pack: '750 ml', unit: 'bottle', casePack: 12, mrp: 40, cost: 28, gst: 28, shelfLifeDays: 180, perishable: false, abc: 'B', moq: 12, supplierId: 'coke', baseDemand: 20 },
  { id: 'maaza-12', name: 'Maaza 1.2 L', brand: 'Maaza', category: 'beverages', pack: '1.2 L', unit: 'bottle', casePack: 6, mrp: 75, cost: 54, gst: 12, shelfLifeDays: 180, perishable: false, abc: 'B', moq: 6, supplierId: 'coke', baseDemand: 11 },
  { id: 'yippee-70', name: 'Yippee 70 g', brand: 'Sunfeast', category: 'snacks', pack: '70 g', unit: 'pack', casePack: 48, mrp: 14, cost: 10, gst: 18, shelfLifeDays: 270, perishable: false, abc: 'A', moq: 48, supplierId: 'itc', baseDemand: 22 },
  { id: 'kurkure-90', name: 'Kurkure 90 g', brand: 'Kurkure', category: 'snacks', pack: '90 g', unit: 'pack', casePack: 36, mrp: 20, cost: 14, gst: 18, shelfLifeDays: 120, perishable: false, abc: 'B', moq: 36, supplierId: 'pepsi', baseDemand: 14 },
  { id: 'oreo-120', name: 'Oreo 120 g', brand: 'Cadbury', category: 'snacks', pack: '120 g', unit: 'pack', casePack: 24, mrp: 40, cost: 28, gst: 18, shelfLifeDays: 180, perishable: false, abc: 'B', moq: 24, supplierId: 'mondelez', baseDemand: 10 },
  { id: 'marie-250', name: 'Marie Gold 250 g', brand: 'Britannia', category: 'snacks', pack: '250 g', unit: 'pack', casePack: 24, mrp: 40, cost: 28, gst: 18, shelfLifeDays: 180, perishable: false, abc: 'A', moq: 24, supplierId: 'brit', baseDemand: 14 },
  { id: 'mtr-idli', name: 'Rava idli 500 g', brand: 'MTR', category: 'staples', pack: '500 g', unit: 'box', casePack: 12, mrp: 95, cost: 72, gst: 5, shelfLifeDays: 180, perishable: false, abc: 'C', moq: 12, supplierId: 'fresh', baseDemand: 6 },
  { id: 'lifebuoy-125', name: 'Lifebuoy 125 g', brand: 'Lifebuoy', category: 'personal', pack: '125 g', unit: 'bar', casePack: 48, mrp: 32, cost: 22, gst: 18, shelfLifeDays: 730, perishable: false, abc: 'A', moq: 48, supplierId: 'hul', baseDemand: 11 },
  { id: 'clinic-175', name: 'Clinic Plus 175 ml', brand: 'Clinic Plus', category: 'personal', pack: '175 ml', unit: 'bottle', casePack: 12, mrp: 92, cost: 68, gst: 18, shelfLifeDays: 730, perishable: false, abc: 'B', moq: 12, supplierId: 'hul', baseDemand: 7 },
  { id: 'ariel-1', name: 'Ariel 1 kg', brand: 'Ariel', category: 'household', pack: '1 kg', unit: 'pack', casePack: 12, mrp: 248, cost: 188, gst: 18, shelfLifeDays: 730, perishable: false, abc: 'B', moq: 12, supplierId: 'fresh', baseDemand: 5 },
  { id: 'lizol-500', name: 'Lizol 500 ml', brand: 'Lizol', category: 'household', pack: '500 ml', unit: 'bottle', casePack: 12, mrp: 108, cost: 78, gst: 18, shelfLifeDays: 730, perishable: false, abc: 'C', moq: 12, supplierId: 'reckitt', baseDemand: 5 },
  { id: 'banana-1', name: 'Banana 1 kg', brand: 'Sattva Fresh', category: 'produce', pack: '1 kg', unit: 'loose', casePack: 1, mrp: 58, cost: 38, gst: 0, shelfLifeDays: 5, perishable: true, abc: 'A', moq: 10, supplierId: 'fresh', baseDemand: 24 },
  { id: 'apple-1', name: 'Apple 1 kg', brand: 'Sattva Fresh', category: 'produce', pack: '1 kg', unit: 'loose', casePack: 1, mrp: 142, cost: 108, gst: 0, shelfLifeDays: 10, perishable: true, abc: 'B', moq: 5, supplierId: 'fresh', baseDemand: 12 },
  { id: 'paratha-400', name: 'Aloo paratha 400 g', brand: 'Safal', category: 'frozen', pack: '400 g', unit: 'pack', casePack: 16, mrp: 95, cost: 72, gst: 5, shelfLifeDays: 180, perishable: false, abc: 'C', moq: 16, supplierId: 'fresh', baseDemand: 6 },
  { id: 'honey-250', name: 'Honey 250 g', brand: 'Dabur', category: 'staples', pack: '250 g', unit: 'jar', casePack: 12, mrp: 145, cost: 108, gst: 5, shelfLifeDays: 540, perishable: false, abc: 'C', moq: 12, supplierId: 'fresh', baseDemand: 4 },
];

export const FESTIVALS: Festival[] = [
  { id: 'onam', name: 'Onam', start: '2026-08-24', end: '2026-08-28', lifts: { staples: 1.25, snacks: 1.2, produce: 1.4, dairy: 1.15 } },
  { id: 'ganesh', name: 'Ganesh Chaturthi', start: '2026-09-12', end: '2026-09-16', lifts: { dairy: 1.55, staples: 1.28, snacks: 1.35, produce: 1.2 } },
  { id: 'navratri', name: 'Navratri', start: '2026-10-11', end: '2026-10-20', lifts: { dairy: 1.35, staples: 1.22, snacks: 1.18, beverages: 1.1 } },
  { id: 'diwali', name: 'Diwali', start: '2026-11-06', end: '2026-11-10', lifts: { snacks: 1.9, household: 1.35, personal: 1.2, beverages: 1.25, dairy: 1.3 } },
];

export const PROMOS: Promo[] = [
  { id: 'p-maggi', skuId: 'maggi-70', name: 'Weekend combo 4+1', start: '2026-09-11', end: '2026-09-14', lift: 1.4 },
  { id: 'p-coke', skuId: 'coke-750', name: '2-for-₹75', start: '2026-09-10', end: '2026-09-17', lift: 1.25 },
  { id: 'p-surf', skuId: 'surf-1', name: '₹20 off', start: '2026-09-08', end: '2026-09-20', lift: 1.18 },
];

export function posKey(skuId: string, storeId: string) {
  return `${skuId}:${storeId}`;
}

export function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
