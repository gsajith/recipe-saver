import Anthropic from "@anthropic-ai/sdk";
import axios from "axios";
import * as cheerio from "cheerio";

interface RecipeMetadata {
  title: string;
  thumbnailUrl: string | null;
  cookTime: string | null;
  servings: string | null;
}

/**
 * Extract recipe metadata from a URL
 * Supports recipe websites and YouTube videos
 */
export async function extractRecipeMetadata(
  url: string,
): Promise<RecipeMetadata> {
  try {
    // Validate URL format
    const urlObj = new URL(url);

    // Check if it's a YouTube video
    if (isYouTubeUrl(urlObj)) {
      return await extractYouTubeMetaWithTitle(urlObj);
    }

    // Check if it's an Instagram URL
    if (isInstagramUrl(urlObj)) {
      return await extractInstagramMeta(urlObj);
    }

    // For recipe websites, use Open Graph meta tags
    return await extractOpenGraphMeta(url);
  } catch (error) {
    console.error("Error extracting recipe metadata:", error);
    throw new Error("Failed to extract recipe metadata from URL");
  }
}

async function extractYouTubeMetaWithTitle(url: URL): Promise<RecipeMetadata> {
  let videoId: string | null = null;

  if (url.hostname.includes("youtu.be")) {
    videoId = url.pathname.slice(1);
  } else {
    videoId = url.searchParams.get("v");
  }

  if (!videoId) {
    throw new Error("Invalid YouTube URL");
  }

  // Fetch the title from YouTube page
  const title = await extractYouTubeTitle(videoId);

  // Use YouTube's standard thumbnail URL
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  return {
    title,
    thumbnailUrl,
    cookTime: null,
    servings: null,
  };
}

export function isYouTubeUrl(url: URL): boolean {
  return (
    url.hostname.includes("youtube.com") || url.hostname.includes("youtu.be")
  );
}

