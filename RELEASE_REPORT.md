# MDC Web 1.1.0 — trạng thái phát hành

Ngày kiểm tra: 03/11/2026 (giờ Việt Nam).

## Hoàn thành trong mã nguồn

- Giao diện workspace mới: sidebar, dashboard theo việc cần làm, đăng nhập thật, cài đặt hồ sơ và mật khẩu; tương thích điện thoại.
- Bỏ đăng nhập bằng ID, tài khoản quản trị mặc định, chuyển vai trò và reset demo. Phiên ngẫu nhiên được lưu dạng hash phía máy chủ; mật khẩu scrypt; logout/khóa/đổi mật khẩu thu hồi phiên.
- API tự kiểm tra tài khoản và vai trò; lọc dữ liệu theo người nhận/phạm vi; không trả mật khẩu hoặc khóa phiên.
- Lưu Supabase có revision, chờ ghi thành công và từ chối xung đột; không âm thầm đổi sang dữ liệu mẫu khi mất kết nối.
- Kiểm tra đầu vào và các điều kiện nghiệp vụ của đăng ký, danh sách chờ, lịch rảnh, bình chọn, lịch tập, RSVP, điểm danh, nộp và duyệt sản phẩm.
- Đóng bình chọn/chốt bài trên giao diện; kiểm tra thời hạn; ẩn kết quả đến khi công bố.
- Thông báo/email chống trùng, lưu claim trước khi gửi, tôn trọng retry, gửi theo nhóm; không báo SENT nếu chưa cấu hình nhà cung cấp.
- Ngày giờ hiển thị và dữ liệu từ form đều dùng giờ Việt Nam. CSV chống chèn công thức.
- Vá Nodemailer và PostCSS; bỏ hai thư viện không dùng; giữ Next.js 15.5.28 với lockfile.

## Bằng chứng kiểm tra

- 128/128 kiểm tra API và nghiệp vụ qua. Fixture nằm trong thư mục tạm, không reset hoặc ghi đè database thật.
- Bao gồm kiểm tra HTTP Supabase giả lập: đọc mới, lưu revision, xung đột 409, lỗi kết nối 503; worker chạy đồng thời không gửi trùng.
- TypeScript và `next build` thành công. JavaScript tải lần đầu khoảng 103–114 kB tùy trang.
- npm audit sau cập nhật: 0 lỗ hổng.
- Kiểm tra bằng trình duyệt: đăng nhập, dashboard, bài nhảy, bình chọn, lịch rảnh, lịch tập, truyền thông, thành viên, điều hành, hồ sơ; không thấy lỗi console trong các màn hình đã kiểm tra. Lưu hồ sơ thành công trên giao diện di động.
- Supabase thật đã được kiểm tra qua kết nối quản trị: project `wzwtnsfwbmbhqsdqgyjd` hoạt động, ban đầu chưa có bảng public hoặc tài khoản Auth. Log Data API xác nhận yêu cầu tới bảng snapshot trả 404.
- Đã áp dụng migration `mdc_production_storage` trên Supabase: tạo `app_state_snapshots`, thêm `revision`, bật RLS, thu hồi quyền `anon`/`authenticated`, cấp SELECT/INSERT/UPDATE cho `service_role` và yêu cầu PostgREST tải lại schema.
- Truy vấn sau migration xác nhận đủ bốn cột, RLS bật, hai vai trò public không đọc được dữ liệu, máy chủ có quyền đọc/ghi; bảng chưa có snapshot để ghi đè. Advisor chỉ báo INFO do bảng chỉ cho máy chủ truy cập không có policy public.
- Gửi email thật và đăng nhập bằng tài khoản quản trị thật vẫn chưa được xác minh.

## Đã có mã mới trên production; chưa hoàn tất khởi tạo

Website đã xác minh: https://mdc-web-delta.vercel.app/ . Giao diện mới đã xuất hiện trên tên miền thật. Repository liên kết dự án Vercel `s-46da/mdc-web` (`prj_Qws3x8LATdJJ1aFiGmOJQGeBOUxg`). Nhánh `codex/production-1.1`, commit `efc266d`, đã được đẩy lên GitHub và có draft PR #1; Vercel Preview báo build thành công. Chưa xác minh nguồn của lần promote production; `main` trên GitHub vẫn ở commit cũ lúc kiểm tra.

Sau khi người dùng duyệt quyền team Vercel, đã đọc được tên các biến môi trường (không hiển thị giá trị khóa). Các biến Supabase có mặt ở production/preview; chưa có `APP_URL`, `CRON_SECRET`, `MDC_ADMIN_EMAIL`, `MDC_ADMIN_NAME`, `MDC_ADMIN_PASSWORD` hoặc các biến nhà cung cấp email trong danh sách trả về.

Sau migration, `/api/state` trên production đã đổi từ lỗi đọc Supabase sang HTTP 503: `Chưa khởi tạo quản trị viên. Cần cấu hình MDC_ADMIN_EMAIL và MDC_ADMIN_PASSWORD (ít nhất 12 ký tự).` Không có phiên hoặc mật khẩu bị trả về trong phản hồi kiểm tra này.

Việc còn lại: người dùng xác định email/họ tên quản trị; đặt mật khẩu riêng trực tiếp trong cấu hình bảo mật; cấu hình URL, cron và nhà cung cấp email thật; redeploy đúng dự án; đăng nhập lần đầu và xác minh snapshot được lưu; thu hồi biến mật khẩu khởi tạo sau khi tạo tài khoản; kiểm tra luồng đăng nhập/đăng xuất và email thật. Không đưa dữ liệu mẫu vào cloud.

Ở lần tiếp tục gần nhất, các công cụ Supabase/Vercel không còn trong phiên và kết quả tìm plugin báo chưa cài; trình duyệt báo `Local browser use is disabled in Work settings`. Token CLI cũ đã hết hiệu lực và máy chưa có file xác thực CLI mới. Cần khôi phục một đường truy cập quản trị đã được cấp quyền để hoàn thành các bước còn lại. Không cần duyệt lại phạm vi triển khai đã được người dùng cho phép.
