import type { NextRequest } from 'next/server';
import { machineWrite } from '../machine-write';

export const dynamic = 'force-dynamic';

/** Synthetic machine write scoped to invitation creation (see machine-write.ts). */
export async function POST(request: NextRequest) {
  return machineWrite(request, 'invitations');
}
