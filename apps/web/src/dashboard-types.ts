export interface WorkRecord {
  id: string;
  title: string;
  customer_name: string;
  customer_id: string;
  status: string;
  created_at: number;
  updated_at: number;
  evidence_count: number;
  category: string;
  agreement: null | {
    total: string;
    currency: string;
    decision: string;
    version: number;
  };
}
export interface Transaction {
  id: string;
  job_id: string;
  job_title: string;
  customer_name: string;
  amount: string;
  currency: string;
  method: string;
  reference: string;
  paid_at: number;
  self_reported: true;
}
export interface Finance {
  currency: string;
  currencies: string[];
  self_reported: true;
  collected: string;
  outstanding: string;
  agreed: string;
  completion_rate: string | null;
  period_collected: string;
  period_count: number;
  days: number;
  grain: "day" | "week" | "month";
  series: { date: string; amount: string }[];
}
export interface AttentionItem {
  job_id: string;
  title: string;
  customer_name: string;
  status: string;
  kind: string;
  amount: string;
  currency: string;
  valid_until: number | null;
}
export interface DashboardData {
  total: number;
  active: number;
  pending_approvals: number;
  distribution: Record<string, number>;
  recent_jobs: WorkRecord[];
  attention: AttentionItem[];
  attention_count: number;
  finance: Finance;
  transactions: {
    items: Transaction[];
    total: number;
    page: number;
    size: number;
  };
  activities: {
    id: string;
    kind: string;
    actor: string;
    created_at: number;
    job_id: string;
    job_title: string;
    notes: string;
  }[];
  active_customers: number;
  recent_customers: {
    id: string;
    name: string;
    jobs: number;
    active: number;
    pending: number;
  }[];
  onboarding: { customer: boolean; job: boolean; agreement: boolean };
}
