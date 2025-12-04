/**
 * Prisma Queries for Candidates
 * Wraps old Railway database queries and returns NEW schema shape
 */
import { prismaRailway } from '@/lib/prisma-clients'

export interface Candidate {
  id: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  phone: string | null
  avatar_url: string | null
  username: string | null
  slug: string | null
  is_active: boolean
  email_verified: boolean
  created_at: string
  updated_at: string
}

export async function getCandidateById(id: string): Promise<Candidate | null> {
  const user = await prismaRailway.user.findUnique({
    where: { id },
  })

  if (!user) return null

  // Transform OLD shape → NEW shape
  return {
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    full_name: user.full_name || `${user.first_name} ${user.last_name}`,
    phone: user.phone || null,
    avatar_url: user.avatar_url || null,
    username: user.username || null,
    slug: user.slug || null,
    is_active: true,
    email_verified: false, // Will be synced from auth.users
    created_at: user.created_at?.toISOString() || new Date().toISOString(),
    updated_at: user.updated_at?.toISOString() || new Date().toISOString(),
  }
}

export async function getCandidateByEmail(email: string): Promise<Candidate | null> {
  const user = await prismaRailway.user.findUnique({
    where: { email },
  })

  if (!user) return null

  return {
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    full_name: user.full_name || `${user.first_name} ${user.last_name}`,
    phone: user.phone || null,
    avatar_url: user.avatar_url || null,
    username: user.username || null,
    slug: user.slug || null,
    is_active: true,
    email_verified: false,
    created_at: user.created_at?.toISOString() || new Date().toISOString(),
    updated_at: user.updated_at?.toISOString() || new Date().toISOString(),
  }
}

export async function createCandidate(data: {
  id: string
  email: string
  first_name: string
  last_name: string
  phone?: string | null
  avatar_url?: string | null
  username?: string | null
  slug?: string | null
}): Promise<Candidate> {
  const user = await prismaRailway.user.create({
    data: {
      id: data.id,
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      full_name: `${data.first_name} ${data.last_name}`,
      location: '', // Required in old schema
      phone: data.phone,
      avatar_url: data.avatar_url,
      username: data.username,
      slug: data.slug,
    },
  })

  return {
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    full_name: user.full_name,
    phone: user.phone || null,
    avatar_url: user.avatar_url || null,
    username: user.username || null,
    slug: user.slug || null,
    is_active: true,
    email_verified: false,
    created_at: user.created_at?.toISOString() || new Date().toISOString(),
    updated_at: user.updated_at?.toISOString() || new Date().toISOString(),
  }
}

export async function updateCandidate(
  id: string,
  data: {
    first_name?: string
    last_name?: string
    phone?: string | null
    avatar_url?: string | null
    username?: string | null
    slug?: string | null
  }
): Promise<Candidate | null> {
  const user = await prismaRailway.user.update({
    where: { id },
    data: {
      ...data,
      full_name:
        data.first_name && data.last_name
          ? `${data.first_name} ${data.last_name}`
          : undefined,
    },
  })

  return getCandidateById(user.id)
}

export async function deleteCandidate(id: string): Promise<boolean> {
  try {
    await prismaRailway.user.delete({ where: { id } })
    return true
  } catch {
    return false
  }
}

