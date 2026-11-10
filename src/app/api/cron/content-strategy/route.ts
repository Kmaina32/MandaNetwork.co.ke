
import { runContentStrategy } from '@/ai/flows/content-strategy';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Ensures this route is always server-rendered

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runContentStrategy();
    return NextResponse.json({
      message: 'Content strategy executed successfully.',
      ...result,
    });
  } catch (error: any) {
    console.error('Cron job failed:', error);
    return NextResponse.json(
      { message: 'Internal Server Error', error: error.message },
      { status: 500 }
    );
  }
}
