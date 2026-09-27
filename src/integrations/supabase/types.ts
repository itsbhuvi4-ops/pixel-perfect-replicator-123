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
      ambassadors: {
        Row: {
          ambassador_name: string
          created_at: string
          discord: string | null
          id: string
          info: string | null
          photo_url: string | null
          remaining_points: number
          starting_points: number
          team_name: string
          user_id: string
        }
        Insert: {
          ambassador_name: string
          created_at?: string
          discord?: string | null
          id?: string
          info?: string | null
          photo_url?: string | null
          remaining_points?: number
          starting_points?: number
          team_name: string
          user_id: string
        }
        Update: {
          ambassador_name?: string
          created_at?: string
          discord?: string | null
          id?: string
          info?: string | null
          photo_url?: string | null
          remaining_points?: number
          starting_points?: number
          team_name?: string
          user_id?: string
        }
        Relationships: []
      }
      auction_events: {
        Row: {
          ambassador_id: string | null
          amount: number | null
          created_at: string
          event_type: string
          id: string
          message: string
          player_id: string | null
        }
        Insert: {
          ambassador_id?: string | null
          amount?: number | null
          created_at?: string
          event_type: string
          id?: string
          message: string
          player_id?: string | null
        }
        Update: {
          ambassador_id?: string | null
          amount?: number | null
          created_at?: string
          event_type?: string
          id?: string
          message?: string
          player_id?: string | null
        }
        Relationships: []
      }
      auction_state: {
        Row: {
          base_price: number
          caster_stream_url: string | null
          current_bid: number | null
          current_bidder_id: string | null
          current_player_id: string | null
          id: number
          lot_counter: number
          max_ambassadors: number
          max_casters: number
          max_players: number
          min_increment: number
          status: Database["public"]["Enums"]["auction_status"]
          tournament_name: string
          updated_at: string
        }
        Insert: {
          base_price?: number
          caster_stream_url?: string | null
          current_bid?: number | null
          current_bidder_id?: string | null
          current_player_id?: string | null
          id?: number
          lot_counter?: number
          max_ambassadors?: number
          max_casters?: number
          max_players?: number
          min_increment?: number
          status?: Database["public"]["Enums"]["auction_status"]
          tournament_name?: string
          updated_at?: string
        }
        Update: {
          base_price?: number
          caster_stream_url?: string | null
          current_bid?: number | null
          current_bidder_id?: string | null
          current_player_id?: string | null
          id?: number
          lot_counter?: number
          max_ambassadors?: number
          max_casters?: number
          max_players?: number
          min_increment?: number
          status?: Database["public"]["Enums"]["auction_status"]
          tournament_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "auction_state_current_bidder_id_fkey"
            columns: ["current_bidder_id"]
            isOneToOne: false
            referencedRelation: "ambassadors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_state_current_player_id_fkey"
            columns: ["current_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      bids: {
        Row: {
          ambassador_id: string
          amount: number
          created_at: string
          id: string
          player_id: string
        }
        Insert: {
          ambassador_id: string
          amount: number
          created_at?: string
          id?: string
          player_id: string
        }
        Update: {
          ambassador_id?: string
          amount?: number
          created_at?: string
          id?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bids_ambassador_id_fkey"
            columns: ["ambassador_id"]
            isOneToOne: false
            referencedRelation: "ambassadors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          ambassador_id: string | null
          created_at: string
          game_id: string
          id: string
          info: string | null
          ingame_name: string
          lot_number: number | null
          photo_url: string | null
          player_name: string
          primary_role: Database["public"]["Enums"]["game_role"]
          secondary_role: Database["public"]["Enums"]["game_role"] | null
          sold_at: string | null
          sold_price: number | null
          status: Database["public"]["Enums"]["player_status"]
          user_id: string
          video_url: string | null
        }
        Insert: {
          ambassador_id?: string | null
          created_at?: string
          game_id: string
          id?: string
          info?: string | null
          ingame_name: string
          lot_number?: number | null
          photo_url?: string | null
          player_name: string
          primary_role: Database["public"]["Enums"]["game_role"]
          secondary_role?: Database["public"]["Enums"]["game_role"] | null
          sold_at?: string | null
          sold_price?: number | null
          status?: Database["public"]["Enums"]["player_status"]
          user_id: string
          video_url?: string | null
        }
        Update: {
          ambassador_id?: string | null
          created_at?: string
          game_id?: string
          id?: string
          info?: string | null
          ingame_name?: string
          lot_number?: number | null
          photo_url?: string | null
          player_name?: string
          primary_role?: Database["public"]["Enums"]["game_role"]
          secondary_role?: Database["public"]["Enums"]["game_role"] | null
          sold_at?: string | null
          sold_price?: number | null
          status?: Database["public"]["Enums"]["player_status"]
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_ambassador_id_fkey"
            columns: ["ambassador_id"]
            isOneToOne: false
            referencedRelation: "ambassadors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          username: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          username: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          username?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      caster_end_bidding: { Args: never; Returns: Json }
      caster_next_player: { Args: never; Returns: Json }
      caster_set_status: {
        Args: { p_status: Database["public"]["Enums"]["auction_status"] }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      place_bid: { Args: { p_amount: number }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "caster" | "ambassador" | "player"
      auction_status: "not_started" | "live" | "paused" | "completed"
      game_role:
        | "primary_rusher"
        | "secondary_rusher"
        | "sniper"
        | "nader"
        | "supporter"
      player_status: "pool" | "in_auction" | "sold" | "unsold"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "caster", "ambassador", "player"],
      auction_status: ["not_started", "live", "paused", "completed"],
      game_role: [
        "primary_rusher",
        "secondary_rusher",
        "sniper",
        "nader",
        "supporter",
      ],
      player_status: ["pool", "in_auction", "sold", "unsold"],
    },
  },
} as const
