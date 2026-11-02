# Phát hành MDC Web 1.1.0

Ứng dụng dùng Next.js, phiên đăng nhập lưu phía máy chủ và Supabase làm kho dữ liệu chung trên Vercel. Bản production không tạo tài khoản mẫu, không nhận ID người dùng làm thông tin đăng nhập, không mô phỏng gửi email và không có chức năng reset qua API.

## 1. Chuẩn bị dự án hiện có

Sử dụng đúng dự án Vercel đang chạy và giữ nguyên tên miền hiện tại. Không tạo một dự án khác để thay thế khi chưa xác định dự án cũ.

Trong Supabase SQL Editor, chạy `supabase/migrations/002_production_storage.sql`. Migration này bổ sung cột `revision`, gỡ policy cho phép đọc/ghi công khai snapshot và chỉ cấp quyền cho máy chủ. Nếu khởi tạo hoàn toàn mới, có thể chạy riêng migration 002; runtime hiện dùng bảng `app_state_snapshots`, chưa dùng các bảng nghiệp vụ chuẩn hóa trong migration 001.

**Trước khi áp dụng lên dữ liệu đang dùng:** sao lưu snapshot `latest_state` bằng công cụ quản trị Supabase. Không thay thế nó bằng file `data/mdc-db.json` trong repository vì đó là dữ liệu mẫu của bản cũ.

## 2. Cấu hình production

Đặt các biến sau trong **Settings → Environment Variables → Production** của dự án Vercel. Không đưa khóa thật vào Git hoặc chat.

| Biến | Ý nghĩa |
| --- | --- |
| `APP_URL` | URL HTTPS chính thức, ví dụ tên miền hiện có của CLB |
| `SUPABASE_URL` | URL dự án Supabase |
| `SUPABASE_SECRET_KEY` | Khóa chỉ dành cho máy chủ; cũng hỗ trợ `SUPABASE_SERVICE_ROLE_KEY` cũ |
| `CRON_SECRET` | Chuỗi ngẫu nhiên ít nhất 32 ký tự |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | Một tài khoản Gmail gửi thư và App Password tương ứng |
| `RESEND_API_KEY`, `EMAIL_FROM` | Dùng thay Gmail nếu chọn Resend; địa chỉ gửi cần được xác minh |

Nếu database chưa có snapshot, cấu hình thêm `MDC_ADMIN_EMAIL`, `MDC_ADMIN_NAME`, `MDC_ADMIN_PASSWORD` (ít nhất 12 ký tự). Lần đăng nhập đầu tiên tạo duy nhất quản trị viên này và ba ban của CLB. Sau khi đã đăng nhập và lưu thành công, gỡ mật khẩu khởi tạo khỏi biến môi trường rồi redeploy. Không có mật khẩu mặc định.

Nếu đang có snapshot từ bản demo: các mật khẩu dạng văn bản cũ không được chấp nhận. Cần chuyển mật khẩu thực tế sang scrypt bằng công cụ quản trị có kiểm soát trước khi phát hành. Không tiếp tục dùng mật khẩu `123456`, không xóa dữ liệu người dùng để giải quyết việc chuyển đổi. Lệnh kiểm tra production sẽ báo các tài khoản chưa được chuyển đổi.

## 3. Kiểm tra và phát hành

```powershell
npm ci
npm run release:check
npm run check:production
```

`release:check` chạy TypeScript, kiểm thử API trong thư mục tạm riêng, rồi build production. `check:production` kiểm tra cấu hình đã cung cấp cho tiến trình đang chạy (ví dụ `.env.local`); lệnh không tự đọc các biến trên tài khoản Vercel. Không gửi thư thử hoặc thay đổi dữ liệu khi chạy kiểm tra cấu hình.

Chỉ triển khai sau khi đã có kết nối Vercel hợp lệ, migration thành công và biến production đúng. Khi dùng CLI đã đăng nhập:

```powershell
npx vercel link
npx vercel --prod
```

Ở bước link, chọn **dự án hiện có**. Có thể dùng Git integration của dự án thay thế CLI. File `.vercelignore` loại dữ liệu mẫu, fixture kiểm thử và file môi trường khỏi gói upload.

## 4. Kiểm tra sau phát hành

- Đăng nhập bằng tài khoản thật; tải lại vẫn giữ phiên, đăng xuất thì phiên cũ bị hủy.
- Tạo thành viên, bài nhảy hoặc lịch tập được phép; xác nhận dữ liệu vẫn còn sau khi khởi động lại/redeploy.
- Kiểm tra từng vai trò với tài khoản thật do quản trị viên cấp, không dùng bộ chuyển vai trò.
- Kiểm tra email tới hộp thư thực tế và đường dẫn trong email trỏ về tên miền chính thức.
- Cron trong `vercel.json` chạy lúc **08:00 giờ Việt Nam mỗi ngày**. Không coi đây là nhắc hạn chính xác từng phút; cần dịch vụ lập lịch thường xuyên hơn nếu CLB yêu cầu.

## 5. Vận hành và giới hạn

Snapshot dùng revision để từ chối ghi đè khi hai serverless instance cùng cập nhật; người dùng nhận thông báo tải lại/thử lại, không nhận kết quả thành công giả. Không có fallback về `/tmp` hoặc dữ liệu trong bộ nhớ khi Supabase lỗi. Kho JSON local chỉ phục vụ một tiến trình Node trên ổ đĩa bền vững, không dùng nhiều instance hoặc Vercel.

Worker lưu claim trước khi gửi để tránh hai lần chạy đồng thời gửi cùng thư, tôn trọng thời gian retry và chống trùng thông báo. Worker xử lý theo nhóm 5 thư song song, tối đa 50 thư mỗi lần và dừng nhận nhóm mới sau 40 giây. Với một lần quét mỗi ngày, hàng đợi lớn hoặc nhà cung cấp chậm cần tăng tần suất cron hay dùng hệ thống gửi thư chuyên dụng. Gmail/SMTP không bảo đảm gửi đúng một lần trong mọi tình huống mất mạng; thư bị gián đoạn được ghi lỗi để kiểm tra thay vì tự gửi lại không kiểm soát.

Mật khẩu được băm scrypt. Cookie phiên có HttpOnly, SameSite và Secure khi chạy production. Khóa Supabase không được gửi xuống trình duyệt. Các API kiểm tra phân quyền độc lập với giao diện. Cần chính sách sao lưu ngoài ứng dụng cho dữ liệu thật; ứng dụng không tự tạo hoặc cam kết có bản sao lưu của nhà cung cấp.

## Kiểm tra giao diện local

Sau khi build, có thể dùng `npx tsx scripts/start-qa.ts` để xem fixture ở `http://localhost:3100`. Fixture chỉ nằm trong thư mục tạm riêng, không gửi email thật và bị loại khỏi deployment. Đây là công cụ kiểm tra cho người phát triển, không phải cách khởi chạy production. Dùng `npm start` với cấu hình thật để chạy bản chính thức.
