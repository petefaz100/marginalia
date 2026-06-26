// Database types for marginalia, kept in sync with supabase/migrations.
// Hand-written for now; once the Supabase CLI is linked we can regenerate
// these with `supabase gen types typescript`.

export type ArtworkStatus = "pending" | "approved" | "rejected";

export type NotificationKind =
  | "art_approved"
  | "art_rejected"
  | "reply_thread"
  | "reply_comment";

export type VoteTarget = "thread" | "comment";

// Who an applicant says they are, on the "apply to be a mod" form.
export type ModApplicantRole = "book_artist" | "artist_or_author" | "reader";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          handle: string;
          username: string | null;
          display_name: string | null;
          avatar_url: string | null;
          is_mod: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          handle: string;
          username?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          is_mod?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          handle?: string;
          username?: string | null;
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
      mod_applications: {
        Row: {
          id: string;
          name: string;
          email: string;
          role: ModApplicantRole;
          reason: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          role: ModApplicantRole;
          reason: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          role?: ModApplicantRole;
          reason?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          kind: NotificationKind;
          artwork_id: string | null;
          reason: string | null;
          note: string | null;
          art_title: string | null;
          art_image_url: string | null;
          book_id: string | null;
          actor_id: string | null;
          thread_id: string | null;
          comment_id: string | null;
          chapter_number: number | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipient_id: string;
          kind: NotificationKind;
          artwork_id?: string | null;
          reason?: string | null;
          note?: string | null;
          art_title?: string | null;
          art_image_url?: string | null;
          book_id?: string | null;
          actor_id?: string | null;
          thread_id?: string | null;
          comment_id?: string | null;
          chapter_number?: number | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          recipient_id?: string;
          kind?: NotificationKind;
          artwork_id?: string | null;
          reason?: string | null;
          note?: string | null;
          art_title?: string | null;
          art_image_url?: string | null;
          book_id?: string | null;
          actor_id?: string | null;
          thread_id?: string | null;
          comment_id?: string | null;
          chapter_number?: number | null;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_artwork_id_fkey";
            columns: ["artwork_id"];
            isOneToOne: false;
            referencedRelation: "artworks";
            referencedColumns: ["id"];
          },
        ];
      };
      threads: {
        Row: {
          id: string;
          book_id: string;
          chapter_id: string;
          author_id: string | null;
          title: string;
          body: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          book_id: string;
          chapter_id: string;
          author_id?: string | null;
          title: string;
          body?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          book_id?: string;
          chapter_id?: string;
          author_id?: string | null;
          title?: string;
          body?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          thread_id: string;
          parent_id: string | null;
          author_id: string | null;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          thread_id: string;
          parent_id?: string | null;
          author_id?: string | null;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          thread_id?: string;
          parent_id?: string | null;
          author_id?: string | null;
          body?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      votes: {
        Row: {
          user_id: string;
          target_type: VoteTarget;
          target_id: string;
          value: number;
          created_at: string;
        };
        Insert: {
          user_id: string;
          target_type: VoteTarget;
          target_id: string;
          value: number;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          target_type?: VoteTarget;
          target_id?: string;
          value?: number;
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
      has_username: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      can_see_chapter: {
        Args: { cid: string };
        Returns: boolean;
      };
      ensure_chapter_thread: {
        Args: { cid: string };
        Returns: string;
      };
      books_art_counts: {
        Args: Record<string, never>;
        Returns: { book_id: string; art_count: number }[];
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
