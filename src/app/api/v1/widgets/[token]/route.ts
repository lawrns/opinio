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

export async function GET() {
  return NextResponse.json(
    { success: false, error: 'La plataforma pública de Opinio México está fuera de línea.' },
    { status: 410, headers: { 'cache-control': 'no-store' } }
  );
}
