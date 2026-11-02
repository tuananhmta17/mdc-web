import { NextResponse } from "next/server";
import { clearSessionUserId } from "@/lib/db";

export async function POST() {
  clearSessionUserId();

  const res = NextResponse.json({
    success: true,
    message: "Đã đăng xuất thành công.",
  });

  res.cookies.set("mdc_uid", "", {
    path: "/",
    sameSite: "lax",
    maxAge: 0,
    expires: new Date(0),
  });

  return res;
}
