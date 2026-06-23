export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          age: number | null
          approved_at: string | null
          city: string | null
          class_level: string | null
          created_at: string
          department: string | null
          education_level: string | null
          email: string
          freelanced_before: string | null
          freelancing_interest: string | null
          full_name: string
          gender: string | null
          graduation_year: string | null
          heard_about_bootcamp: string | null
          heard_about_other: string | null
          id: string
          institution: string | null
          invited_by: string | null
          level: string | null
          motivation: string | null
          participation_format: string
          physical_address: string | null
          rejected_at: string | null
          school_name: string | null
          state: string | null
          status: string
          study_track: string | null
          whatsapp: string
        }
        Insert: {
          age?: number | null
          approved_at?: string | null
          city?: string | null
          class_level?: string | null
          created_at?: string
          department?: string | null
          education_level?: string | null
          email: string
          freelanced_before?: string | null
          freelancing_interest?: string | null
          full_name: string
          gender?: string | null
          graduation_year?: string | null
          heard_about_bootcamp?: string | null
          heard_about_other?: string | null
          id?: string
          institution?: string | null
          invited_by?: string | null
          level?: string | null
          motivation?: string | null
          participation_format: string
          physical_address?: string | null
          rejected_at?: string | null
          school_name?: string | null
          state?: string | null
          status?: string
          study_track?: string | null
          whatsapp: string
        }
        Update: {
          age?: number | null
          approved_at?: string | null
          city?: string | null
          class_level?: string | null
          created_at?: string
          department?: string | null
          education_level?: string | null
          email?: string
          freelanced_before?: string | null
          freelancing_interest?: string | null
          full_name?: string
          gender?: string | null
          graduation_year?: string | null
          heard_about_bootcamp?: string | null
          heard_about_other?: string | null
          id?: string
          institution?: string | null
          invited_by?: string | null
          level?: string | null
          motivation?: string | null
          participation_format?: string
          physical_address?: string | null
          rejected_at?: string | null
          school_name?: string | null
          state?: string | null
          status?: string
          study_track?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          application_id: string | null
          email_type: string
          error: string | null
          id: string
          sent_at: string
          status: string
        }
        Insert: {
          application_id?: string | null
          email_type: string
          error?: string | null
          id?: string
          sent_at?: string
          status: string
        }
        Update: {
          application_id?: string | null
          email_type?: string
          error?: string | null
          id?: string
          sent_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          bootcamp_name: string
          created_at: string
          daily_time: string
          end_date: string | null
          id: string
          max_participants: number
          registration_status: string
          start_date: string | null
          updated_at: string
          venue_address: string
          whatsapp_group_link: string
        }
        Insert: {
          bootcamp_name?: string
          created_at?: string
          daily_time?: string
          end_date?: string | null
          id?: string
          max_participants?: number
          registration_status?: string
          start_date?: string | null
          updated_at?: string
          venue_address?: string
          whatsapp_group_link?: string
        }
        Update: {
          bootcamp_name?: string
          created_at?: string
          daily_time?: string
          end_date?: string | null
          id?: string
          max_participants?: number
          registration_status?: string
          start_date?: string | null
          updated_at?: string
          venue_address?: string
          whatsapp_group_link?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_application_counts: {
        Args: never
        Returns: {
          approved: number
          total: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin"],
    },
  },
} as const
