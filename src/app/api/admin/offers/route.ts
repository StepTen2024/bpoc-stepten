import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// GET - Fetch all offers for admin
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';

    let query = supabaseAdmin
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
        responded_at,
        expires_at,
        candidate_response,
        created_at,
        application:job_applications (
          id,
          candidate:candidates (
            id,
            email,
            first_name,
            last_name,
            avatar_url
          ),
          job:jobs (
            id,
            title
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: offers, error } = await query;

    if (error) throw error;

    const formattedOffers = (offers || []).map((offer) => {
      const app = offer.application as {
        id: string;
        candidate?: { id: string; email: string; first_name: string; last_name: string; avatar_url?: string };
        job?: { id: string; title: string };
      } | null;

      return {
        id: offer.id,
        applicationId: app?.id,
        candidateId: app?.candidate?.id,
        candidateName: app?.candidate ? `${app.candidate.first_name} ${app.candidate.last_name}`.trim() : 'Unknown',
        candidateEmail: app?.candidate?.email || '',
        candidateAvatar: app?.candidate?.avatar_url,
        jobId: app?.job?.id,
        jobTitle: app?.job?.title || 'Unknown Job',
        salaryOffered: offer.salary_offered,
        salaryType: offer.salary_type,
        currency: offer.currency,
        startDate: offer.start_date,
        benefits: offer.benefits_offered,
        additionalTerms: offer.additional_terms,
        status: offer.status,
        sentAt: offer.sent_at,
        viewedAt: offer.viewed_at,
        respondedAt: offer.responded_at,
        expiresAt: offer.expires_at,
        candidateResponse: offer.candidate_response,
        createdAt: offer.created_at,
      };
    });

    return NextResponse.json({ offers: formattedOffers });

  } catch (error) {
    console.error('Offers API error:', error);
    return NextResponse.json({ error: 'Failed to fetch offers' }, { status: 500 });
  }
}

// POST - Create a new job offer
export async function POST(request: NextRequest) {
  try {
    const { 
      applicationId, 
      salaryOffered,
      salaryType = 'monthly',
      currency = 'PHP',
      startDate,
      benefits = [],
      additionalTerms,
      expiresAt
    } = await request.json();

    if (!applicationId || !salaryOffered) {
      return NextResponse.json({ error: 'Application ID and salary are required' }, { status: 400 });
    }

    // Update application status to offered
    await supabaseAdmin
      .from('job_applications')
      .update({ status: 'offered' })
      .eq('id', applicationId);

    // Create offer record
    const { data: offer, error } = await supabaseAdmin
      .from('job_offers')
      .insert({
        application_id: applicationId,
        salary_offered: salaryOffered,
        salary_type: salaryType,
        currency: currency,
        start_date: startDate || null,
        benefits_offered: benefits,
        additional_terms: additionalTerms || null,
        status: 'sent',
        sent_at: new Date().toISOString(),
        expires_at: expiresAt || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Offer insert error:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Offer sent successfully',
      offer
    });

  } catch (error) {
    console.error('Create offer error:', error);
    return NextResponse.json({ error: 'Failed to create offer' }, { status: 500 });
  }
}

// PATCH - Update offer status (withdraw, etc)
export async function PATCH(request: NextRequest) {
  try {
    const { offerId, status } = await request.json();

    if (!offerId || !status) {
      return NextResponse.json({ error: 'Offer ID and status required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('job_offers')
      .update({ status })
      .eq('id', offerId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, offer: data });

  } catch (error) {
    console.error('Update offer error:', error);
    return NextResponse.json({ error: 'Failed to update offer' }, { status: 500 });
  }
}

