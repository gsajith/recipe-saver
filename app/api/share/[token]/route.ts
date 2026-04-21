import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseServer as supabase } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { userId } = await auth();
    const { token } = await params;

    // Look up recipe by share token
    const { data: recipe, error } = await supabase
      .from("recipes")
      .select("id, title, url, thumbnail_url, cook_time, servings, user_id")
      .eq("share_token", token)
      .single();

    if (error || !recipe) {
      return NextResponse.json({ error: "Share link not found" }, { status: 404 });
    }

    // Get sharer's display name
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("username")
      .eq("clerk_user_id", recipe.user_id)
      .single();

    // Get tags
    const { data: tagRows } = await supabase
      .from("recipe_tags")
      .select("tag")
      .eq("recipe_id", recipe.id);

    return NextResponse.json({
      id: recipe.id,
      title: recipe.title,
      url: recipe.url,
      thumbnail_url: recipe.thumbnail_url,
      cook_time: recipe.cook_time,
      servings: recipe.servings,
      tags: tagRows?.map((r) => r.tag) ?? [],
      sharer_username: profile?.username ?? null,
      is_own: userId != null && userId === recipe.user_id,
    });
  } catch (error) {
    console.error("Error fetching shared recipe:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
