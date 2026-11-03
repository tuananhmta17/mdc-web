import { NextResponse } from "next/server";
export async function POST() { return NextResponse.json({ error: "Chức năng mô phỏng đã được gỡ khỏi bản chính thức." }, { status: 410 }); }
