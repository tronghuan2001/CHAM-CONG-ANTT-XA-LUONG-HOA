# Web chấm công BVANTTCS – Xã Lương Hoà

Đây là trang web chấm công chạy **thuần HTML/CSS/JS**, giao diện **100% tiếng Việt**, có phân quyền **Dev / Admin / User**, hỗ trợ:
- User: chấm công theo ngày (GMT+7), ghi chú, nhập giờ bắt đầu/kết thúc, upload ảnh.
- Toàn bộ giao diện dùng tiếng Việt và dùng font **Be Vietnam Pro**.
- Admin: xem toàn bộ dữ liệu + xuất **bảng tổng hợp** ra **PDF**.
- Dev: toàn quyền (tạo/xoá tài khoản, phân quyền, tạo đồng loạt bằng upload danh sách, cài đặt tiêu đề, cấu hình Google Sheets…).

## Cách chạy nhanh
1. Mở file `index.html` trong trình duyệt (Chrome/Edge).
2. Lần đầu chạy, hệ thống tự tạo tài khoản Dev mẫu:
   - Tài khoản: `dev@anttlh`
   - Mật khẩu: `Dev@1234!`

## Lưu dữ liệu ở đâu?
- Mặc định dữ liệu (tài khoản + chấm công) được lưu **trên thiết bị đang dùng** bằng LocalStorage/IndexedDB.
- Nếu bạn mở trang bằng máy khác/điện thoại khác, dữ liệu sẽ **không tự có**.

## Xuất PDF
- Nút “Xuất PDF (tiếng Việt)” và “In/Lưu PDF” dùng cơ chế in của trình duyệt để đảm bảo hiển thị tiếng Việt đầy đủ. Trong hộp thoại in, chọn **Lưu dưới dạng PDF**.

## Quy tắc tạo tài khoản
- Dev tạo tài khoản bằng “Họ và tên”.
- Tên đăng nhập theo quy tắc: **tên trước + chữ cái đầu họ & chữ lót**, viết liền **không dấu**, kèm `@anttlh`.
  - Ví dụ: `Nguyễn Văn Tài` → `tainv@anttlh`
- Mật khẩu mặc định cho tài khoản mới: `123456`
  - Quy tắc mật khẩu 8–10 ký tự (có số, chữ hoa, ký tự đặc biệt) áp dụng khi **đổi mật khẩu**.

## Đồng bộ Google Sheets (tuỳ chọn)
Trong thư mục có file mẫu `google-apps-script.gs`.

Tóm tắt cách thiết lập:
1. Tạo Google Apps Script mới: https://script.google.com
2. Dán nội dung `google-apps-script.gs` vào file `Code.gs`
3. Deploy → New deployment → “Web app”
   - Execute as: Me
   - Who has access: Anyone (hoặc Anyone with the link)
4. Copy “Web app URL”
5. Vào web chấm công: Dev → “Cài đặt” → dán Web app URL → bấm “Lưu” → “Test gửi”

## Đưa lên link để dùng thực tế
Cách dễ nhất là dùng **GitHub Pages**:
1. Tạo một repo GitHub mới (Public hoặc Private tuỳ nhu cầu).
2. Upload toàn bộ thư mục này lên repo (giữ nguyên cấu trúc).
3. Vào Settings → Pages → chọn Branch (thường là `main`) và thư mục `/root`.
4. GitHub sẽ cung cấp một đường link; gửi link đó cho người dùng.

Lưu ý: nếu dùng GitHub Pages, dữ liệu vẫn lưu theo **trình duyệt/thiết bị** (không tự đồng bộ giữa các máy) trừ khi bạn cấu hình Google Sheets.

## Ghi chú quan trọng (thực tế triển khai)
- Đây là web chạy phía trình duyệt, phù hợp cho nhu cầu **đơn giản – nhanh – dễ dùng**. Nếu cần bảo mật/đồng bộ nhiều thiết bị theo tài khoản, nên phát triển thêm backend (máy chủ).
- Khi đổi máy hoặc xoá dữ liệu trình duyệt, dữ liệu cũ có thể mất. Dev có mục “Sao lưu/Phục hồi dữ liệu” để hỗ trợ chuyển đổi (không bao gồm ảnh).

## Lưu ý về định dạng ngày/giờ
- Giờ trực được nhập theo **24 giờ** bằng danh sách chọn (giờ/phút).
- Một số màn hình lọc ngày dùng định dạng nhập tay **DD/MM/YYYY** để tránh trình duyệt hiển thị tiếng Anh.
