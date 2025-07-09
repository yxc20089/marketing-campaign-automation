import { NextResponse } from 'next/server';
import { CampaignRunner } from '@/services/campaign.service';

export async function POST() {
  try {
    const campaignRunner = new CampaignRunner();
    
    // Run the campaign
    const result = await campaignRunner.runCampaign();
    
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