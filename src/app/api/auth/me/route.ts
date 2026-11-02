import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, withApi } from "@/lib/db";
export const GET = withApi(async (req: NextRequest) => NextResponse.json({ success: true, session: getSessionFromRequest(req) }), { pending: true });
