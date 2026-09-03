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
      achievements: {
        Row: {
          category: string
          created_at: string
          description: string
          icon: string
          id: string
          key: string
          points: number
          title: string
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          icon?: string
          id?: string
          key: string
          points?: number
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          key?: string
          points?: number
          title?: string
        }
        Relationships: []
      }
      applications: {
        Row: {
          applied_at: string | null
          company_name: string
          created_at: string
          id: string
          job_id: string | null
          notes: string | null
          role: string
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          company_name: string
          created_at?: string
          id?: string
          job_id?: string | null
          notes?: string | null
          role: string
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          applied_at?: string | null
          company_name?: string
          created_at?: string
          id?: string
          job_id?: string | null
          notes?: string | null
          role?: string
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_interests: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          message: string | null
          recruiter_id: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          message?: string | null
          recruiter_id: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          message?: string | null
          recruiter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_interests_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "recruiter_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_searches: {
        Row: {
          created_at: string
          id: string
          query: Json
          recruiter_id: string
          results_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          query?: Json
          recruiter_id: string
          results_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          query?: Json
          recruiter_id?: string
          results_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "candidate_searches_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "recruiter_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_progress: {
        Row: {
          class_id: string
          completed: boolean
          id: string
          updated_at: string
          user_id: string
          watched_seconds: number
        }
        Insert: {
          class_id: string
          completed?: boolean
          id?: string
          updated_at?: string
          user_id: string
          watched_seconds?: number
        }
        Update: {
          class_id?: string
          completed?: boolean
          id?: string
          updated_at?: string
          user_id?: string
          watched_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "class_progress_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          category: string | null
          created_at: string
          description_en: string | null
          description_pt: string | null
          duration_min: number | null
          id: string
          is_pro: boolean
          thumbnail_url: string | null
          title_en: string
          title_pt: string
          video_url: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description_en?: string | null
          description_pt?: string | null
          duration_min?: number | null
          id?: string
          is_pro?: boolean
          thumbnail_url?: string | null
          title_en: string
          title_pt: string
          video_url: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description_en?: string | null
          description_pt?: string | null
          duration_min?: number | null
          id?: string
          is_pro?: boolean
          thumbnail_url?: string | null
          title_en?: string
          title_pt?: string
          video_url?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          created_at: string
          description_en: string | null
          description_pt: string | null
          hiring: boolean | null
          id: string
          logo_url: string | null
          name: string
          tags: string[] | null
          upvotes: number
          website: string | null
        }
        Insert: {
          created_at?: string
          description_en?: string | null
          description_pt?: string | null
          hiring?: boolean | null
          id?: string
          logo_url?: string | null
          name: string
          tags?: string[] | null
          upvotes?: number
          website?: string | null
        }
        Update: {
          created_at?: string
          description_en?: string | null
          description_pt?: string | null
          hiring?: boolean | null
          id?: string
          logo_url?: string | null
          name?: string
          tags?: string[] | null
          upvotes?: number
          website?: string | null
        }
        Relationships: []
      }
      company_votes: {
        Row: {
          company_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_votes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      english_lessons: {
        Row: {
          audio_url: string | null
          body_en: string | null
          body_pt: string | null
          created_at: string
          id: string
          is_pro: boolean
          level: string | null
          title_en: string
          title_pt: string
        }
        Insert: {
          audio_url?: string | null
          body_en?: string | null
          body_pt?: string | null
          created_at?: string
          id?: string
          is_pro?: boolean
          level?: string | null
          title_en: string
          title_pt: string
        }
        Update: {
          audio_url?: string | null
          body_en?: string | null
          body_pt?: string | null
          created_at?: string
          id?: string
          is_pro?: boolean
          level?: string | null
          title_en?: string
          title_pt?: string
        }
        Relationships: []
      }
      feature_toggles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_enabled: boolean
          key: string
          label: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          key: string
          label: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_enabled?: boolean
          key?: string
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      help_articles: {
        Row: {
          body_en: string | null
          body_pt: string | null
          category: string
          created_at: string
          id: string
          is_pro: boolean
          title_en: string
          title_pt: string
        }
        Insert: {
          body_en?: string | null
          body_pt?: string | null
          category: string
          created_at?: string
          id?: string
          is_pro?: boolean
          title_en: string
          title_pt: string
        }
        Update: {
          body_en?: string | null
          body_pt?: string | null
          category?: string
          created_at?: string
          id?: string
          is_pro?: boolean
          title_en?: string
          title_pt?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          apply_url: string
          applications_count: number
          benefits_count: number
          comp_currency: string | null
          comp_max: number | null
          comp_min: number | null
          company_id: string | null
          company_name: string
          company_size: string | null
          created_at: string
          country_codes: string[] | null
          description: string | null
          english_level: string | null
          external_id: string | null
          id: string
          industry: string | null
          is_active: boolean
          is_featured: boolean
          is_hot: boolean
          is_verified_company: boolean
          job_type: Database["public"]["Enums"]["job_type"]
          location: string | null
          location_type: Database["public"]["Enums"]["location_type"]
          posted_at: string
          published_at: string | null
          region_scope: string | null
          role: string
          role_category: string | null
          salary_currency: string | null
          salary_max: number | null
          salary_min: number | null
          salary_period: Database["public"]["Enums"]["salary_period"] | null
          seniority_level: Database["public"]["Enums"]["job_seniority"] | null
          seniority: string | null
          slug: string | null
          source: string
          status: Database["public"]["Enums"]["job_status"]
          stack: string[] | null
          submitted_by: string | null
          timezone_regions: string[] | null
          title: string
          views_count: number
        }
        Insert: {
          apply_url: string
          applications_count?: number
          benefits_count?: number
          comp_currency?: string | null
          comp_max?: number | null
          comp_min?: number | null
          company_id?: string | null
          company_name: string
          company_size?: string | null
          created_at?: string
          country_codes?: string[] | null
          description?: string | null
          english_level?: string | null
          external_id?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean
          is_featured?: boolean
          is_hot?: boolean
          is_verified_company?: boolean
          job_type?: Database["public"]["Enums"]["job_type"]
          location?: string | null
          location_type?: Database["public"]["Enums"]["location_type"]
          posted_at?: string
          published_at?: string | null
          region_scope?: string | null
          role: string
          role_category?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_period?: Database["public"]["Enums"]["salary_period"] | null
          seniority_level?: Database["public"]["Enums"]["job_seniority"] | null
          seniority?: string | null
          slug?: string | null
          source?: string
          status?: Database["public"]["Enums"]["job_status"]
          stack?: string[] | null
          submitted_by?: string | null
          timezone_regions?: string[] | null
          title?: string
          views_count?: number
        }
        Update: {
          apply_url?: string
          applications_count?: number
          benefits_count?: number
          comp_currency?: string | null
          comp_max?: number | null
          comp_min?: number | null
          company_id?: string | null
          company_name?: string
          company_size?: string | null
          created_at?: string
          country_codes?: string[] | null
          description?: string | null
          english_level?: string | null
          external_id?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean
          is_featured?: boolean
          is_hot?: boolean
          is_verified_company?: boolean
          job_type?: Database["public"]["Enums"]["job_type"]
          location?: string | null
          location_type?: Database["public"]["Enums"]["location_type"]
          posted_at?: string
          published_at?: string | null
          region_scope?: string | null
          role?: string
          role_category?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_period?: Database["public"]["Enums"]["salary_period"] | null
          seniority_level?: Database["public"]["Enums"]["job_seniority"] | null
          seniority?: string | null
          slug?: string | null
          source?: string
          status?: Database["public"]["Enums"]["job_status"]
          stack?: string[] | null
          submitted_by?: string | null
          timezone_regions?: string[] | null
          title?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      job_perks: {
        Row: {
          category: string | null
          created_at: string
          id: string
          label: string
          slug: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          label: string
          slug: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          label?: string
          slug?: string
        }
        Relationships: []
      }
      job_perk_map: {
        Row: {
          created_at: string
          job_id: string
          perk_id: string
        }
        Insert: {
          created_at?: string
          job_id: string
          perk_id: string
        }
        Update: {
          created_at?: string
          job_id?: string
          perk_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_perk_map_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_perk_map_perk_id_fkey"
            columns: ["perk_id"]
            isOneToOne: false
            referencedRelation: "job_perks"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_progress: {
        Row: {
          completed_at: string
          id: string
          step_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          step_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          step_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journey_progress_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "journey_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_stages: {
        Row: {
          created_at: string
          description_en: string | null
          description_pt: string | null
          icon: string | null
          id: string
          position: number
          slug: string
          title_en: string
          title_pt: string
        }
        Insert: {
          created_at?: string
          description_en?: string | null
          description_pt?: string | null
          icon?: string | null
          id?: string
          position: number
          slug: string
          title_en: string
          title_pt: string
        }
        Update: {
          created_at?: string
          description_en?: string | null
          description_pt?: string | null
          icon?: string | null
          id?: string
          position?: number
          slug?: string
          title_en?: string
          title_pt?: string
        }
        Relationships: []
      }
      journey_steps: {
        Row: {
          body_en: string | null
          body_pt: string | null
          created_at: string
          id: string
          is_pro: boolean
          position: number
          stage_id: string
          title_en: string
          title_pt: string
        }
        Insert: {
          body_en?: string | null
          body_pt?: string | null
          created_at?: string
          id?: string
          is_pro?: boolean
          position: number
          stage_id: string
          title_en: string
          title_pt: string
        }
        Update: {
          body_en?: string | null
          body_pt?: string | null
          created_at?: string
          id?: string
          is_pro?: boolean
          position?: number
          stage_id?: string
          title_en?: string
          title_pt?: string
        }
        Relationships: [
          {
            foreignKeyName: "journey_steps_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "journey_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          payload: Json
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          read?: boolean
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          area: string | null
          area_custom: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          current_job_title: string | null
          current_streak: number
          english_level: string | null
          experience_bucket: string | null
          full_name: string | null
          github_url: string | null
          goals: string | null
          id: string
          intl_search_stage: string | null
          last_activity_at: string | null
          linkedin_url: string | null
          locale: Database["public"]["Enums"]["locale"]
          longest_streak: number
          monthly_income_bucket: string | null
          onboarded_at: string | null
          pain_point: string | null
          pain_point_custom: string | null
          profile_completeness: number
          remote_goals: string | null
          salary_expectation_usd: number | null
          stack: string[] | null
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          visible_to_recruiters: boolean
          xp_points: number
          years_experience: number | null
        }
        Insert: {
          area?: string | null
          area_custom?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          current_job_title?: string | null
          current_streak?: number
          english_level?: string | null
          experience_bucket?: string | null
          full_name?: string | null
          github_url?: string | null
          goals?: string | null
          id: string
          intl_search_stage?: string | null
          last_activity_at?: string | null
          linkedin_url?: string | null
          locale?: Database["public"]["Enums"]["locale"]
          longest_streak?: number
          monthly_income_bucket?: string | null
          onboarded_at?: string | null
          pain_point?: string | null
          pain_point_custom?: string | null
          profile_completeness?: number
          remote_goals?: string | null
          salary_expectation_usd?: number | null
          stack?: string[] | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          visible_to_recruiters?: boolean
          xp_points?: number
          years_experience?: number | null
        }
        Update: {
          area?: string | null
          area_custom?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          current_job_title?: string | null
          current_streak?: number
          english_level?: string | null
          experience_bucket?: string | null
          full_name?: string | null
          github_url?: string | null
          goals?: string | null
          id?: string
          intl_search_stage?: string | null
          last_activity_at?: string | null
          linkedin_url?: string | null
          locale?: Database["public"]["Enums"]["locale"]
          longest_streak?: number
          monthly_income_bucket?: string | null
          onboarded_at?: string | null
          pain_point?: string | null
          pain_point_custom?: string | null
          profile_completeness?: number
          remote_goals?: string | null
          salary_expectation_usd?: number | null
          stack?: string[] | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          visible_to_recruiters?: boolean
          xp_points?: number
          years_experience?: number | null
        }
        Relationships: []
      }
      project_votes: {
        Row: {
          created_at: string
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_votes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "side_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      recruiter_profiles: {
        Row: {
          company_name: string
          company_size: string | null
          company_website: string | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name: string
          company_size?: string | null
          company_website?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string
          company_size?: string | null
          company_website?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recruiter_subscriptions: {
        Row: {
          candidate_contacts_remaining: number
          created_at: string
          current_period_end: string | null
          id: string
          plan: string
          recruiter_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          candidate_contacts_remaining?: number
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: string
          recruiter_id: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          candidate_contacts_remaining?: number
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: string
          recruiter_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruiter_subscriptions_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "recruiter_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          category: string | null
          content_en: string | null
          content_pt: string | null
          created_at: string
          id: string
          is_pro: boolean
          kind: Database["public"]["Enums"]["resource_kind"]
          summary_en: string | null
          summary_pt: string | null
          title_en: string
          title_pt: string
          url: string | null
        }
        Insert: {
          category?: string | null
          content_en?: string | null
          content_pt?: string | null
          created_at?: string
          id?: string
          is_pro?: boolean
          kind?: Database["public"]["Enums"]["resource_kind"]
          summary_en?: string | null
          summary_pt?: string | null
          title_en: string
          title_pt: string
          url?: string | null
        }
        Update: {
          category?: string | null
          content_en?: string | null
          content_pt?: string | null
          created_at?: string
          id?: string
          is_pro?: boolean
          kind?: Database["public"]["Enums"]["resource_kind"]
          summary_en?: string | null
          summary_pt?: string | null
          title_en?: string
          title_pt?: string
          url?: string | null
        }
        Relationships: []
      }
      resume_analyses: {
        Row: {
          created_at: string
          email: string | null
          email_unlocked: boolean
          file_name: string | null
          full_report: Json | null
          id: string
          partial: Json
          resume_text: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          email_unlocked?: boolean
          file_name?: string | null
          full_report?: Json | null
          id?: string
          partial?: Json
          resume_text?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          email_unlocked?: boolean
          file_name?: string | null
          full_report?: Json | null
          id?: string
          partial?: Json
          resume_text?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      resumes: {
        Row: {
          created_at: string
          file_url: string | null
          generated_markdown: string | null
          id: string
          inputs: Json
          target_role: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_url?: string | null
          generated_markdown?: string | null
          id?: string
          inputs?: Json
          target_role?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_url?: string | null
          generated_markdown?: string | null
          id?: string
          inputs?: Json
          target_role?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      side_projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          stack: string[] | null
          status: string
          tagline: string | null
          title: string
          upvotes: number
          url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          stack?: string[] | null
          status?: string
          tagline?: string | null
          title: string
          upvotes?: number
          url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          stack?: string[] | null
          status?: string
          tagline?: string | null
          title?: string
          upvotes?: number
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          current_period_end: string | null
          email: string
          id: string
          plan: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          email: string
          id?: string
          plan?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          email?: string
          id?: string
          plan?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
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
      mock_interview_packages: {
        Row: {
          id: string
          name_pt: string
          name_en: string
          description_pt: string | null
          description_en: string | null
          session_count: number
          price_cents: number
          discount_label: string | null
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name_pt: string
          name_en: string
          description_pt?: string | null
          description_en?: string | null
          session_count?: number
          price_cents: number
          discount_label?: string | null
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name_pt?: string
          name_en?: string
          description_pt?: string | null
          description_en?: string | null
          session_count?: number
          price_cents?: number
          discount_label?: string | null
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      mock_interview_interviewers: {
        Row: {
          id: string
          name: string
          email: string | null
          bio_pt: string | null
          bio_en: string | null
          avatar_url: string | null
          specialties: string[] | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          bio_pt?: string | null
          bio_en?: string | null
          avatar_url?: string | null
          specialties?: string[] | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          bio_pt?: string | null
          bio_en?: string | null
          avatar_url?: string | null
          specialties?: string[] | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      mock_interview_purchases: {
        Row: {
          id: string
          user_id: string
          package_id: string | null
          stripe_payment_intent_id: string | null
          stripe_checkout_session_id: string | null
          sessions_total: number
          sessions_used: number
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          package_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_checkout_session_id?: string | null
          sessions_total?: number
          sessions_used?: number
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          package_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_checkout_session_id?: string | null
          sessions_total?: number
          sessions_used?: number
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      mock_interview_availability: {
        Row: {
          id: string
          interviewer_id: string
          date: string
          start_time: string
          end_time: string
          is_available: boolean
          created_at: string
        }
        Insert: {
          id?: string
          interviewer_id: string
          date: string
          start_time: string
          end_time: string
          is_available?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          interviewer_id?: string
          date?: string
          start_time?: string
          end_time?: string
          is_available?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_interview_availability_interviewer_id_fkey"
            columns: ["interviewer_id"]
            isOneToOne: false
            referencedRelation: "mock_interview_interviewers"
            referencedColumns: ["id"]
          }
        ]
      }
      mock_interview_appointments: {
        Row: {
          id: string
          user_id: string
          purchase_id: string
          availability_id: string
          interviewer_id: string | null
          scheduled_date: string
          scheduled_start: string
          scheduled_end: string
          status: string
          admin_notes: string | null
          instructions: string | null
          canceled_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          purchase_id: string
          availability_id: string
          interviewer_id?: string | null
          scheduled_date: string
          scheduled_start: string
          scheduled_end: string
          status?: string
          admin_notes?: string | null
          instructions?: string | null
          canceled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          purchase_id?: string
          availability_id?: string
          interviewer_id?: string | null
          scheduled_date?: string
          scheduled_start?: string
          scheduled_end?: string
          status?: string
          admin_notes?: string | null
          instructions?: string | null
          canceled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_interview_appointments_interviewer_id_fkey"
            columns: ["interviewer_id"]
            isOneToOne: false
            referencedRelation: "mock_interview_interviewers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_interview_appointments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_pro: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "member"
      application_status:
        | "saved"
        | "applied"
        | "interviewing"
        | "offer"
        | "rejected"
      job_seniority:
        | "intern"
        | "junior"
        | "mid"
        | "senior"
        | "staff"
        | "principal"
        | "lead"
      job_status: "draft" | "pending" | "published" | "archived"
      job_type:
        | "full_time"
        | "part_time"
        | "contract"
        | "freelance"
        | "internship"
      locale: "pt" | "en"
      location_type: "remote" | "hybrid" | "onsite"
      resource_kind: "article" | "link" | "pdf" | "sheet" | "video"
      salary_period: "year" | "month" | "week" | "day" | "hour"
      subscription_status: "free" | "pro" | "canceled"
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
      app_role: ["admin", "member"],
      application_status: [
        "saved",
        "applied",
        "interviewing",
        "offer",
        "rejected",
      ],
      job_seniority: [
        "intern",
        "junior",
        "mid",
        "senior",
        "staff",
        "principal",
        "lead",
      ],
      job_status: ["draft", "pending", "published", "archived"],
      job_type: ["full_time", "part_time", "contract", "freelance", "internship"],
      locale: ["pt", "en"],
      location_type: ["remote", "hybrid", "onsite"],
      resource_kind: ["article", "link", "pdf", "sheet", "video"],
      salary_period: ["year", "month", "week", "day", "hour"],
      subscription_status: ["free", "pro", "canceled"],
    },
  },
} as const
