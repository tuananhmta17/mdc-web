import { NextResponse } from "next/server";
export async function POST() { return NextResponse.json({ error: "Bản chính thức không cho phép reset dữ liệu qua API." }, { status: 410 }); }
