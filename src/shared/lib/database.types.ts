export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      ai_call_counter: {
        Row: {
          day: string;
          household_id: string;
          n: number;
        };
        Insert: {
          day: string;
          household_id: string;
          n?: number;
        };
        Update: {
          day?: string;
          household_id?: string;
          n?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'ai_call_counter_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
      };
      ai_usage_log: {
        Row: {
          created_at: string;
          error_code: string | null;
          est_cost_usd: number | null;
          feature: string;
          household_id: string;
          id: string;
          input_tokens: number | null;
          latency_ms: number | null;
          model: string;
          ok: boolean;
          output_tokens: number | null;
          profile_id: string | null;
        };
        Insert: {
          created_at?: string;
          error_code?: string | null;
          est_cost_usd?: number | null;
          feature: string;
          household_id: string;
          id?: string;
          input_tokens?: number | null;
          latency_ms?: number | null;
          model: string;
          ok: boolean;
          output_tokens?: number | null;
          profile_id?: string | null;
        };
        Update: {
          created_at?: string;
          error_code?: string | null;
          est_cost_usd?: number | null;
          feature?: string;
          household_id?: string;
          id?: string;
          input_tokens?: number | null;
          latency_ms?: number | null;
          model?: string;
          ok?: boolean;
          output_tokens?: number | null;
          profile_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'ai_usage_log_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ai_usage_log_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      category_row_assignments: {
        Row: {
          category: string;
          household_id: string;
          row_id: string;
        };
        Insert: {
          category: string;
          household_id?: string;
          row_id: string;
        };
        Update: {
          category?: string;
          household_id?: string;
          row_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'category_row_assignments_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'category_row_assignments_row_id_fkey';
            columns: ['row_id'];
            isOneToOne: false;
            referencedRelation: 'grocery_store_rows';
            referencedColumns: ['id'];
          },
        ];
      };
      dinner_ingredients: {
        Row: {
          category: string;
          dinner_id: string;
          id: string;
          name: string;
          quantity: number;
          unit: string;
        };
        Insert: {
          category: string;
          dinner_id: string;
          id?: string;
          name: string;
          quantity: number;
          unit: string;
        };
        Update: {
          category?: string;
          dinner_id?: string;
          id?: string;
          name?: string;
          quantity?: number;
          unit?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'dinner_ingredients_dinner_id_fkey';
            columns: ['dinner_id'];
            isOneToOne: false;
            referencedRelation: 'dinner_last_chosen';
            referencedColumns: ['dinner_id'];
          },
          {
            foreignKeyName: 'dinner_ingredients_dinner_id_fkey';
            columns: ['dinner_id'];
            isOneToOne: false;
            referencedRelation: 'dinners';
            referencedColumns: ['id'];
          },
        ];
      };
      dinner_steps: {
        Row: {
          dinner_id: string;
          id: string;
          instruction: string;
          step_number: number;
        };
        Insert: {
          dinner_id: string;
          id?: string;
          instruction: string;
          step_number: number;
        };
        Update: {
          dinner_id?: string;
          id?: string;
          instruction?: string;
          step_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'dinner_steps_dinner_id_fkey';
            columns: ['dinner_id'];
            isOneToOne: false;
            referencedRelation: 'dinner_last_chosen';
            referencedColumns: ['dinner_id'];
          },
          {
            foreignKeyName: 'dinner_steps_dinner_id_fkey';
            columns: ['dinner_id'];
            isOneToOne: false;
            referencedRelation: 'dinners';
            referencedColumns: ['id'];
          },
        ];
      };
      dinner_tags: {
        Row: {
          dinner_id: string;
          tag_id: string;
        };
        Insert: {
          dinner_id: string;
          tag_id: string;
        };
        Update: {
          dinner_id?: string;
          tag_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'dinner_tags_dinner_id_fkey';
            columns: ['dinner_id'];
            isOneToOne: false;
            referencedRelation: 'dinner_last_chosen';
            referencedColumns: ['dinner_id'];
          },
          {
            foreignKeyName: 'dinner_tags_dinner_id_fkey';
            columns: ['dinner_id'];
            isOneToOne: false;
            referencedRelation: 'dinners';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'dinner_tags_tag_id_fkey';
            columns: ['tag_id'];
            isOneToOne: false;
            referencedRelation: 'tags';
            referencedColumns: ['id'];
          },
        ];
      };
      dinners: {
        Row: {
          cook_time_minutes: number;
          created_at: string;
          cuisine_type: string;
          household_id: string;
          id: string;
          instructions: string;
          is_active: boolean;
          name: string;
        };
        Insert: {
          cook_time_minutes: number;
          created_at?: string;
          cuisine_type: string;
          household_id?: string;
          id?: string;
          instructions: string;
          is_active?: boolean;
          name: string;
        };
        Update: {
          cook_time_minutes?: number;
          created_at?: string;
          cuisine_type?: string;
          household_id?: string;
          id?: string;
          instructions?: string;
          is_active?: boolean;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'dinners_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
      };
      grocery_store_rows: {
        Row: {
          household_id: string;
          id: string;
          name: string;
          position: number;
        };
        Insert: {
          household_id?: string;
          id?: string;
          name: string;
          position: number;
        };
        Update: {
          household_id?: string;
          id?: string;
          name?: string;
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'grocery_store_rows_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
      };
      household_ai_config: {
        Row: {
          daily_call_limit: number;
          household_id: string;
          key_secret_id: string | null;
          model_override: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          daily_call_limit?: number;
          household_id: string;
          key_secret_id?: string | null;
          model_override?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          daily_call_limit?: number;
          household_id?: string;
          key_secret_id?: string | null;
          model_override?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'household_ai_config_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: true;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'household_ai_config_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      household_invites: {
        Row: {
          created_at: string;
          email: string;
          household_id: string;
          id: string;
          invited_by: string | null;
          status: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          household_id: string;
          id?: string;
          invited_by?: string | null;
          status?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          household_id?: string;
          id?: string;
          invited_by?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'household_invites_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'household_invites_invited_by_fkey';
            columns: ['invited_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      household_members: {
        Row: {
          created_at: string;
          household_id: string;
          profile_id: string;
          role: string;
        };
        Insert: {
          created_at?: string;
          household_id: string;
          profile_id: string;
          role: string;
        };
        Update: {
          created_at?: string;
          household_id?: string;
          profile_id?: string;
          role?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'household_members_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'household_members_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      households: {
        Row: {
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      meal_history: {
        Row: {
          dinner_id: string;
          household_id: string;
          id: string;
          week_start_date: string;
          weekly_plan_id: string;
        };
        Insert: {
          dinner_id: string;
          household_id?: string;
          id?: string;
          week_start_date: string;
          weekly_plan_id: string;
        };
        Update: {
          dinner_id?: string;
          household_id?: string;
          id?: string;
          week_start_date?: string;
          weekly_plan_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'meal_history_dinner_id_fkey';
            columns: ['dinner_id'];
            isOneToOne: false;
            referencedRelation: 'dinner_last_chosen';
            referencedColumns: ['dinner_id'];
          },
          {
            foreignKeyName: 'meal_history_dinner_id_fkey';
            columns: ['dinner_id'];
            isOneToOne: false;
            referencedRelation: 'dinners';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'meal_history_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'meal_history_weekly_plan_id_fkey';
            columns: ['weekly_plan_id'];
            isOneToOne: false;
            referencedRelation: 'weekly_plans';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          id: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          id: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          id?: string;
        };
        Relationships: [];
      };
      tags: {
        Row: {
          household_id: string;
          id: string;
          name: string;
        };
        Insert: {
          household_id?: string;
          id?: string;
          name: string;
        };
        Update: {
          household_id?: string;
          id?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tags_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
      };
      weekly_plan_selections: {
        Row: {
          dinner_id: string;
          id: string;
          weekly_plan_id: string;
        };
        Insert: {
          dinner_id: string;
          id?: string;
          weekly_plan_id: string;
        };
        Update: {
          dinner_id?: string;
          id?: string;
          weekly_plan_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'weekly_plan_selections_dinner_id_fkey';
            columns: ['dinner_id'];
            isOneToOne: false;
            referencedRelation: 'dinner_last_chosen';
            referencedColumns: ['dinner_id'];
          },
          {
            foreignKeyName: 'weekly_plan_selections_dinner_id_fkey';
            columns: ['dinner_id'];
            isOneToOne: false;
            referencedRelation: 'dinners';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'weekly_plan_selections_weekly_plan_id_fkey';
            columns: ['weekly_plan_id'];
            isOneToOne: false;
            referencedRelation: 'weekly_plans';
            referencedColumns: ['id'];
          },
        ];
      };
      weekly_plans: {
        Row: {
          created_at: string;
          household_id: string;
          id: string;
          locked_at: string | null;
          start_date: string;
        };
        Insert: {
          created_at?: string;
          household_id?: string;
          id?: string;
          locked_at?: string | null;
          start_date: string;
        };
        Update: {
          created_at?: string;
          household_id?: string;
          id?: string;
          locked_at?: string | null;
          start_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'weekly_plans_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      dinner_last_chosen: {
        Row: {
          dinner_id: string | null;
          last_chosen_date: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      clear_household_ai_key: { Args: never; Returns: undefined };
      current_user_household_id: { Args: never; Returns: string };
      lock_weekly_plan: {
        Args: { p_plan_id: string };
        Returns: {
          created_at: string;
          household_id: string;
          id: string;
          locked_at: string | null;
          start_date: string;
        };
        SetofOptions: {
          from: '*';
          to: 'weekly_plans';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      reorder_grocery_store_row: {
        Args: { p_new_position: number; p_row_id: string };
        Returns: {
          household_id: string;
          id: string;
          name: string;
          position: number;
        }[];
        SetofOptions: {
          from: '*';
          to: 'grocery_store_rows';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      reserve_ai_call: {
        Args: { p_household_id: string; p_limit: number };
        Returns: number;
      };
      resolve_ai_key: { Args: { p_household_id: string }; Returns: string };
      seed_default_household_catalog: {
        Args: { p_household_id: string };
        Returns: undefined;
      };
      set_ai_daily_call_limit: { Args: { p_limit: number }; Returns: undefined };
      set_ai_model_override: { Args: { p_model: string }; Returns: undefined };
      set_household_ai_key: { Args: { p_key: string }; Returns: undefined };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    keyof (DefaultSchema['Tables'] & DefaultSchema['Views']) | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
