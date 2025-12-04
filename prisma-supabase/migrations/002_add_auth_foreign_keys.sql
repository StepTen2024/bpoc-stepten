-- ============================================
-- Add Foreign Keys to auth.users
-- Prisma can't create FKs to tables outside public schema
-- ============================================

-- Add foreign key: candidates.id -> auth.users.id
ALTER TABLE "candidates" 
ADD CONSTRAINT "candidates_id_fkey" 
FOREIGN KEY ("id") 
REFERENCES "auth"."users"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- Add foreign key: bpoc_users.id -> auth.users.id
ALTER TABLE "bpoc_users" 
ADD CONSTRAINT "bpoc_users_id_fkey" 
FOREIGN KEY ("id") 
REFERENCES "auth"."users"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- Add foreign key: agency_recruiters.user_id -> auth.users.id
ALTER TABLE "agency_recruiters" 
ADD CONSTRAINT "agency_recruiters_user_id_fkey" 
FOREIGN KEY ("user_id") 
REFERENCES "auth"."users"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;

