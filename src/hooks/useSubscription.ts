export interface SubscriptionData {
  id?: string;
  planName: string;
  monthlyAmount: number;
  currency: string;
  dueDay: number;
  gracePeriodDays: number;
  status: 'active' | 'past_due' | 'blocked';
  currentPeriodDue: string;
  lastPaymentDate: string | null;
  pixCode: string;
  pixQrUrl: string;
  stripePaymentLink: string;
  isManuallyOverridden: boolean;
  notes?: string;
  updatedAt?: string;
}

export interface SubscriptionStatusInfo {
  status: 'active' | 'past_due' | 'blocked';
  isBlocked: boolean;
  isGracePeriod: boolean;
  daysOverdue: number;
  deadlineDateStr: string;
}

export interface InvoiceHistory {
  id: string;
  month: string;
  dueDate: string;
  paidDate: string;
  amount: number;
  method: string;
  status: 'pago' | 'pendente' | 'cancelado';
}

export function useSubscription() {
  const defaultSubscription: SubscriptionData = {
    planName: 'Mais Açaí Gestão Exclusiva',
    monthlyAmount: 0,
    currency: 'BRL',
    dueDay: 1,
    gracePeriodDays: 999,
    status: 'active',
    currentPeriodDue: '2099-12-31',
    lastPaymentDate: new Date().toISOString(),
    pixCode: '',
    pixQrUrl: '',
    stripePaymentLink: '',
    isManuallyOverridden: true,
    notes: 'Licença permanente própria da loja Mais Açaí SJP.'
  };

  const statusInfo: SubscriptionStatusInfo = {
    status: 'active',
    isBlocked: false,
    isGracePeriod: false,
    daysOverdue: 0,
    deadlineDateStr: ''
  };

  return {
    subscription: defaultSubscription,
    invoices: [],
    loading: false,
    statusInfo,
    confirmPayment: async () => {},
    updateSubscription: async () => {},
    simulateState: () => {},
    refreshSubscription: async () => {}
  };
}
