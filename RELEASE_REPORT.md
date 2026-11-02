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
- Supabase thật và gửi email thật chưa được xác minh vì chưa có phiên Vercel hợp lệ. Các kiểm tra giả lập không thay thế bước kiểm tra dịch vụ thật.

## Chưa triển khai production

Website đã xác minh: https://mdc-web-delta.vercel.app/ . Repository đang liên kết dự án Vercel `s-46da/mdc-web`. Token cũ trong checkout bị Vercel từ chối 403; trình duyệt hiện yêu cầu đăng nhập.

Người dùng xác nhận đã có Supabase trên dự án. Chưa đọc được cấu hình production để xác minh migration 002, URL, email và cron. Kiểm tra cấu hình local báo bốn nhóm biến chưa được cung cấp; điều này không chứng minh chúng thiếu trên Vercel.

Trước khi chuyển bản này lên production cần sao lưu dữ liệu hiện có, áp dụng migration 002, xử lý mật khẩu văn bản của bản cũ, xác minh cấu hình thật và sau đó triển khai đúng dự án. Chi tiết tại `DEPLOY_GUIDE.md`. Bản online cũ còn lỗi xác thực và trả mật khẩu trong API; mã nguồn mới đã sửa, nhưng sửa chữa chưa có hiệu lực trên tên miền cho tới khi triển khai thành công.
