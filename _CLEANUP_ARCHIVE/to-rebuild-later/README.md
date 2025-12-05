# Files to Rebuild Later

**Date:** 2024-12-05

These files were archived to rebuild properly later when the app structure is stable.

## Files

- `error.tsx` - Error boundary component (needs import path fix)
- `global-error.tsx` - Global error boundary (needs import path fix)

## Why Archived

- Import paths broken (`@/components/ui/button` → should be `@/components/shared/ui/button`)
- Will rebuild with proper structure once app is stable
- Next.js has default error handling, so not critical right now

## When to Rebuild

- After all component imports are fixed
- After app structure is finalized
- When ready to add custom error handling

