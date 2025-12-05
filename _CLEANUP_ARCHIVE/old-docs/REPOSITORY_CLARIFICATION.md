# Repository & Vercel Setup Clarification

## Current Repository

**Repository:** `shoreagents/bpoc-cloned`
- **Organization:** shoreagents
- **Repo Name:** bpoc-cloned
- **Full URL:** https://github.com/shoreagents/bpoc-cloned.git

## Your GitHub Account

**Username:** StepTen2024
**Account URL:** https://github.com/StepTen2024

## The Confusion

You're seeing Vercel connected to a different account because:

1. **Repository is under ORGANIZATION** (`shoreagents`)
   - Not under your personal account (`StepTen2024`)
   - You might be a member/collaborator of the `shoreagents` org

2. **Vercel might be connected to:**
   - Your personal account (`StepTen2024`) - but repo is in org
   - The organization account (`shoreagents`) - correct
   - A different account entirely - wrong

## How to Fix Vercel Connection

### Option 1: Connect to Organization (Recommended)
1. Vercel Dashboard → Settings → Git
2. Disconnect current connection
3. Connect Git Repository
4. Select **Organization: shoreagents**
5. Select Repository: **bpoc-cloned**
6. Production Branch: **main**

### Option 2: Check Your Access
1. Go to: https://github.com/shoreagents/bpoc-cloned
2. Verify you can see the repository
3. Check if you're a member of `shoreagents` org
4. If not, ask org admin to add you

### Option 3: Use Personal Fork (Not Recommended)
If you fork to your personal account:
- Fork: `StepTen2024/bpoc-cloned`
- But this creates a separate repo
- Not ideal for team collaboration

## What We're Actually Using

**Repository:** `shoreagents/bpoc-cloned`
**Branch:** `main`
**Remote:** `origin` → `https://github.com/shoreagents/bpoc-cloned.git`

## Vercel Should Be Connected To

**Organization:** shoreagents
**Repository:** bpoc-cloned
**Branch:** main

NOT your personal account `StepTen2024`!
