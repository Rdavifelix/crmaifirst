import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getIntegrationKeyWithClient } from "../_shared/get-integration-key.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface InstagramProfile {
  id: string;
  username: string;
  full_name: string;
  profile_pic_url: string;
  profile_pic_url_hd?: string;
  biography?: string;
  follower_count?: number;
  following_count?: number;
  media_count?: number;
  is_private?: boolean;
  is_verified?: boolean;
  external_url?: string;
  category?: string;
}

interface InstagramPost {
  id: string;
  code?: string;
  taken_at?: number;
  media_type?: number;
  caption_text?: string;
  like_count?: number;
  comment_count?: number;
  thumbnail_url?: string;
  video_url?: string;
  image_versions2?: any;
}

interface InstagramStory {
  id: string;
  taken_at?: number;
  media_type?: number;
  image_versions2?: any;
  video_versions?: any[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId, instagramUsername } = await req.json();
    
    if (!leadId || !instagramUsername) {
      throw new Error("leadId and instagramUsername are required");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // Initialize Supabase client early so we can use it to fetch keys
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const RAPIDAPI_KEY = await getIntegrationKeyWithClient(supabase, "rapidapi", "api_key", "RAPIDAPI_KEY");
    const OPENAI_API_KEY = await getIntegrationKeyWithClient(supabase, "openai", "api_key", "OPENAI_API_KEY");

    if (!RAPIDAPI_KEY) {
      throw new Error("RAPIDAPI_KEY is not configured");
    }

    // Clean username (remove @ if present)
    const cleanUsername = instagramUsername.replace(/^@/, "").trim();
    const usernameOrUrl = cleanUsername.startsWith("http")
      ? cleanUsername
      : `https://www.instagram.com/${cleanUsername}/`;

    console.log(`Fetching Instagram data for: ${cleanUsername}`);

    // Fetch profile data using POST endpoint that returns full bio
    const profileResponse = await fetch(
      "https://instagram-scraper-stable-api.p.rapidapi.com/ig_get_fb_profile.php",
      {
        method: "POST",
        headers: {
          "x-rapidapi-host": "instagram-scraper-stable-api.p.rapidapi.com",
          "x-rapidapi-key": RAPIDAPI_KEY,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `username_or_url=${encodeURIComponent(usernameOrUrl)}`,
      }
    );

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.error("Instagram API error:", profileResponse.status, errorText);
      throw new Error(`Instagram API error: ${profileResponse.status}`);
    }

    const profileData = await profileResponse.json();
    console.log("Profile data received:", JSON.stringify(profileData).slice(0, 800));

    // RapidAPI sometimes returns HTTP 200 with `{ error: "..." }`
    if (profileData?.error) {
      console.error("Instagram API returned error:", profileData);
      throw new Error(profileData.error);
    }

    // The response is the user object directly (no user_data wrapper)
    const user = profileData;
    const userId = user?.id ?? user?.pk ?? null;

    if (!userId) {
      console.error("Invalid profile response:", profileData);
      throw new Error("Could not find Instagram profile");
    }

    const instagramData: InstagramProfile = {
      id: String(userId),
      username: user.username || cleanUsername,
      full_name: user.full_name || "",
      profile_pic_url: user.profile_pic_url || "",
      profile_pic_url_hd: user.hd_profile_pic_url_info?.url || user.profile_pic_url || "",
      biography: user.biography || "",
      follower_count: user.follower_count || 0,
      following_count: user.following_count || 0,
      media_count: user.media_count || 0,
      is_private: user.is_private || false,
      is_verified: user.is_verified || false,
      external_url: user.external_url || "",
      category: user.category || "",
    };

    // Fetch user posts from dedicated endpoint
    const posts: InstagramPost[] = [];
    try {
      console.log("Fetching posts from get_ig_user_posts endpoint...");
      const postsResponse = await fetch(
        "https://instagram-scraper-stable-api.p.rapidapi.com/get_ig_user_posts.php",
        {
          method: "POST",
          headers: {
            "x-rapidapi-host": "instagram-scraper-stable-api.p.rapidapi.com",
            "x-rapidapi-key": RAPIDAPI_KEY,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          // This endpoint accepts username or URL; using username is the most reliable.
          body: `username_or_url=${encodeURIComponent(cleanUsername)}&amount=12`,
        }
      );

      if (postsResponse.ok) {
        const postsData = await postsResponse.json();
        console.log("Posts data received:", JSON.stringify(postsData).slice(0, 500));

        const rawPosts: any[] =
          (Array.isArray(postsData?.posts) && postsData.posts) ||
          (Array.isArray(postsData?.data?.posts) && postsData.data.posts) ||
          (Array.isArray(postsData?.items) && postsData.items) ||
          (Array.isArray(postsData?.data?.items) && postsData.data.items) ||
          [];

        for (const item of rawPosts.slice(0, 12)) {
          const node = (item as any)?.node ?? item;
          posts.push({
            id: String(node.id || node.pk || node.code),
            code: node.shortcode || node.code,
            taken_at: node.taken_at_timestamp || node.taken_at,
            media_type: node.media_type || (node.is_video ? 2 : 1),
            caption_text:
              node.edge_media_to_caption?.edges?.[0]?.node?.text ||
              node.caption?.text ||
              node.caption_text ||
              "",
            like_count: node.edge_liked_by?.count || node.like_count || 0,
            comment_count: node.edge_media_to_comment?.count || node.comment_count || 0,
            thumbnail_url:
              node.thumbnail_src ||
              node.display_url ||
              node.thumbnail_url ||
              node.image_versions2?.candidates?.[0]?.url ||
              "",
            video_url: node.video_url || node.video_versions?.[0]?.url || null,
          });
        }

        console.log(`Parsed posts: ${rawPosts.length} / kept: ${posts.length}`);
      }
    } catch (postsError) {
      console.log("Could not fetch posts (non-critical):", postsError);
    }

    // Try to fetch stories (may fail if account is private)
    let stories: InstagramStory[] = [];
    try {
      const storiesResponse = await fetch(
        `https://instagram-scraper-stable-api.p.rapidapi.com/get_ig_user_stories.php`,
        {
          method: "POST",
          headers: {
            "x-rapidapi-host": "instagram-scraper-stable-api.p.rapidapi.com",
            "x-rapidapi-key": RAPIDAPI_KEY,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: `username=${encodeURIComponent(cleanUsername)}&username_or_url=${encodeURIComponent(usernameOrUrl)}`,
        }
      );

      if (storiesResponse.ok) {
        const storiesData = await storiesResponse.json();
        console.log("Stories data received:", JSON.stringify(storiesData).slice(0, 500));
        
        const storyItems = storiesData?.items || storiesData?.reels_media?.[0]?.items || [];
        for (const story of storyItems.slice(0, 10)) {
          stories.push({
            id: story.id || story.pk,
            taken_at: story.taken_at,
            media_type: story.media_type,
            image_versions2: story.image_versions2,
            video_versions: story.video_versions,
          });
        }
      }
    } catch (storyError) {
      console.log("Could not fetch stories (may be private):", storyError);
    }

    // Update lead with Instagram data
    const { error: updateError } = await supabase
      .from("leads")
      .update({
        instagram_username: cleanUsername,
        instagram_data: {
          ...instagramData,
          fetched_at: new Date().toISOString(),
          posts_count: posts.length,
          stories_count: stories.length,
        },
        avatar_url: instagramData.profile_pic_url_hd || instagramData.profile_pic_url || null,
      })
      .eq("id", leadId);

    if (updateError) {
      console.error("Error updating lead:", updateError);
      throw new Error(`Failed to update lead: ${updateError.message}`);
    }

    // Delete existing Instagram content for this lead
    await supabase
      .from("lead_instagram_content")
      .delete()
      .eq("lead_id", leadId);

    // Transcribe images with AI if we have the API key
    const contentToInsert: any[] = [];

    // Process posts
    for (const post of posts) {
      let transcription = null;
      
      // Transcribe post content using AI
      if (OPENAI_API_KEY && post.thumbnail_url) {
        try {
          const transcribeResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "user",
                  content: [
                    {
                     type: "text",
                      text: "Analisa esta imagem do Instagram. Descreve: 1) O que aparece na imagem 2) Texto visível 3) Tom/mood da imagem 4) Insights sobre o dono do perfil. Sê conciso (máx 100 palavras).",
                    },
                    {
                      type: "image_url",
                      image_url: { url: post.thumbnail_url },
                    },
                  ],
                },
              ],
            }),
          });

