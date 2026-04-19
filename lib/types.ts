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
}

export interface RecipeTag {
  id: string;
  recipe_id: string;
  tag: string;
  created_at: string;
}

export interface RecipeWithTags extends Recipe {
  tags: string[];
}

export interface UserProfile {
  id: string;
  clerk_user_id: string;
  username: string;
  created_at: string;
  updated_at: string;
}
