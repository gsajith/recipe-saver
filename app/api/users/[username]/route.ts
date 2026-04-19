import { NextRequest, NextResponse } from "next/server";
import { supabaseServer as supabase } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;

  // Try username first, fall back to clerk_user_id for direct-ID links
  let { data: profile, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (error || !profile) {
    ({ data: profile, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("clerk_user_id", username)
      .single());
  }

  if (error || !profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const [{ count: followerCount }, { count: followingCount }] =
    await Promise.all([
      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", profile.clerk_user_id),
      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", profile.clerk_user_id),
    ]);

  return NextResponse.json({
    ...profile,
    follower_count: followerCount ?? 0,
    following_count: followingCount ?? 0,
  });
}
