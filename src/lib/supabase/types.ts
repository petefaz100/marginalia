// Database types for marginalia, kept in sync with supabase/migrations.
// Hand-written for now; once the Supabase CLI is linked we can regenerate
// these with `supabase gen types typescript`.

export type ArtworkStatus = "pending" | "approved" | "rejected";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          handle: string;
          display_name: string | null;
          avatar_url: string | null;
          is_mod: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          handle: string;
          display_name?: string | null;
          avatar_url?: string | null;
          is_mod?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          handle?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          is_mod?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      books: {
        Row: {
          id: string;
          title: string;
          author: string | null;
          year: number | null;
          series: string | null;
          cover_url: string | null;
          google_books_id: string | null;
          is_indie: boolean;
          submitted_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          author?: string | null;
          year?: number | null;
          series?: string | null;
          cover_url?: string | null;
          google_books_id?: string | null;
          is_indie?: boolean;
          submitted_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          author?: string | null;
          year?: number | null;
          series?: string | null;
          cover_url?: string | null;
          google_books_id?: string | null;
          is_indie?: boolean;
          submitted_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      chapters: {
        Row: {
          id: string;
          book_id: string;
          number: number;
          title: string | null;
        };
        Insert: {
          id?: string;
          book_id: string;
          number: number;
          title?: string | null;
        };
        Update: {
          id?: string;
          book_id?: string;
          number?: number;
          title?: string | null;
        };
        Relationships: [];
      };
      artworks: {
        Row: {
          id: string;
          book_id: string;
          chapter_id: string;
          image_url: string;
          title: string | null;
          artist_handle: string | null;
          credit_url: string | null;
          uploaded_by: string | null;
          status: ArtworkStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          book_id: string;
          chapter_id: string;
          image_url: string;
          title?: string | null;
          artist_handle?: string | null;
          credit_url?: string | null;
          uploaded_by?: string | null;
          status?: ArtworkStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          book_id?: string;
          chapter_id?: string;
          image_url?: string;
          title?: string | null;
          artist_handle?: string | null;
          credit_url?: string | null;
          uploaded_by?: string | null;
          status?: ArtworkStatus;
          created_at?: string;
        };
        Relationships: [];
      };
      reading_progress: {
        Row: {
          user_id: string;
          book_id: string;
          chapter_read_through: number;
        };
        Insert: {
          user_id: string;
          book_id: string;
          chapter_read_through?: number;
        };
        Update: {
          user_id?: string;
          book_id?: string;
          chapter_read_through?: number;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          artwork_id: string;
          reported_by: string | null;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          artwork_id: string;
          reported_by?: string | null;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          artwork_id?: string;
          reported_by?: string | null;
          reason?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      is_mod: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
