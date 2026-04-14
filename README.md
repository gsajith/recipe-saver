# 🍳 Recipe Box - save your recipes

Save and organize recipes from any website or YouTube video. Automatically extracts recipe titles and thumbnails. Built with Next.js, TypeScript, Clerk, and Supabase.

## Setup (10 minutes)

### 1. Get API Keys

**Clerk** (https://clerk.com)

1. Create account and app
2. Go to **Settings > API Keys** and copy:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
3. Enable Google in **Settings > Social Connections**

**Supabase** (https://supabase.com)

1. Create project and wait for initialization
2. Go to **Settings > API** and copy:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### 2. Setup Database

In Supabase **SQL Editor**, create a new query and run the entire `supabase.sql` file. This creates:

- `recipes` table
- `recipe_tags` table
- Indexes and RLS security policies

### 3. Create `.env.local`

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx
```

### 4. Install and Run

```bash
pnpm install
pnpm dev
```

Visit **http://localhost:3000**, sign in with Google, and start saving recipes!

## How to Use

1. **Sign In** - Use your Google account
2. **Add Recipe** - Paste any recipe URL or YouTube link
3. **View Details** - Click a recipe card to open details
4. **Add Tags** - Type tags to organize (e.g., "dessert", "quick", "healthy")
5. **Delete** - Click the × button on any recipe

## Features

- **Works with any recipe site** - Uses Open Graph meta tags
- **YouTube support** - Extracts video thumbnail automatically
- **Custom tagging** - Organize recipes however you want
- **Secure** - Only you see your recipes (Row Level Security)
- **Responsive** - Works on desktop, tablet, and mobile

## Project Structure

```
app/
├── api/recipes/                 # GET/POST recipes
│   └── [id]/
│       ├── route.ts            # PUT/DELETE recipe
│       └── tags/route.ts        # POST manage tags
├── sign-in/[[...index]]/        # Clerk sign-in
├── sign-up/[[...index]]/        # Clerk sign-up
├── layout.tsx                   # Root layout + Clerk provider
├── page.tsx                     # Main dashboard
└── page.module.css

components/
├── RecipeForm.tsx               # URL input form
├── RecipeList.tsx               # Recipe grid
└── RecipeDetail.tsx             # Recipe modal + tag editor

lib/
├── supabase.ts                  # Database client
├── types.ts                     # TypeScript interfaces
└── recipeExtractor.ts           # URL scraping logic

middleware.ts                     # Authentication protection
supabase.sql                      # Database schema
```

## API Routes

| Method | Route                    | Purpose                |
| ------ | ------------------------ | ---------------------- |
| GET    | `/api/recipes`           | Get all user recipes   |
| POST   | `/api/recipes`           | Create recipe from URL |
| PUT    | `/api/recipes/[id]`      | Update recipe          |
| DELETE | `/api/recipes/[id]`      | Delete recipe          |
| POST   | `/api/recipes/[id]/tags` | Update recipe tags     |

## Troubleshooting

**"Cannot find module" errors**
→ Run `pnpm install`

**"Supabase connection error"**
→ Check your `.env.local` credentials

**"Sign-in not working"**
→ Verify Clerk API keys and Google OAuth is enabled

**"Recipes not saving"**
→ Check browser console for API errors; verify Supabase RLS policies ran

**"Thumbnail not showing"**
→ Some websites block scraping; YouTube always works

## Tech Stack

- **Frontend**: Next.js 16.2.3, React 19.2.4, TypeScript
- **Auth**: Clerk (Google OAuth)
- **Database**: Supabase (PostgreSQL with RLS)
- **Scraping**: Cheerio + Axios for Open Graph parsing

## Deployment

### Vercel (Recommended)

```bash
vercel deploy
```

Then add environment variables in Vercel dashboard.

### Docker

```bash
docker build -t recipe-saver .
docker run -p 3000:3000 recipe-saver
```

### Other Platforms

- AWS Amplify
- Railway
- Render
- Digital Ocean App Platform

## Future Ideas

- Search and filter recipes by tag
- Export recipes to PDF
- Star/favorite recipes
- Share recipes with other users
- Recipe notes and ratings
- Integration with recipe APIs

## License

MIT
