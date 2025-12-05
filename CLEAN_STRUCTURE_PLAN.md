# CLEAN APP STRUCTURE PLAN

## Target Structure

```
src/app/
├── (public)/              # Public pages (no auth required)
│   ├── page.tsx          # Homepage
│   ├── about/
│   ├── jobs/             # Public job listings
│   ├── profile/[slug]/   # Public profiles
│   └── resume/[slug]/    # Public resumes
│
├── (candidate)/          # Candidate dashboard (auth required)
│   ├── layout.tsx        # Candidate sidebar layout
│   ├── dashboard/
│   ├── profile/
│   ├── resume/
│   ├── jobs/
│   ├── applications/
│   ├── interviews/
│   ├── offers/
│   └── games/
│
├── (admin)/              # Admin dashboard (admin auth required)
│   ├── layout.tsx        # Admin sidebar layout
│   ├── dashboard/
│   ├── users/
│   ├── jobs/
│   ├── applicants/
│   ├── resumes/
│   ├── assessments/
│   └── analytics/
│
├── (recruiter)/          # Recruiter dashboard (recruiter auth required)
│   ├── layout.tsx        # Recruiter sidebar layout
│   ├── dashboard/
│   ├── jobs/
│   ├── candidates/
│   ├── applications/
│   ├── clients/
│   └── settings/
│
└── api/
    ├── candidates/       # Candidate APIs
    ├── jobs/            # Job APIs
    ├── applications/    # Application APIs
    ├── resumes/         # Resume APIs
    ├── assessments/     # Assessment APIs
    ├── admin/           # Admin APIs
    └── recruiter/       # Recruiter APIs

src/components/
├── (public)/            # Public components
├── candidate/           # Candidate components
├── admin/               # Admin components
├── recruiter/           # Recruiter components
└── shared/              # Shared components (ui, layout)
