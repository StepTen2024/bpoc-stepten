import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@supabase/supabase-js';

// GET - Fetch offers for the logged-in candidate
export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify token and get user
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get candidate's applications
    const { data: applications } = await supabaseAdmin
      .from('job_applications')
      .select('id')
      .eq('candidate_id', user.id);

    if (!applications || applications.length === 0) {
      return NextResponse.json({ offers: [] });
    }

    const applicationIds = applications.map(a => a.id);

    // Get offers for those applications
    const { data: offers, error } = await supabaseAdmin
      .from('job_offers')
      .select(`
        id,
        salary_offered,
        salary_type,
        currency,
        start_date,
        benefits_offered,
        additional_terms,
        status,
        sent_at,
        viewed_at,
        expires_at,
        created_at,
        application:job_applications (
          id,
          job:jobs (
            id,
            title,
            agency_client:agency_clients (
              company:companies (
                name
              )
            )
          )
        )
      `)
      .in('application_id', applicationIds)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Mark offers as viewed
    const unviewedOfferIds = (offers || [])
      .filter(o => o.status === 'sent' && !o.viewed_at)
      .map(o => o.id);
    
    if (unviewedOfferIds.length > 0) {
      await supabaseAdmin
        .from('job_offers')
        .update({ 
          viewed_at: new Date().toISOString(),
          status: 'viewed'
        })
        .in('id', unviewedOfferIds);
    }

    const formattedOffers = (offers || []).map((offer) => {
      const app = offer.application as {
        id: string;
        job?: { 
          id: string; 
          title: string;
          agency_client?: { company?: { name: string } };
        };
      } | null;

      return {
        id: offer.id,
        jobId: app?.job?.id,
        jobTitle: app?.job?.title || 'Unknown Job',
        company: app?.job?.agency_client?.company?.name || 'ShoreAgents Client',
        salaryOffered: offer.salary_offered,
        salaryType: offer.salary_type,
        currency: offer.currency,
        startDate: offer.start_date,
        benefits: offer.benefits_offered,
        additionalTerms: offer.additional_terms,
        status: offer.status,
        sentAt: offer.sent_at,
        expiresAt: offer.expires_at,
        createdAt: offer.created_at,
      };
    });

    return NextResponse.json({ offers: formattedOffers });

  } catch (error) {
    console.error('Candidate offers error:', error);
    return NextResponse.json({ error: 'Failed to fetch offers' }, { status: 500 });
  }
}

// PATCH - Accept or reject an offer
export async function PATCH(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { offerId, action, response } = await request.json();

    if (!offerId || !action) {
      return NextResponse.json({ error: 'Offer ID and action required' }, { status: 400 });
    }

    // Verify offer belongs to this candidate
    const { data: offer } = await supabaseAdmin
      .from('job_offers')
      .select(`
        id,
        application:job_applications (
          candidate_id
        )
      `)
      .eq('id', offerId)
      .single();

    const app = offer?.application as { candidate_id: string } | null;
    if (!offer || app?.candidate_id !== user.id) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    // Update offer based on action
    const newStatus = action === 'accept' ? 'accepted' : 'rejected';
    
    const { error: updateError } = await supabaseAdmin
      .from('job_offers')
      .update({
        status: newStatus,
        responded_at: new Date().toISOString(),
        candidate_response: response || null,
      })
      .eq('id', offerId);

    if (updateError) throw updateError;

    // Update application status
    const { data: offerData } = await supabaseAdmin
      .from('job_offers')
      .select('application_id')
      .eq('id', offerId)
      .single();

    if (offerData) {
      await supabaseAdmin
        .from('job_applications')
        .update({ status: action === 'accept' ? 'hired' : 'rejected' })
        .eq('id', offerData.application_id);
    }

    return NextResponse.json({ 
      success: true, 
      message: action === 'accept' ? 'Offer accepted!' : 'Offer declined'
    });

  } catch (error) {
    console.error('Respond to offer error:', error);
    return NextResponse.json({ error: 'Failed to respond to offer' }, { status: 500 });
  }
}

