import { NextResponse } from 'next/server';
import { CampaignRunner } from '@/services/campaign.service';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { mode = 'auto', customTopic } = body;
    
    const campaignRunner = new CampaignRunner();
    
    // Run the campaign
    const result = await campaignRunner.runCampaign(mode, customTopic);
    
    return NextResponse.json({
      success: true,
      trendsFound: result.trendsFound,
      processed: result.processed,
      message: 'Campaign executed successfully'
    });
  } catch (error: any) {
    console.error('Campaign execution error:', error);
    
    return NextResponse.json(
      { 
        error: { 
          message: error.message || 'Campaign execution failed',
          details: error.details || null
        }
      },
      { status: 500 }
    );
  }
}