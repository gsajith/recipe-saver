import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get all recipes for the user with their tags
    const { data: recipes, error } = await supabase
      .from("recipes")
      .select("*")
      .eq("user_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to fetch recipes" },
        { status: 500 },
      );
    }

    // Get tags for each recipe
    const recipesWithTags = await Promise.all(
      recipes.map(async (recipe) => {
        const { data: tags } = await supabase
          .from("recipe_tags")
          .select("tag")
          .eq("recipe_id", recipe.id);

        return {
          ...recipe,
          tags: tags?.map((t) => t.tag) || [],
        };
      }),
    );

    return NextResponse.json(recipesWithTags);
  } catch (error) {
    console.error("Error fetching recipes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
