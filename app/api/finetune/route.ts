import { NextResponse } from 'next/server';
import { iniciarFinetune } from '@/lib/finetune-pipeline';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const result = await iniciarFinetune();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Fine-tuning failed', details: error.message },
      { status: 500 }
    );
  }
}
