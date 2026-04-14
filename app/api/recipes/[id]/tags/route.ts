import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseServer as supabase } from "@/lib/supabase";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { tags } = await req.json();

    if (!Array.isArray(tags)) {
      return NextResponse.json(
        { error: "Tags must be an array" },
        { status: 400 },
      );
    }

    // Verify recipe ownership
    const { data: recipe } = await supabase
      .from("recipes")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // Delete existing tags
    await supabase.from("recipe_tags").delete().eq("recipe_id", id);

    // Insert new tags
    if (tags.length > 0) {
      const tagsToInsert = tags.map((tag: string) => ({
        recipe_id: id,
        tag: tag.toLowerCase().trim(),
      }));

      const { error } = await supabase.from("recipe_tags").insert(tagsToInsert);

      if (error) {
        console.error("Tag error:", error);
        return NextResponse.json(
          { error: "Failed to add tags" },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ success: true, tags });
  } catch (error) {
    console.error("Error managing tags:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