async function extractYouTubeTitle(videoId: string): Promise<string> {
  try {
    // Fetch the YouTube watch page to extract the title from meta tags
    const { data } = await axios.get(
      `https://www.youtube.com/watch?v=${videoId}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          DNT: "1",
          Connection: "keep-alive",
          "Upgrade-Insecure-Requests": "1",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1",
          "Cache-Control": "max-age=0",
        },
        timeout: 15000,
      },
    );

    const $ = cheerio.load(data);

    // Try Open Graph title first
    let title = $('meta[property="og:title"]').attr("content");

    // Fallback to meta description
    if (!title) {
      title = $('meta[name="title"]').attr("content");
    }

    // Fallback to title tag
    if (!title) {
      title = $("title").text();
      // YouTube title tag includes " - YouTube" at the end, so remove it
      if (title.includes(" - YouTube")) {
        title = title.replace(" - YouTube", "");
      }
    }

    return title || "YouTube Video";
  } catch (error) {
    console.error("Error extracting YouTube title:", error);
    return "YouTube Video";
  }
}

export function isInstagramUrl(url: URL): boolean {
  return url.hostname.includes("instagram.com");
}

/** Return a human-readable name for the Instagram URL based on its path pattern */
function instagramTitle(url: URL): string {
  const path = url.pathname;
  if (path.startsWith("/reels/") || path.startsWith("/reel/")) {
    return "Instagram Reel";
  }
  if (path.startsWith("/tv/")) {
    return "Instagram Video";
  }
  if (path.startsWith("/p/")) {
    return "Instagram Post";
  }
  // /username/... — story or profile-level link
  return "Instagram Post";
}

async function extractInstagramMeta(url: URL): Promise<RecipeMetadata> {
  const fallbackTitle = instagramTitle(url);

  // Instagram serves full server-rendered HTML (og tags + JSON data) to crawlers.
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    Connection: "keep-alive",
  };

  let thumbnailUrl: string | null = null;
  let caption: string | null = null;

  try {
    const { data } = await axios.get(url.href, {
      headers,
      timeout: 15000,
      maxRedirects: 5,
    });
    const $ = cheerio.load(data);

    // Prefer image_versions2 candidates over og:image — the og:image has a
    // composite play-button overlay (stp=cmp1_...) while image_versions2 urls
    // use stp=dst-jpg_e15_tt6 which is the clean still frame at full resolution.
    const cleanThumb = extractInstagramCleanThumbnail(data);
    thumbnailUrl =
      cleanThumb ||
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      null;

    // og:title format: 'Username on Instagram: "full caption text"'
    // Strip the prefix to get just the caption.
    const ogTitle = $('meta[property="og:title"]').attr("content") || "";
    const captionMatch = ogTitle.match(/on Instagram:\s*"?([\s\S]+)"?\s*$/i);
    caption = captionMatch ? captionMatch[1].trim() : null;
  } catch {
    // fetch failed — proceed with null thumbnail and fallback title
  }

  const extracted = await extractMetadataFromCaption(caption, fallbackTitle);
  return { ...extracted, thumbnailUrl };
}

/**
 * Pull the highest-resolution clean thumbnail out of the page's embedded
 * image_versions2 JSON. These URLs have no composite play-button overlay
 * (they use stp=dst-jpg_e15 rather than stp=cmp1_dst-jpg_e35).
 */
function extractInstagramCleanThumbnail(html: string): string | null {
  const idx = html.indexOf("image_versions2");
  if (idx === -1) return null;
  // URLs inside JSON blocks use escaped slashes (\/) — normalize to / first
  const chunk = html.slice(idx, idx + 3000).replace(/\\\//g, "/");
  // Match the first https CDN jpg URL in the candidates array
  const m = chunk.match(/https:\/\/scontent[^"]+\.jpg[^"]*/);
  if (!m) return null;
  // The URL may contain HTML entities (& → &amp;) — unescape them
  return m[0].replace(/&amp;/g, "&");
}

/**
 * Use Claude Haiku to extract the recipe name, cook time, and servings from
 * an Instagram caption. Falls back gracefully if the key isn't set or the
 * call fails.
 */
async function extractMetadataFromCaption(
  caption: string | null,
  fallbackTitle: string,
): Promise<Omit<RecipeMetadata, "thumbnailUrl">> {
  if (!caption || !process.env.ANTHROPIC_API_KEY) {
    return { title: fallbackTitle, cookTime: null, servings: null };
  }

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 128,
      messages: [
        {
          role: "user",
          content: `Extract recipe information from this Instagram caption and return it as JSON with exactly these keys:
- "title": the recipe name (string, or "Instagram Recipe" if not found)
- "cookTime": total cook/prep time as a short string like "30 min" or "1 hr 15 min" (null if not mentioned)
- "servings": serving count as a short string like "4" or "serves 4-6" (null if not mentioned)

Return only valid JSON, no explanation.

Caption:
${caption}`,
        },
      ],
    });

    const block = response.content[0];
    if (block.type === "text") {
      const raw = block.text
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "");
      const parsed = JSON.parse(raw);
      return {
        title: parsed.title || fallbackTitle,
        cookTime: parsed.cookTime || null,
        servings: parsed.servings || null,
      };
    }
  } catch (error) {
    console.error("Error calling Claude for caption extraction:", error);
  }

  return { title: fallbackTitle, cookTime: null, servings: null };
}

/** Convert ISO 8601 duration (e.g. "PT1H30M") to human-readable "1 hr 30 min" */
function parseIsoDuration(duration: string): string | null {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!match) return null;
  const h = parseInt(match[1] || "0");
  const m = parseInt(match[2] || "0");
  if (h === 0 && m === 0) return null;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}

async function extractOpenGraphMeta(url: string): Promise<RecipeMetadata> {
  try {
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        DNT: "1",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Cache-Control": "max-age=0",
      },
      timeout: 15000,
      maxRedirects: 5,
    });

    const $ = cheerio.load(data);

    // Try Open Graph meta tags first
    let title = $('meta[property="og:title"]').attr("content");
    let thumbnailUrl = $('meta[property="og:image"]').attr("content");

    // Fallback to Twitter meta tags
    if (!title) {
      title = $('meta[name="twitter:title"]').attr("content");
    }
    if (!thumbnailUrl) {
      thumbnailUrl = $('meta[name="twitter:image"]').attr("content");
    }

    // Fallback to regular title tag
    if (!title) {
      title = $("title").text();
    }

    // Fallback to finding recipe images more intelligently
    if (!thumbnailUrl) {
      // Look for images with recipe-related alt text or class names
      const recipeImg =
        $("img[alt*='recipe']").attr("src") ||
        $("img[alt*='food']").attr("src") ||
        $("img[alt*='dish']").attr("src") ||
        $("img.recipe-image").attr("src") ||
        $("img.recipe-photo").attr("src") ||
        $("img[class*='recipe']").attr("src") ||
        $("img[class*='food']").attr("src") ||
        $(".recipe img").first().attr("src") ||
        $(".post-image img").attr("src") ||
        $(".featured-image img").attr("src") ||
        $("article img").first().attr("src");

      if (recipeImg) {
        thumbnailUrl = recipeImg;
      }
    }

    // Make relative URLs absolute
    if (thumbnailUrl && !thumbnailUrl.startsWith("http")) {
      const baseUrl = new URL(url);
      thumbnailUrl = new URL(thumbnailUrl, baseUrl).href;
    }

    // Reject SVG data URIs (lazy-loading placeholders)
    if (thumbnailUrl && thumbnailUrl.startsWith("data:image/svg")) {
      thumbnailUrl = undefined;
    }

    // Extract cook time and servings via cascading fallbacks
    let cookTime: string | null = null;
    let servings: string | null = null;

    // 1. JSON-LD structured data (Schema.org Recipe) — used by sites wanting Google rich results
    $('script[type="application/ld+json"]').each((_, el) => {
      if (cookTime && servings) return;
      try {
        const json = JSON.parse($(el).html() || "");
        const schemas = Array.isArray(json) ? json : [json];
        for (const schema of schemas) {
          const type = schema["@type"];
          const isRecipe =
            type === "Recipe" ||
            (Array.isArray(type) && type.includes("Recipe"));
          if (isRecipe) {
            if (!cookTime) {
              const rawTime = schema.totalTime || schema.cookTime;
              if (rawTime) cookTime = parseIsoDuration(String(rawTime));
            }
            if (!servings && schema.recipeYield != null) {
              const raw = Array.isArray(schema.recipeYield)
                ? schema.recipeYield[0]
                : schema.recipeYield;
              servings = String(raw).trim() || null;
            }
            break;
          }
        }
      } catch {
        // invalid JSON, skip
      }
    });

    // 2. Microdata (itemprop attributes)
    if (!cookTime) {
      const el = $('[itemprop="totalTime"]').first();
      const dt = el.attr("datetime");
      cookTime = dt ? parseIsoDuration(dt) : el.text().trim() || null;
    }
    if (!cookTime) {
      const dt = $('[itemprop="cookTime"]').first().attr("datetime");
      if (dt) cookTime = parseIsoDuration(dt);
    }
    if (!servings) {
      const el = $('[itemprop="recipeYield"]').first();
      servings = el.attr("content") || el.text().trim() || null;
    }

    // 3. WP Recipe Maker plugin
    if (!cookTime) {
      const val = $(".wprm-recipe-total-time").first().text().trim();
      const unit = $(".wprm-recipe-total-time-unit").first().text().trim();
      if (val) cookTime = unit ? `${val} ${unit}` : val;
    }
    if (!cookTime) {
      const val = $(".wprm-recipe-cook-time").first().text().trim();
      const unit = $(".wprm-recipe-cook-time-unit").first().text().trim();
      if (val) cookTime = unit ? `${val} ${unit}` : val;
    }
    if (!servings) {
      const val = $(".wprm-recipe-servings").first().text().trim();
      const unit = $(".wprm-recipe-servings-unit").first().text().trim();
      if (val) servings = unit ? `${val} ${unit}` : val;
    }

    // 4. Tasty Recipes plugin
    if (!cookTime) {
      cookTime = $(".tasty-recipes-total-time").first().text().trim() || null;
    }
    if (!servings) {
      servings = $(".tasty-recipes-yield").first().text().trim() || null;
    }

    // 5. Regex-based fallback for common patterns in page source
    if (!cookTime || !servings) {
      const html = data;

      // Cook time patterns: look for numbers followed by time units
      // Matches: "30 minutes", "1.5 hours", "1 hr", "1 hour 30 minutes", etc.
      if (!cookTime) {
        const cookTimeMatch = html.match(
          /(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|minutes?|mins?)\s*(?:and\s*)?(?:(\d+)\s*(?:minutes?|mins?))?/i,
        );
        if (cookTimeMatch) {
          let timeStr = cookTimeMatch[0].trim();
          // Clean up extra text
          timeStr = timeStr.replace(/[^0-9a-z\s]/gi, " ").trim();
          // Limit length
          if (timeStr && timeStr.length < 50) cookTime = timeStr;
        }
      }

      // Servings patterns: look for "X servings", "Yields X", "Makes X", "4 servings", etc.
      // Matches numbers that appear near serving/yield keywords
      if (!servings) {
        const servingsMatch = html.match(
          /(?:serves?|servings?|yields?|makes?|prep\s+for)\s*(?:about\s+)?(\d+)(?:\s*-\s*(\d+))?\s*(?:servings?|people|persons)?/i,
        );
        if (servingsMatch) {
          const num1 = servingsMatch[1];
          const num2 = servingsMatch[2];
          servings = num2 ? `${num1}-${num2}` : num1;
        }
      }
    }

    return {
      title: title || "Untitled Recipe",
      thumbnailUrl: thumbnailUrl || null,
      cookTime,
      servings,
    };
  } catch (error) {
    console.error("Error fetching or parsing URL:", error);
    if (axios.isAxiosError(error)) {
      console.error("Axios error details:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        headers: error.response?.headers,
      });

      // If the site blocks us (403, 503, etc.), provide a fallback
      if (
        error.response?.status &&
        (error.response.status === 403 ||
          error.response.status === 503 ||
          error.response.status >= 500)
      ) {
        console.log(
          "Site appears to block automated requests, using fallback extraction",
        );
        return {
          title: "Untitled Recipe",
          thumbnailUrl: null,
          cookTime: null,
          servings: null,
        };
      }
    }
    throw new Error("Failed to fetch recipe data from URL");
  }
}
