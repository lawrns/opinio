import { NextResponse } from 'next/server';
import { CONTAINED_ERROR, CONTAINED_STATUS } from './containment';

/** JSON refusal for a contained write. Returned before any database access. */
export function containedResponse() {
  return NextResponse.json({ success: false, error: CONTAINED_ERROR, code: 'temporarily_disabled' }, { status: CONTAINED_STATUS });
}
