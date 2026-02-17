
export enum AppView {
  DASHBOARD = 'DASHBOARD',
  TRIPS = 'TRIPS',
  EXPENSES = 'EXPENSES',
  CALCULATOR = 'CALCULATOR',
  VEHICLES = 'VEHICLES',
  MAINTENANCE = 'MAINTENANCE',
  JORNADA = 'JORNADA',
  STATIONS = 'STATIONS',
  ADMIN = 'ADMIN'
}

export enum TripStatus {
  SCHEDULED = 'Agendada',
  IN_PROGRESS = 'Em Andamento',
  COMPLETED = 'Concluída',
  CANCELLED = 'Cancelada'
}

export interface Vehicle {
  id: string;
  plate: string;
  model: string;
  year: number;
  current_km: number;
  axles: number;
  cargo_type: string;
  user_id?: string;
}

export interface RoadService {
  id: string;
  name: string;
  type: 'stations' | 'tire_repair' | 'mechanic' | 'restaurants' | 'store';
  description: string;
  location_url: string;
  phone: string;
  address: string;
  created_at?: string;
}

export interface MaintenanceItem {
  id: string;
  vehicle_id: string;
  part_name: string;
  km_at_purchase: number;
  warranty_months: number;
  warranty_km: number;
  purchase_date: string;
  cost: number;
  user_id?: string;
}

export interface TripStop {
  city: string;
  state: string;
}

export interface Trip {
  id: string;
  description?: string;
  origin: string;
  destination: string;
  stops?: TripStop[]; 
  distance_km: number;
  agreed_price: number;
  driver_commission_percentage: number;
  driver_commission: number;
  cargo_type: string;
  date: string;
  status: TripStatus;
  notes?: string;
  vehicle_id?: string;
  user_id?: string;
}

export enum ExpenseCategory {
  FUEL = 'Combustível',
  TOLL = 'Pedágio',
  MAINTENANCE = 'Manutenção',
  FOOD = 'Alimentação',
  LODGING = 'Hospedagem',
  TIRE_REPAIR = 'Borracharia',
  FINANCING = 'Financiamento',
  INSURANCE = 'Seguro',
  TRACKER = 'Rastreador',
  SUBSCRIPTION = 'Assinatura',
  OTHER = 'Outros'
}

export interface Expense {
  id: string;
  trip_id?: string;
  vehicle_id?: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  due_date?: string;
  user_id?: string;
  is_paid?: boolean;
  installments_total?: number;
  installment_number?: number;
}

export interface FinancialSummary {
  totalRevenue: number;
  totalTripExpenses: number;
  totalFixedExpenses: number;
  totalCommissions: number;
  netProfit: number;
  tripCount: number;
  profitMargin: number;
  pendingToPay: number;
  totalDistance: number;
}

export interface ANTTParams {
  distance: number;
  axles: number;
  cargoType: string;
  isComposition?: boolean;
  isHighPerformance?: boolean;
  returnEmpty: boolean;
  tollCost?: number;
  otherCosts?: number;
}

export interface JornadaLog {
  id: string;
  user_id?: string;
  start_time: string;
  end_time?: string;
  duration_seconds: number;
  type: string;
  date: string;
}

export interface DbNotification {
  id: string;
  title: string;
  message: string;
  type: 'URGENT' | 'WARNING' | 'INFO';
  category: 'JORNADA' | 'MAINTENANCE' | 'FINANCE' | 'TRIP' | 'GENERAL';
  target_user_email?: string; // se nulo, envia para todos
  created_at: string;
}

export interface UserLocation {
  user_id: string;
  email: string;
  latitude: number;
  longitude: number;
  updated_at: string;
}
