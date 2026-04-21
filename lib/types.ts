export interface Recipe {
  id: string;
  user_id: string;
  url: string;
  title: string;
  thumbnail_url: string | null;
  cook_time: string | null;
  servings: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  tags: string[];
}

export interface FeedRecipe extends Recipe {
  attribution_username: string | null;
}

export interface UserProfile {
  id: string;
  clerk_user_id: string;
  username: string;
  created_at: string;
  updated_at: string;
}
