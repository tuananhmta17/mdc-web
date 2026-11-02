import { NextRequest, NextResponse } from "next/server";
import { readDb, setActiveSessionUserId, writeDb } from "@/lib/db";
import { Profile } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, googleLoginEmail, fullName } = body;
    const db = readDb();

    if (userId) {
      const exists = db.profiles.find((p) => p.id === userId);
      if (!exists) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      setActiveSessionUserId(userId);
      const res = NextResponse.json({ success: true, activeUser: exists });
      res.cookies.set("mdc_uid", userId, {
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
      return res;
    }

    // Simulate Google Login for a new external student
    if (googleLoginEmail) {
      let user = db.profiles.find((p) => p.email === googleLoginEmail);
      if (!user) {
        user = {
          id: `u-ext-${Date.now()}`,
          email: googleLoginEmail,
          full_name: fullName || "Sinh viên MTA Mới",
          cohort_class: "K60 - Tân Sinh Viên",
          status: "PENDING", // Requires Board Admin approval
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        db.profiles.push(user);
        writeDb(db);
      }
      setActiveSessionUserId(user.id);
      const res = NextResponse.json({ success: true, activeUser: user });
      res.cookies.set("mdc_uid", user.id, {
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
      });
      return res;
    }

    return NextResponse.json({ error: "Missing userId or googleLoginEmail" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
