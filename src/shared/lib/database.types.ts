export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.17';
  };
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
          id: string;
          instructions: string;
          is_active: boolean;
          name: string;
        };
        Insert: {
          cook_time_minutes: number;
          created_at?: string;
          cuisine_type: string;
          id?: string;
          instructions: string;
          is_active?: boolean;
          name: string;
        };
        Update: {
          cook_time_minutes?: number;
          created_at?: string;
          cuisine_type?: string;
          id?: string;
          instructions?: string;
          is_active?: boolean;
          name?: string;
        };
        Relationships: [];
      };
      meal_history: {
        Row: {
          dinner_id: string;
          id: string;
          week_start_date: string;
          weekly_plan_id: string;
        };
        Insert: {
          dinner_id: string;
          id?: string;
          week_start_date: string;
          weekly_plan_id: string;
        };
        Update: {
          dinner_id?: string;
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
            foreignKeyName: 'meal_history_weekly_plan_id_fkey';
            columns: ['weekly_plan_id'];
            isOneToOne: false;
            referencedRelation: 'weekly_plans';
            referencedColumns: ['id'];
          },
        ];
      };
      tags: {
        Row: {
          id: string;
          name: string;
        };
        Insert: {
          id?: string;
          name: string;
        };
        Update: {
          id?: string;
          name?: string;
        };
        Relationships: [];
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
          id: string;
          locked_at: string | null;
          start_date: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          locked_at?: string | null;
          start_date: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          locked_at?: string | null;
          start_date?: string;
        };
        Relationships: [];
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
      lock_weekly_plan: {
        Args: { p_plan_id: string };
        Returns: {
          created_at: string;
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
