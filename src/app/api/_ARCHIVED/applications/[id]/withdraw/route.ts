import { NextRequest, NextResponse } from 'next/server';
import { updateApplicationStatus } from '@/lib/db/applications';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Update application status to withdrawn
    const application = await updateApplicationStatus(id, userId, 'withdrawn');

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Application withdrawn successfully',
      application: application
    });
  } catch (error) {
    console.error('Error withdrawing application:', error);
    return NextResponse.json(
      { 
        error: 'Failed to withdraw application',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
