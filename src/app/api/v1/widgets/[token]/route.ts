import { NextResponse } from 'next/server';


const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.pathname.split('/').pop();

  if (!token) {
    return NextResponse.json({ success: false, error: 'Token is required' }, { status: 400 });
  }

  try {
    // TODO: implement actual widget lookup from database
    return NextResponse.json({ success: true, token, message: 'Widget endpoint restored' }, {
      headers: CORS_HEADERS,
    });
  } catch (error) {
    console.error('Widget error:', error);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
