import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    // Fetch all counts in parallel
    const [
      candidatesResult,
      agenciesResult,
      jobsResult,
      applicationsResult,
      interviewsResult,
      offersResult,
      recentActivityResult
    ] = await Promise.all([
      // Total candidates
      supabaseAdmin.from('candidates').select('id', { count: 'exact', head: true }),
      
      // Total agencies
      supabaseAdmin.from('agencies').select('id', { count: 'exact', head: true }).eq('is_active', true),
      
      // Active jobs
      supabaseAdmin.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      
      // Pending applications
      supabaseAdmin.from('applications').select('id', { count: 'exact', head: true }).in('status', ['submitted', 'under_review']),
      
      // Scheduled interviews
      supabaseAdmin.from('interviews').select('id', { count: 'exact', head: true }).eq('status', 'scheduled'),
      
      // Pending offers
      supabaseAdmin.from('offers').select('id', { count: 'exact', head: true }).eq('status', 'sent'),
      
      // Recent activity - last 10 candidates
      supabaseAdmin
        .from('candidates')
        .select('id, email, first_name, last_name, created_at')
        .order('created_at', { ascending: false })
        .limit(10)
    ]);

    const stats = {
      totalCandidates: candidatesResult.count || 0,
      totalAgencies: agenciesResult.count || 0,
      activeJobs: jobsResult.count || 0,
      pendingApplications: applicationsResult.count || 0,
      scheduledInterviews: interviewsResult.count || 0,
      pendingOffers: offersResult.count || 0,
    };

    // Format recent activity
    const recentActivity = (recentActivityResult.data || []).map((candidate, index) => ({
      id: candidate.id,
      type: 'signup',
      message: `New candidate registered: ${candidate.first_name} ${candidate.last_name} (${candidate.email})`,
      time: formatTimeAgo(new Date(candidate.created_at)),
    }));

    return NextResponse.json({
      stats,
      recentActivity
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

