import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseServer as supabase } from "@/lib/supabase";

async function resolveUsername(username: string) {
  const { data } = await supabase
    .from("user_profiles")
    .select("clerk_user_id")
    .eq("username", username)
    .single();
  return data?.clerk_user_id ?? null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ isFollowing: false });
  }

  const { username } = await params;
  const targetId = await resolveUsername(username);

  if (!targetId) {
    return NextResponse.json({ isFollowing: false });
  }

  const { data } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", userId)
    .eq("following_id", targetId)
    .maybeSingle();

  return NextResponse.json({ isFollowing: !!data });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { username } = await params;
  const targetId = await resolveUsername(username);

  if (!targetId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (targetId === userId) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  const { error } = await supabase
    .from("follows")
    .insert({ follower_id: userId, following_id: targetId });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Already following" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to follow" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { username } = await params;
  const targetId = await resolveUsername(username);

  if (!targetId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", userId)
    .eq("following_id", targetId);

  if (error) {
    return NextResponse.json({ error: "Failed to unfollow" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
