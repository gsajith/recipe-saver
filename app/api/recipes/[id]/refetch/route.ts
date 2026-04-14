import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseServer as supabase } from "@/lib/supabase";
import { extractRecipeMetadata } from "@/lib/recipeExtractor";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Fetch recipe to get its URL and verify ownership
    const { data: recipe } = await supabase
      .from("recipes")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // Re-extract cook time and servings from the original URL
    const { cookTime, servings } = await extractRecipeMetadata(recipe.url);

    const { error } = await supabase
      .from("recipes")
      .update({
        cook_time: cookTime,
        servings,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to update recipe" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ...recipe, cook_time: cookTime, servings });
  } catch (error) {
    console.error("Error refetching recipe:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
