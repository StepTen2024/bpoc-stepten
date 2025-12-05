# Route Groups Structure

## ✅ Clean Organization with Route Groups

Route groups `(folder)` are for **file organization only** - they don't affect URLs.

## Structure

```
src/app/
├── (admin)/              # Route group for admin pages
│   └── admin/           # Actual URL path starts here
│       ├── dashboard/   → /admin/dashboard
│       ├── jobs/        → /admin/jobs
│       └── users/       → /admin/users
│
├── (candidate)/         # Route group for candidate pages
│   └── candidate/      # Actual URL path starts here
│       ├── dashboard/   → /candidate/dashboard
│       ├── jobs/        → /candidate/jobs
│       └── profile/     → /candidate/profile
│
├── (recruiter)/         # Route group for recruiter pages
│   └── recruiter/      # Actual URL path starts here
│       ├── dashboard/   → /recruiter/dashboard
│       ├── jobs/        → /recruiter/jobs
│       └── candidates/  → /recruiter/candidates
│
└── (public)/            # Route group for public pages
    └── (root pages)     # No prefix = root URLs
        ├── jobs/        → /jobs
        ├── resume-builder/ → /resume-builder
        └── page.tsx     → /
```

## Benefits

1. **Clean Organization** - All admin pages together, all candidate pages together
2. **Easy to Find** - Know exactly where each user type's code lives
3. **Unique URLs** - Each path is unique: `/admin/dashboard` vs `/candidate/dashboard`
4. **Scalable** - Easy to add new features per user type

## How It Works

- Route groups `(folder)` are **ignored** in URLs
- Only the path **after** the route group matters
- `(admin)/admin/dashboard/page.tsx` → `/admin/dashboard` ✅
- `(candidate)/candidate/dashboard/page.tsx` → `/candidate/dashboard` ✅

## As We Rebuild

- Keep route groups for organization
- Build pages with unique paths
- Clean, maintainable structure

