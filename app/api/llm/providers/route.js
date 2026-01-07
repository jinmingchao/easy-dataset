import { NextResponse } from 'next/server';
import { getLlmProviders } from '@/lib/db/llm-providers';

// 获取 LLM 提供商数据
export async function GET() {
  try {
    console.log("调用 /api/llm/model - request: \n %o",request);
    const result = await getLlmProviders();
    console.log("providerList: \n %o",result);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Database query error:', String(error));
    return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
  }
}
