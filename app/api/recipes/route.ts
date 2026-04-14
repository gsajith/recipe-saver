import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseServer as supabase } from "@/lib/supabase";
import { extractRecipeMetadata } from "@/lib/recipeExtractor";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Extract metadata from URL
    const { title, thumbnailUrl, cookTime, servings } = await extractRecipeMetadata(url);

    // Save recipe to Supabase
    const { data, error } = await supabase
      .from("recipes")
      .insert({
        user_id: userId,
        url,
        title,
        thumbnail_url: thumbnailUrl,
        cook_time: cookTime,
        servings,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      // Check for unique constraint violation
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "You have already saved this recipe" },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { error: "Failed to save recipe" },
        { status: 500 },
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error creating recipe:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all recipes for the user with their tags
    const { data: recipes, error } = await supabase
      .from("recipes")
      .select("*")
      .eq("user_id", userId)
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
