export type UserRole = "ADMIN" | "CLIENT";
export type ClientStatus = "ACTIVE" | "INACTIVE";
export type HostingStatus = "ACTIVE" | "INACTIVE";
export type StoredSubscriptionStatus = "ACTIVE" | "CANCELLED";
export type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "VOID";
export type PaymentStatus =
  | "PENDING"
  | "PENDING_VERIFICATION"
  | "PAID"
  | "REJECTED";
export type PaymentMethod = "BANK_TRANSFER";
export type BillingInterval = "YEARLY";
export type CurrencyCode = "SGD" | "THB";

export type Profile = {
  id: string;
  role: UserRole;
  display_name: string;
  created_at: string;
  updated_at: string;
};

export type Client = {
  id: string;
  business_name: string;
  billing_name: string;
  billing_address: string | null;
  country: string | null;
  default_currency: CurrencyCode;
  status: ClientStatus;
  remarks: string | null;
  created_at: string;
  updated_at: string;
};

export type ClientContact = {
  id: string;
  client_id: string;
  name: string;
  email: string;
  phone: string | null;
  is_primary: boolean;
  receive_invoice: boolean;
  receive_reminder: boolean;
  created_at: string;
  updated_at: string;
};

export type HostingService = {
  id: string;
  client_id: string;
  name: string;
  hosting_type: string;
  project_url: string | null;
  status: HostingStatus;
  remarks: string | null;
  created_at: string;
  updated_at: string;
};

export type Subscription = {
  id: string;
  client_id: string;
  hosting_service_id: string;
  billing_interval: BillingInterval;
  quantity: number;
  unit_price: string;
  currency: CurrencyCode;
  start_date: string;
  current_period_start: string;
  current_period_end: string;
  status: StoredSubscriptionStatus;
  created_at: string;
  updated_at: string;
};

export type Invoice = {
  id: string;
  client_id: string;
  subscription_id: string;
  invoice_number: string;
  provider: string;
  external_invoice_id: string | null;
  issue_date: string;
  due_date: string;
  currency: CurrencyCode;
  subtotal: string;
  total: string;
  status: InvoiceStatus;
  invoice_url: string | null;
  created_at: string;
  updated_at: string;
};

export type InvoiceItem = {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: string;
  amount: string;
  created_at: string;
};

export type Payment = {
  id: string;
  invoice_id: string;
  client_id: string;
  payment_method: PaymentMethod;
  amount: string;
  currency: CurrencyCode;
  status: PaymentStatus;
  receipt_file_url: string | null;
  submitted_at: string | null;
  verified_at: string | null;
  verified_by: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & Pick<Profile, "id" | "role" | "display_name">;
        Update: Partial<Profile>;
        Relationships: [];
      };
      clients: {
        Row: Client;
        Insert: Partial<Client> & Pick<Client, "business_name" | "billing_name">;
        Update: Partial<Client>;
        Relationships: [];
      };
      client_contacts: {
        Row: ClientContact;
        Insert: Partial<ClientContact> &
          Pick<ClientContact, "client_id" | "name" | "email">;
        Update: Partial<ClientContact>;
        Relationships: [];
      };
      client_users: {
        Row: {
          id: string;
          user_id: string;
          client_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          client_id: string;
        };
        Update: Partial<{ user_id: string; client_id: string }>;
        Relationships: [];
      };
      hosting_services: {
        Row: HostingService;
        Insert: Partial<HostingService> &
          Pick<HostingService, "client_id" | "name" | "hosting_type">;
        Update: Partial<HostingService>;
        Relationships: [];
      };
      subscriptions: {
        Row: Subscription;
        Insert: Partial<Subscription> &
          Pick<
            Subscription,
            | "client_id"
            | "hosting_service_id"
            | "quantity"
            | "unit_price"
            | "currency"
            | "start_date"
            | "current_period_start"
            | "current_period_end"
          >;
        Update: Partial<Subscription>;
        Relationships: [];
      };
      invoices: {
        Row: Invoice;
        Insert: Partial<Invoice> &
          Pick<
            Invoice,
            | "client_id"
            | "subscription_id"
            | "invoice_number"
            | "provider"
            | "issue_date"
            | "due_date"
            | "currency"
            | "subtotal"
            | "total"
          >;
        Update: Partial<Invoice>;
        Relationships: [];
      };
      invoice_items: {
        Row: InvoiceItem;
        Insert: Partial<InvoiceItem> &
          Pick<
            InvoiceItem,
            "invoice_id" | "description" | "quantity" | "unit_price" | "amount"
          >;
        Update: Partial<InvoiceItem>;
        Relationships: [];
      };
      payments: {
        Row: Payment;
        Insert: Partial<Payment> &
          Pick<Payment, "invoice_id" | "client_id" | "amount" | "currency">;
        Update: Partial<Payment>;
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_user_id: string | null;
          entity_type: string;
          entity_id: string;
          action: string;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          actor_user_id?: string | null;
          entity_type: string;
          entity_id: string;
          action: string;
          metadata?: Record<string, unknown>;
        };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      allocate_invoice_number: { Args: Record<string, never>; Returns: string };
      confirm_bank_transfer_payment: {
        Args: { p_payment_id: string };
        Returns: undefined;
      };
      reject_bank_transfer_payment: {
        Args: { p_payment_id: string; p_reason: string };
        Returns: undefined;
      };
    };
    Enums: {
      user_role: UserRole;
      client_status: ClientStatus;
      hosting_status: HostingStatus;
      subscription_status: StoredSubscriptionStatus;
      invoice_status: InvoiceStatus;
      payment_status: PaymentStatus;
      payment_method: PaymentMethod;
      billing_interval: BillingInterval;
      currency_code: CurrencyCode;
    };
    CompositeTypes: Record<string, never>;
  };
};