          if (transcribeResponse.ok) {
            const transcribeData = await transcribeResponse.json();
            transcription = transcribeData.choices?.[0]?.message?.content || null;
          }
        } catch (transcribeError) {
          console.log("Could not transcribe post:", transcribeError);
        }
      }

      contentToInsert.push({
        lead_id: leadId,
        content_type: post.media_type === 2 ? "reel" : "post",
        instagram_id: post.id,
        media_url: post.thumbnail_url || post.video_url,
        thumbnail_url: post.thumbnail_url,
        caption: post.caption_text,
        transcription,
        likes_count: post.like_count,
        comments_count: post.comment_count,
        taken_at: post.taken_at ? new Date(post.taken_at * 1000).toISOString() : null,
        raw_data: post,
      });
    }

    // Process stories
    for (const story of stories) {
      const mediaUrl = story.image_versions2?.candidates?.[0]?.url || 
                       story.video_versions?.[0]?.url || null;
      
      let transcription = null;
      
      // Transcribe story content using AI
      if (OPENAI_API_KEY && mediaUrl) {
        try {
          const transcribeResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "user",
                  content: [
                    {
                     type: "text",
                      text: "Analisa este story do Instagram. Descreve: 1) O que aparece 2) Texto visível (muito importante!) 3) Tom/mood 4) Contexto sobre o que a pessoa está a partilhar. Sê conciso (máx 80 palavras).",
                    },
                    {
                      type: "image_url",
                      image_url: { url: mediaUrl },
                    },
                  ],
                },
              ],
            }),
          });

          if (transcribeResponse.ok) {
            const transcribeData = await transcribeResponse.json();
            transcription = transcribeData.choices?.[0]?.message?.content || null;
          }
        } catch (transcribeError) {
          console.log("Could not transcribe story:", transcribeError);
        }
      }

      contentToInsert.push({
        lead_id: leadId,
        content_type: "story",
        instagram_id: story.id,
        media_url: mediaUrl,
        thumbnail_url: story.image_versions2?.candidates?.[0]?.url,
        transcription,
        taken_at: story.taken_at ? new Date(story.taken_at * 1000).toISOString() : null,
        raw_data: story,
      });
    }

    // Insert content if any
    if (contentToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("lead_instagram_content")
        .insert(contentToInsert);

      if (insertError) {
        console.error("Error inserting content:", insertError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        profile: instagramData,
        postsCount: posts.length,
        storiesCount: stories.length,
        contentSaved: contentToInsert.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("enrich-instagram error:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});