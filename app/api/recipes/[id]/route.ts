import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseServer as supabase } from "@/lib/supabase";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { title, url, tags, thumbnail_url, cook_time, servings, notes } = body;

    // Verify ownership
    const { data: recipe } = await supabase
      .from("recipes")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // Build update object
    const updateData: any = { updated_at: new Date().toISOString() };
    if (title !== undefined) updateData.title = title;
    if (url !== undefined) updateData.url = url;
    if (thumbnail_url !== undefined) updateData.thumbnail_url = thumbnail_url;
    if (cook_time !== undefined) updateData.cook_time = cook_time;
    if (servings !== undefined) updateData.servings = servings;
    if (notes !== undefined) updateData.notes = notes || null;

    // Update recipe
    const { error: updateError } = await supabase
      .from("recipes")
      .update(updateData)
      .eq("id", id);

    if (updateError) {
      console.error("Supabase error:", updateError);
      return NextResponse.json(
        { error: "Failed to update recipe" },
        { status: 500 },
      );
    }

    // Update tags if provided
    if (tags && Array.isArray(tags)) {
      // Delete existing tags
      await supabase.from("recipe_tags").delete().eq("recipe_id", id);

      // Insert new tags
      if (tags.length > 0) {
        const tagsToInsert = tags.map((tag: string) => ({
          recipe_id: id,
          tag,
        }));

        const { error: tagError } = await supabase
          .from("recipe_tags")
          .insert(tagsToInsert);

        if (tagError) {
          console.error("Tag error:", tagError);
          return NextResponse.json(
            { error: "Failed to update tags" },
            { status: 500 },
          );
        }
      }
    }

    // Get updated recipe with tags
    const { data: updatedTags } = await supabase
      .from("recipe_tags")
      .select("tag")
      .eq("recipe_id", id);

    return NextResponse.json({
      ...recipe,
      ...updateData,
      tags: updatedTags?.map((t) => t.tag) || [],
    });
  } catch (error) {
    console.error("Error updating recipe:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const { data: recipe } = await supabase
      .from("recipes")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // Delete tags first (due to foreign key constraint)
    await supabase.from("recipe_tags").delete().eq("recipe_id", id);

    // Delete recipe
    const { error } = await supabase.from("recipes").delete().eq("id", id);

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to delete recipe" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting recipe:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
