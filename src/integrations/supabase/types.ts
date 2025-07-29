export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      calendar_events: {
        Row: {
          attendees: Json | null
          case_id: string | null
          client_id: string | null
          created_at: string | null
          description: string | null
          end_time: string
          event_type: string | null
          firm_id: string
          id: string
          is_all_day: boolean | null
          location: string | null
          reminder_minutes: number | null
          start_time: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          attendees?: Json | null
          case_id?: string | null
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          end_time: string
          event_type?: string | null
          firm_id: string
          id?: string
          is_all_day?: boolean | null
          location?: string | null
          reminder_minutes?: number | null
          start_time: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          attendees?: Json | null
          case_id?: string | null
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          end_time?: string
          event_type?: string | null
          firm_id?: string
          id?: string
          is_all_day?: boolean | null
          location?: string | null
          reminder_minutes?: number | null
          start_time?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          actual_end_date: string | null
          case_number: string
          case_type: string
          client_id: string
          court_name: string | null
          created_at: string | null
          description: string | null
          estimated_hours: number | null
          expected_end_date: string | null
          firm_id: string
          hourly_rate: number | null
          id: string
          judge_name: string | null
          opposing_counsel: string | null
          opposing_party: string | null
          priority: string | null
          start_date: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          actual_end_date?: string | null
          case_number: string
          case_type: string
          client_id: string
          court_name?: string | null
          created_at?: string | null
          description?: string | null
          estimated_hours?: number | null
          expected_end_date?: string | null
          firm_id: string
          hourly_rate?: number | null
          id?: string
          judge_name?: string | null
          opposing_counsel?: string | null
          opposing_party?: string | null
          priority?: string | null
          start_date?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          actual_end_date?: string | null
          case_number?: string
          case_type?: string
          client_id?: string
          court_name?: string | null
          created_at?: string | null
          description?: string | null
          estimated_hours?: number | null
          expected_end_date?: string | null
          firm_id?: string
          hourly_rate?: number | null
          id?: string
          judge_name?: string | null
          opposing_counsel?: string | null
          opposing_party?: string | null
          priority?: string | null
          start_date?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          client_type: string | null
          company_name: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          firm_id: string
          first_name: string
          id: string
          id_number: string | null
          last_name: string
          notes: string | null
          phone: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          client_type?: string | null
          company_name?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          firm_id: string
          first_name: string
          id?: string
          id_number?: string | null
          last_name: string
          notes?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          client_type?: string | null
          company_name?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          firm_id?: string
          first_name?: string
          id?: string
          id_number?: string | null
          last_name?: string
          notes?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      communications: {
        Row: {
          attachments: Json | null
          bcc_addresses: string[] | null
          case_id: string | null
          cc_addresses: string[] | null
          client_id: string
          content: string | null
          created_at: string | null
          direction: string
          firm_id: string
          from_address: string | null
          id: string
          metadata: Json | null
          read_at: string | null
          scheduled_at: string | null
          sent_at: string | null
          status: string | null
          subject: string | null
          to_address: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          attachments?: Json | null
          bcc_addresses?: string[] | null
          case_id?: string | null
          cc_addresses?: string[] | null
          client_id: string
          content?: string | null
          created_at?: string | null
          direction: string
          firm_id: string
          from_address?: string | null
          id?: string
          metadata?: Json | null
          read_at?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          to_address?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          attachments?: Json | null
          bcc_addresses?: string[] | null
          case_id?: string | null
          cc_addresses?: string[] | null
          client_id?: string
          content?: string | null
          created_at?: string | null
          direction?: string
          firm_id?: string
          from_address?: string | null
          id?: string
          metadata?: Json | null
          read_at?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          to_address?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communications_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          address: string | null
          company: string | null
          contact_type: string | null
          created_at: string | null
          email: string | null
          firm_id: string
          first_name: string
          id: string
          last_name: string
          notes: string | null
          phone: string | null
          position: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          company?: string | null
          contact_type?: string | null
          created_at?: string | null
          email?: string | null
          firm_id: string
          first_name: string
          id?: string
          last_name: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          company?: string | null
          contact_type?: string | null
          created_at?: string | null
          email?: string | null
          firm_id?: string
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          case_id: string | null
          client_id: string | null
          confidentiality_level: string | null
          created_at: string | null
          description: string | null
          file_path: string | null
          file_size: number | null
          file_type: string | null
          firm_id: string
          id: string
          is_template: boolean | null
          name: string
          tags: string[] | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          case_id?: string | null
          client_id?: string | null
          confidentiality_level?: string | null
          created_at?: string | null
          description?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          firm_id: string
          id?: string
          is_template?: boolean | null
          name: string
          tags?: string[] | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          case_id?: string | null
          client_id?: string | null
          confidentiality_level?: string | null
          created_at?: string | null
          description?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          firm_id?: string
          id?: string
          is_template?: boolean | null
          name?: string
          tags?: string[] | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string | null
          description: string
          id: string
          invoice_id: string
          quantity: number | null
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          invoice_id: string
          quantity?: number | null
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          case_id: string | null
          client_id: string
          created_at: string | null
          currency: string | null
          description: string | null
          due_date: string | null
          firm_id: string
          id: string
          invoice_number: string
          issued_date: string | null
          notes: string | null
          paid_date: string | null
          payment_method: string | null
          payment_reference: string | null
          status: string | null
          subtotal: number
          tax_amount: number | null
          tax_rate: number | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          case_id?: string | null
          client_id: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          due_date?: string | null
          firm_id: string
          id?: string
          invoice_number: string
          issued_date?: string | null
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          status?: string | null
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          case_id?: string | null
          client_id?: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          due_date?: string | null
          firm_id?: string
          id?: string
          invoice_number?: string
          issued_date?: string | null
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          status?: string | null
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          case_id: string | null
          channel: string
          created_at: string | null
          firm_id: string
          id: string
          message: string
          metadata: Json | null
          recipient: string
          scheduled_at: string | null
          sent_at: string | null
          status: string | null
          title: string
          type: string
        }
        Insert: {
          case_id?: string | null
          channel: string
          created_at?: string | null
          firm_id: string
          id?: string
          message: string
          metadata?: Json | null
          recipient: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          title: string
          type: string
        }
        Update: {
          case_id?: string | null
          channel?: string
          created_at?: string | null
          firm_id?: string
          id?: string
          message?: string
          metadata?: Json | null
          recipient?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          callback_url: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          external_reference: string | null
          firm_id: string
          id: string
          invoice_id: string | null
          metadata: Json | null
          payer_name: string | null
          payment_method: string
          phone_number: string | null
          processed_at: string | null
          return_url: string | null
          status: string | null
          subscription_id: string | null
          transaction_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          callback_url?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          external_reference?: string | null
          firm_id: string
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          payer_name?: string | null
          payment_method: string
          phone_number?: string | null
          processed_at?: string | null
          return_url?: string | null
          status?: string | null
          subscription_id?: string | null
          transaction_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          callback_url?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          external_reference?: string | null
          firm_id?: string
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          payer_name?: string | null
          payment_method?: string
          phone_number?: string | null
          processed_at?: string | null
          return_url?: string | null
          status?: string | null
          subscription_id?: string | null
          transaction_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          firm_name: string
          id: string
          phone: string | null
          subscription_expires_at: string | null
          subscription_plan: string | null
          subscription_started_at: string | null
          subscription_status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          firm_name: string
          id: string
          phone?: string | null
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          subscription_started_at?: string | null
          subscription_status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          firm_name?: string
          id?: string
          phone?: string | null
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          subscription_started_at?: string | null
          subscription_status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscription_payments: {
        Row: {
          amount: number
          billing_period: string | null
          created_at: string | null
          currency: string | null
          firm_id: string
          id: string
          paid_at: string | null
          period_end: string
          period_start: string
          plan_name: string
          status: string | null
          transaction_id: string | null
        }
        Insert: {
          amount: number
          billing_period?: string | null
          created_at?: string | null
          currency?: string | null
          firm_id: string
          id?: string
          paid_at?: string | null
          period_end: string
          period_start: string
          plan_name: string
          status?: string | null
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          billing_period?: string | null
          created_at?: string | null
          currency?: string | null
          firm_id?: string
          id?: string
          paid_at?: string | null
          period_end?: string
          period_start?: string
          plan_name?: string
          status?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          billable_amount: number | null
          case_id: string
          created_at: string | null
          description: string
          duration_minutes: number | null
          end_time: string | null
          firm_id: string
          hourly_rate: number | null
          id: string
          invoice_id: string | null
          is_billable: boolean | null
          start_time: string
          updated_at: string | null
        }
        Insert: {
          billable_amount?: number | null
          case_id: string
          created_at?: string | null
          description: string
          duration_minutes?: number | null
          end_time?: string | null
          firm_id: string
          hourly_rate?: number | null
          id?: string
          invoice_id?: string | null
          is_billable?: boolean | null
          start_time: string
          updated_at?: string | null
        }
        Update: {
          billable_amount?: number | null
          case_id?: string
          created_at?: string | null
          description?: string
          duration_minutes?: number | null
          end_time?: string | null
          firm_id?: string
          hourly_rate?: number | null
          id?: string
          invoice_id?: string | null
          is_billable?: boolean | null
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
