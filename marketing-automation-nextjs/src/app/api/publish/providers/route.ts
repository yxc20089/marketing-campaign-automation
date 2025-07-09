import { NextResponse } from 'next/server';
import { PublishingValidatorService } from '@/services/publishingValidator.service';

export async function GET() {
  try {
    const validator = new PublishingValidatorService();
    
    // Check which providers are available
    const availableProviders = await validator.getAvailableProviders();
    const hasProviders = availableProviders.length > 0;
    
    return NextResponse.json({
      hasProviders,
      availableProviders,
      message: hasProviders 
        ? 'Publishing providers are configured' 
        : 'No publishing providers configured'
    });
  } catch (error: any) {
    console.error('Error checking publishing providers:', error);
    
    return NextResponse.json(
      { 
        error: { 
          message: error.message || 'Failed to check publishing providers',
          details: error.details || null
        }
      },
      { status: 500 }
    );
  }
}