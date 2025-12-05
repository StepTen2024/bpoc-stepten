# ARCHIVED ROUTES

**Date Archived:** 2024-12-05

**Reason:** Starting fresh with clean routes using new Supabase schema. Old routes were messy and using Railway database.

## Structure

- `admin/` - All admin routes
- `user-old/` - Old user routes
- `users-old/` - Old users routes  
- `games/` - Game/assessment routes
- `leaderboards/` - Leaderboard routes
- `recruiter/` - Recruiter routes
- `public/` - Public API routes
- `og/` - OG image generation routes
- `other-routes/` - Individual route files
- All other directories - Various old routes

## To Reference Old Routes

If you need to see how something was done before, check the archived routes. But DO NOT copy them - build new clean versions instead.

## New Routes Location

All new routes should be in `/src/app/api/` with clean structure:
- `/api/candidates/`
- `/api/jobs/`
- `/api/applications/`
- `/api/resumes/`
- `/api/assessments/`
- etc.

