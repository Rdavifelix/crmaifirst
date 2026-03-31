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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      integration_keys: {
        Row: {
          id: string
          service: string
          key_name: string
          key_value: string
          is_active: boolean
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          service: string
          key_name: string
          key_value: string
          is_active?: boolean
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          service?: string
          key_name?: string
          key_value?: string
          is_active?: boolean
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sales_pipeline_stages: {
        Row: {
          id: string
          name: string
          display_name: string
          description: string | null
          color: string
          sort_order: number
          is_active: boolean
          is_terminal: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          display_name: string
          description?: string | null
          color?: string
          sort_order?: number
          is_active?: boolean
          is_terminal?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          display_name?: string
          description?: string | null
          color?: string
          sort_order?: number
          is_active?: boolean
          is_terminal?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_sales_agents: {
        Row: {
          id: string
          name: string
          description: string | null
          system_prompt: string
          personality_traits: Json
          target_stages: string[]
          settings: Json
          model: string
          temperature: number
          max_tokens: number
          is_active: boolean
          cadence_steps: Json
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          system_prompt?: string
          personality_traits?: Json
          target_stages?: string[]
          settings?: Json
          model?: string
          temperature?: number
          max_tokens?: number
          is_active?: boolean
          cadence_steps?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          system_prompt?: string
          personality_traits?: Json
          target_stages?: string[]
          settings?: Json
          model?: string
          temperature?: number
          max_tokens?: number
          is_active?: boolean
          cadence_steps?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_agent_conversations: {
        Row: {
          id: string
          lead_id: string
          agent_id: string
          status: string
          messages_history: Json
          total_messages_sent: number
          total_messages_received: number
          paused_by: string | null
          paused_at: string | null
          pause_reason: string | null
          last_processed_at: string | null
          last_message_id: string | null
          metadata: Json
          processing_lock: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lead_id: string
          agent_id: string
          status?: string
          messages_history?: Json
          total_messages_sent?: number
          total_messages_received?: number
          paused_by?: string | null
          paused_at?: string | null
          pause_reason?: string | null
          last_processed_at?: string | null
          last_message_id?: string | null
          metadata?: Json
          processing_lock?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          lead_id?: string
          agent_id?: string
          status?: string
          messages_history?: Json
          total_messages_sent?: number
          total_messages_received?: number
          paused_by?: string | null
          paused_at?: string | null
          pause_reason?: string | null
          last_processed_at?: string | null
          last_message_id?: string | null
          metadata?: Json
          processing_lock?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_agent_message_queue: {
        Row: {
          id: string
          lead_id: string
          message_id: string | null
          conversation_id: string | null
          message_content: string | null
          message_metadata: Json
          scheduled_for: string
          status: string
          result: Json | null
          error_message: string | null
          attempts: number
          max_attempts: number
          created_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          lead_id: string
          message_id?: string | null
          conversation_id?: string | null
          message_content?: string | null
          message_metadata?: Json
          scheduled_for: string
          status?: string
          result?: Json | null
          error_message?: string | null
          attempts?: number
          max_attempts?: number
          created_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          lead_id?: string
          message_id?: string | null
          conversation_id?: string | null
          message_content?: string | null
          message_metadata?: Json
          scheduled_for?: string
          status?: string
          result?: Json | null
          error_message?: string | null
          attempts?: number
          max_attempts?: number
          created_at?: string
          processed_at?: string | null
        }
        Relationships: []
      }
      ai_agent_cadence_enrollments: {
        Row: {
          id: string
          lead_id: string
          agent_id: string
          stage: string
          current_step: number
          status: string
          next_action_at: string | null
          enrolled_at: string
          last_step_at: string | null
          completed_at: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lead_id: string
          agent_id: string
          stage: string
          current_step?: number
          status?: string
          next_action_at?: string | null
          enrolled_at?: string
          last_step_at?: string | null
          completed_at?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          lead_id?: string
          agent_id?: string
          stage?: string
          current_step?: number
          status?: string
          next_action_at?: string | null
          enrolled_at?: string
          last_step_at?: string | null
          completed_at?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_agent_tools: {
        Row: {
          id: string
          agent_id: string | null
          name: string
          description: string
          parameters: Json
          action_type: string
          action_config: Json
          priority: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agent_id?: string | null
          name: string
          description: string
          parameters?: Json
          action_type: string
          action_config?: Json
          priority?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agent_id?: string | null
          name?: string
          description?: string
          parameters?: Json
          action_type?: string
          action_config?: Json
          priority?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_agent_logs: {
        Row: {
          id: string
          conversation_id: string | null
          lead_id: string | null
          agent_id: string | null
          log_type: string
          data: Json
          tokens_input: number | null
          tokens_output: number | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id?: string | null
          lead_id?: string | null
          agent_id?: string | null
          log_type: string
          data?: Json
          tokens_input?: number | null
          tokens_output?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string | null
          lead_id?: string | null
          agent_id?: string | null
          log_type?: string
          data?: Json
          tokens_input?: number | null
          tokens_output?: number | null
          created_at?: string
        }
        Relationships: []
      }
      ai_agent_scheduled_followups: {
        Row: {
          id: string
          lead_id: string
          conversation_id: string | null
          agent_id: string | null
          scheduled_at: string
          context_note: string | null
          status: string
          attempts: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lead_id: string
          conversation_id?: string | null
          agent_id?: string | null
          scheduled_at: string
          context_note?: string | null
          status?: string
          attempts?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          lead_id?: string
          conversation_id?: string | null
          agent_id?: string | null
          scheduled_at?: string
          context_note?: string | null
          status?: string
          attempts?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_agent_send_counts: {
        Row: {
          id: string
          instance_id: string
          window_start: string
          window_type: string
          message_count: number
          created_at: string
        }
        Insert: {
          id?: string
          instance_id: string
          window_start: string
          window_type: string
          message_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          instance_id?: string
          window_start?: string
          window_type?: string
          message_count?: number
          created_at?: string
        }
        Relationships: []
      }
      call_history: {
        Row: {
          ai_key_points: Json | null
          ai_processed_at: string | null
          ai_processing_error: string | null
          ai_sentiment: string | null
          ai_suggested_tasks: Json | null
          ai_summary: string | null
          created_at: string
          direction: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          lead_id: string | null
          metadata: Json | null
          peer_name: string | null
          peer_phone: string
          profile_id: string | null
          started_at: string | null
          status: string
          transcription: string | null
          transcriptions: Json | null
          wavoip_device_id: string | null
        }
        Insert: {
          ai_key_points?: Json | null
          ai_processed_at?: string | null
          ai_processing_error?: string | null
          ai_sentiment?: string | null
          ai_suggested_tasks?: Json | null
          ai_summary?: string | null
          created_at?: string
          direction?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          peer_name?: string | null
          peer_phone: string
          profile_id?: string | null
          started_at?: string | null
          status?: string
          transcription?: string | null
          transcriptions?: Json | null
          wavoip_device_id?: string | null
        }
        Update: {
          ai_key_points?: Json | null
          ai_processed_at?: string | null
          ai_processing_error?: string | null
          ai_sentiment?: string | null
          ai_suggested_tasks?: Json | null
          ai_summary?: string | null
          created_at?: string
          direction?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          peer_name?: string | null
          peer_phone?: string
          profile_id?: string | null
          started_at?: string | null
          status?: string
          transcription?: string | null
          transcriptions?: Json | null
          wavoip_device_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_history_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_history_wavoip_device_id_fkey"
            columns: ["wavoip_device_id"]
            isOneToOne: false
            referencedRelation: "wavoip_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          interview_analysis: Json | null
          interview_score: number | null
          meet_event_id: string | null
          meet_link: string | null
          name: string | null
          notes: string | null
          phone: string | null
          photo_url: string | null
          position: string | null
          signature_analysis: Json | null
          signature_status: string
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          interview_analysis?: Json | null
          interview_score?: number | null
          meet_event_id?: string | null
          meet_link?: string | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          position?: string | null
          signature_analysis?: Json | null
          signature_status?: string
          status?: string
          token: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          interview_analysis?: Json | null
          interview_score?: number | null
          meet_event_id?: string | null
          meet_link?: string | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          position?: string | null
          signature_analysis?: Json | null
          signature_status?: string
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_sessions: {
        Row: {
          alerts_triggered: number | null
          briefing: string | null
          call_id: string | null
          checklist_state: Json | null
          created_at: string
          current_phase_index: number | null
          ended_at: string | null
          events: Json | null
          id: string
          lead_id: string | null
          phases_completed: number | null
          playbook_id: string | null
          profile_id: string | null
          started_at: string | null
          suggestions_shown: number | null
        }
        Insert: {
          alerts_triggered?: number | null
          briefing?: string | null
          call_id?: string | null
          checklist_state?: Json | null
          created_at?: string
          current_phase_index?: number | null
          ended_at?: string | null
          events?: Json | null
          id?: string
          lead_id?: string | null
          phases_completed?: number | null
          playbook_id?: string | null
          profile_id?: string | null
          started_at?: string | null
          suggestions_shown?: number | null
        }
        Update: {
          alerts_triggered?: number | null
          briefing?: string | null
          call_id?: string | null
          checklist_state?: Json | null
          created_at?: string
          current_phase_index?: number | null
          ended_at?: string | null
          events?: Json | null
          id?: string
          lead_id?: string | null
          phases_completed?: number | null
          playbook_id?: string | null
          profile_id?: string | null
          started_at?: string | null
          suggestions_shown?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_sessions_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "call_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_sessions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_sessions_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "sales_playbooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_sessions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          company_address: string | null
          company_email: string | null
          company_logo_url: string | null
          company_name: string | null
          company_nif: string | null
          company_phone: string | null
          created_at: string
          id: string
          language: string | null
          notifications_email: boolean | null
          notifications_new_lead: boolean | null
          notifications_new_message: boolean | null
          notifications_sound: boolean | null
          owner_id: string
          theme: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          company_address?: string | null
          company_email?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          company_nif?: string | null
          company_phone?: string | null
          created_at?: string
          id?: string
          language?: string | null
          notifications_email?: boolean | null
          notifications_new_lead?: boolean | null
          notifications_new_message?: boolean | null
          notifications_sound?: boolean | null
          owner_id: string
          theme?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          company_address?: string | null
          company_email?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          company_nif?: string | null
          company_phone?: string | null
          created_at?: string
          id?: string
          language?: string | null
          notifications_email?: boolean | null
          notifications_new_lead?: boolean | null
          notifications_new_message?: boolean | null
          notifications_sound?: boolean | null
          owner_id?: string
          theme?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_sessions: {
        Row: {
          ai_analysis: Json | null
          ai_score: number | null
          ai_sentiment: string | null
          candidate_id: string
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          profile_id: string | null
          started_at: string | null
          status: string
          transcriptions: Json | null
        }
        Insert: {
          ai_analysis?: Json | null
          ai_score?: number | null
          ai_sentiment?: string | null
          candidate_id: string
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          profile_id?: string | null
          started_at?: string | null
          status?: string
          transcriptions?: Json | null
        }
        Update: {
          ai_analysis?: Json | null
          ai_score?: number | null
          ai_sentiment?: string | null
          candidate_id?: string
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          profile_id?: string | null
          started_at?: string | null
          status?: string
          transcriptions?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_sessions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_sessions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_instagram_content: {
        Row: {
          caption: string | null
          comments_count: number | null
          content_type: string
          created_at: string
          id: string
          instagram_id: string | null
          lead_id: string
          likes_count: number | null
          media_url: string | null
          raw_data: Json | null
          taken_at: string | null
          thumbnail_url: string | null
          transcription: string | null
        }
        Insert: {
          caption?: string | null
          comments_count?: number | null
          content_type: string
          created_at?: string
          id?: string
          instagram_id?: string | null
          lead_id: string
          likes_count?: number | null
          media_url?: string | null
          raw_data?: Json | null
          taken_at?: string | null
          thumbnail_url?: string | null
          transcription?: string | null
        }
        Update: {
          caption?: string | null
          comments_count?: number | null
          content_type?: string
          created_at?: string
          id?: string
          instagram_id?: string | null
          lead_id?: string
          likes_count?: number | null
          media_url?: string | null
          raw_data?: Json | null
          taken_at?: string | null
          thumbnail_url?: string | null
          transcription?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_instagram_content_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_meetings: {
        Row: {
          ai_key_points: Json | null
          ai_sentiment: string | null
          ai_summary: string | null
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          lead_id: string
          profile_id: string
          started_at: string | null
          status: string
          transcriptions: Json | null
        }
        Insert: {
          ai_key_points?: Json | null
          ai_sentiment?: string | null
          ai_summary?: string | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          lead_id: string
          profile_id: string
          started_at?: string | null
          status?: string
          transcriptions?: Json | null
        }
        Update: {
          ai_key_points?: Json | null
          ai_sentiment?: string | null
          ai_summary?: string | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          lead_id?: string
          profile_id?: string
          started_at?: string | null
          status?: string
          transcriptions?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_meetings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_meetings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_messages: {
        Row: {
          created_at: string
          direction: string | null
          id: string
          is_read: boolean | null
          lead_id: string
          media_type: string | null
          media_url: string | null
          message: string
          message_status: string | null
          sender_id: string | null
          sender_type: string
          uazapi_message_id: string | null
          whatsapp_instance_id: string | null
        }
        Insert: {
          created_at?: string
          direction?: string | null
          id?: string
          is_read?: boolean | null
          lead_id: string
          media_type?: string | null
          media_url?: string | null
          message: string
          message_status?: string | null
          sender_id?: string | null
          sender_type: string
          uazapi_message_id?: string | null
          whatsapp_instance_id?: string | null
        }
        Update: {
          created_at?: string
          direction?: string | null
          id?: string
          is_read?: boolean | null
          lead_id?: string
          media_type?: string | null
          media_url?: string | null
          message?: string
          message_status?: string | null
          sender_id?: string | null
          sender_type?: string
          uazapi_message_id?: string | null
          whatsapp_instance_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_messages_whatsapp_instance_id_fkey"
            columns: ["whatsapp_instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          lead_id: string
          new_status: string
          notes: string | null
          old_status: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          lead_id: string
          new_status: string
          notes?: string | null
          old_status?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          new_status?: string
          notes?: string | null
          old_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_status_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          lead_id: string
          meet_link: string | null
          meeting_id: string | null
          priority: string
          profile_id: string
          scheduled_at: string | null
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          lead_id: string
          meet_link?: string | null
          meeting_id?: string | null
          priority?: string
          profile_id: string
          scheduled_at?: string | null
          status?: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          lead_id?: string
          meet_link?: string | null
          meeting_id?: string | null
          priority?: string
          profile_id?: string
          scheduled_at?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_tasks_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "lead_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_tasks_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          avatar_url: string | null
          bant_authority: string | null
          bant_budget: string | null
          bant_need: string | null
          bant_timeline: string | null
          closed_at: string | null
          created_at: string
          deal_value: number | null
          email: string | null
          entered_at: string
          id: string
          instagram_data: Json | null
          instagram_username: string | null
          loss_reason: string | null
          name: string | null
          notes: string | null
          phone: string
          post_sale_status: string | null
          sales_score: number | null
          score_calculated_at: string | null
          status: string | null
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_link_id: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          assigned_to?: string | null
          avatar_url?: string | null
          bant_authority?: string | null
          bant_budget?: string | null
          bant_need?: string | null
          bant_timeline?: string | null
          closed_at?: string | null
          created_at?: string
          deal_value?: number | null
          email?: string | null
          entered_at?: string
          id?: string
          instagram_data?: Json | null
          instagram_username?: string | null
          loss_reason?: string | null
          name?: string | null
          notes?: string | null
          phone: string
          post_sale_status?: string | null
          sales_score?: number | null
          score_calculated_at?: string | null
          status?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_link_id?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          assigned_to?: string | null
          avatar_url?: string | null
          bant_authority?: string | null
          bant_budget?: string | null
          bant_need?: string | null
          bant_timeline?: string | null
          closed_at?: string | null
          created_at?: string
          deal_value?: number | null
          email?: string | null
          entered_at?: string
          id?: string
          instagram_data?: Json | null
          instagram_username?: string | null
          loss_reason?: string | null
          name?: string | null
          notes?: string | null
          phone?: string
          post_sale_status?: string | null
          sales_score?: number | null
          score_calculated_at?: string | null
          status?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_link_id?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_utm_link_id_fkey"
            columns: ["utm_link_id"]
            isOneToOne: false
            referencedRelation: "utm_links"
            referencedColumns: ["id"]
          },
        ]
      }
      link_clicks: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          referrer: string | null
          user_agent: string | null
          utm_link_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          referrer?: string | null
          user_agent?: string | null
          utm_link_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          referrer?: string | null
          user_agent?: string | null
          utm_link_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "link_clicks_utm_link_id_fkey"
            columns: ["utm_link_id"]
            isOneToOne: false
            referencedRelation: "utm_links"
            referencedColumns: ["id"]
          },
        ]
      }
      post_sale_stages: {
        Row: {
          completed_at: string | null
          id: string
          lead_id: string
          notes: string | null
          responsible_id: string | null
          stage: string
          started_at: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          lead_id: string
          notes?: string | null
          responsible_id?: string | null
          stage: string
          started_at?: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          lead_id?: string
          notes?: string | null
          responsible_id?: string | null
          stage?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_sale_stages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sales_playbooks: {
        Row: {
          context: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          phases: Json
        }
        Insert: {
          context?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phases?: Json
        }
        Update: {
          context?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phases?: Json
        }
        Relationships: [
          {
            foreignKeyName: "sales_playbooks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      traffic_channels: {
        Row: {
          category: string
          created_at: string
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          category: string
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
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
      utm_links: {
        Row: {
          channel_id: string | null
          clicks_count: number | null
          created_at: string
          created_by: string | null
          full_url: string
          id: string
          is_active: boolean | null
          short_code: string | null
          utm_campaign: string
          utm_content: string | null
          utm_medium: string
          utm_source: string
          utm_term: string | null
          whatsapp_message: string | null
          whatsapp_number: string
        }
        Insert: {
          channel_id?: string | null
          clicks_count?: number | null
          created_at?: string
          created_by?: string | null
          full_url: string
          id?: string
          is_active?: boolean | null
          short_code?: string | null
          utm_campaign: string
          utm_content?: string | null
          utm_medium: string
          utm_source: string
          utm_term?: string | null
          whatsapp_message?: string | null
          whatsapp_number: string
        }
        Update: {
          channel_id?: string | null
          clicks_count?: number | null
          created_at?: string
          created_by?: string | null
          full_url?: string
          id?: string
          is_active?: boolean | null
          short_code?: string | null
          utm_campaign?: string
          utm_content?: string | null
          utm_medium?: string
          utm_source?: string
          utm_term?: string | null
          whatsapp_message?: string | null
          whatsapp_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "utm_links_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "traffic_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      wavoip_devices: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          metadata: Json | null
          name: string | null
          phone_number: string | null
          profile_id: string
          status: string | null
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name?: string | null
          phone_number?: string | null
          profile_id: string
          status?: string | null
          token: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name?: string | null
          phone_number?: string | null
          profile_id?: string
          status?: string | null
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wavoip_devices_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_instances: {
        Row: {
          auto_welcome_enabled: boolean
          created_at: string
          id: string
          instance_id: string | null
          last_connected_at: string | null
          owner_id: string
          phone_number: string | null
          qr_code_base64: string | null
          status: Database["public"]["Enums"]["whatsapp_instance_status"]
          token: string | null
          uazapi_url: string | null
          updated_at: string
          webhook_secret: string | null
          welcome_message: string | null
        }
        Insert: {
          auto_welcome_enabled?: boolean
          created_at?: string
          id?: string
          instance_id?: string | null
          last_connected_at?: string | null
          owner_id: string
          phone_number?: string | null
          qr_code_base64?: string | null
          status?: Database["public"]["Enums"]["whatsapp_instance_status"]
          token?: string | null
          uazapi_url?: string | null
          updated_at?: string
          webhook_secret?: string | null
          welcome_message?: string | null
        }
        Update: {
          auto_welcome_enabled?: boolean
          created_at?: string
          id?: string
          instance_id?: string | null
          last_connected_at?: string | null
          owner_id?: string
          phone_number?: string | null
          qr_code_base64?: string | null
          status?: Database["public"]["Enums"]["whatsapp_instance_status"]
          token?: string | null
          uazapi_url?: string | null
          updated_at?: string
          webhook_secret?: string | null
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_instances_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_ai_agent_dashboard: {
        Row: {
          agent_id: string
          agent_name: string
          is_active: boolean
          total_conversations: number
          active_conversations: number
          paused_conversations: number
          total_messages_sent: number
          pending_in_queue: number
          failed_in_queue: number
        }
      }
    }
    Functions: {
      find_lead_by_phone: { Args: { p_phone: string }; Returns: string }
      get_ai_agent_status_for_lead: {
        Args: { p_lead_id: string }
        Returns: {
          has_agent: boolean
          agent_name: string | null
          conversation_status: string | null
          messages_sent: number
          last_processed_at: string | null
          is_paused: boolean
          paused_by_name: string | null
          pause_reason: string | null
        }[]
      }
      try_acquire_agent_lock: {
        Args: { p_lead_id: string; p_lock_duration?: string }
        Returns: boolean
      }
      release_agent_lock: {
        Args: { p_lead_id: string }
        Returns: undefined
      }
      enqueue_message_for_ai_agent: {
        Args: { p_lead_id: string; p_message_id: string; p_message_content: string; p_debounce_seconds?: number }
        Returns: string | null
      }
      claim_queue_messages: {
        Args: { p_batch_size?: number }
        Returns: Database["public"]["Tables"]["ai_agent_message_queue"]["Row"][]
      }
      claim_scheduled_followups: {
        Args: { p_batch_size?: number }
        Returns: Database["public"]["Tables"]["ai_agent_scheduled_followups"]["Row"][]
      }
      process_ai_agent_queue: {
        Args: Record<string, never>
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_seller: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "seller" | "marketing"
      whatsapp_instance_status:
        | "disconnected"
        | "connecting"
        | "connected"
        | "banned"
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
      app_role: ["admin", "seller", "marketing"],
      whatsapp_instance_status: [
        "disconnected",
        "connecting",
        "connected",
        "banned",
      ],
    },
  },
} as const
