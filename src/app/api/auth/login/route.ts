import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, readDb, setActiveSessionUserId, verifyUserPassword } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, userId } = body;
    const db = readDb();

    let user;

    // Support 1-click test login by userId
    if (userId) {
      user = db.profiles.find((p) => p.id === userId);
      if (!user) {
        return NextResponse.json({ error: "Không tìm thấy tài khoản người dùng." }, { status: 404 });
      }
    } else {
      // Standard login by email + password
      if (!email || !email.trim()) {
        return NextResponse.json({ error: "Vui lòng nhập địa chỉ email." }, { status: 400 });
      }
      if (!password || !password.trim()) {
        return NextResponse.json({ error: "Vui lòng nhập mật khẩu." }, { status: 400 });
      }

      user = db.profiles.find((p) => p.email.trim().toLowerCase() === email.trim().toLowerCase());
      if (!user) {
        return NextResponse.json(
          { error: "Email hoặc mật khẩu không chính xác." },
          { status: 401 }
        );
      }

      const isPasswordValid = verifyUserPassword(user, password);
      if (!isPasswordValid) {
        return NextResponse.json(
          { error: "Email hoặc mật khẩu không chính xác." },
          { status: 401 }
        );
      }
    }

    // Check account status
    if (user.status === "INACTIVE") {
      return NextResponse.json(
        { error: "Tài khoản của bạn hiện đang bị khóa bởi Ban Chủ nhiệm. Vui lòng liên hệ BCN CLB." },
        { status: 403 }
      );
    }

    setActiveSessionUserId(user.id);
    const session = getCurrentSession(db, user.id);

    const res = NextResponse.json({
      success: true,
      user,
      session,
      message: "Đăng nhập thành công!",
    });

    res.cookies.set("mdc_uid", user.id, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Lỗi máy chủ" }, { status: 500 });
  }
}
