# Hướng dẫn quản trị media

Sau khi triển khai và nối tên miền, trang quản trị nằm tại `https://vovsmart.net/media/admin/`. Trước khi nối tên miền, dùng cùng đường dẫn trên URL Vercel thực tế của dự án.

## Đăng nhập

Nhập **khóa quản trị media** được người quản trị hệ thống cung cấp. Đây là `MEDIA_ADMIN_KEY`, không phải mật khẩu GitHub và không phải GitHub token. Khóa chỉ được giữ trong bộ nhớ của trang đang mở. Tải lại trang, đóng tab hoặc đăng xuất sẽ yêu cầu nhập lại.

## Thêm ảnh bằng link

1. Chọn thao tác thêm ảnh.
2. Dán URL HTTPS trực tiếp đến ảnh. Link phải mở được trong một cửa sổ trình duyệt riêng, không yêu cầu đăng nhập. Link trang chia sẻ của Drive hoặc một trang web có chứa ảnh không đồng nghĩa với link trực tiếp đến tệp ảnh.
3. Điền tiêu đề tiếng Anh và tiếng Việt, địa điểm, nhóm nội dung và năm phù hợp với ảnh.
4. Nếu chưa xác định năm hoặc là ảnh giao lưu không cần xếp mốc thời gian, đánh dấu **No year / Không có năm**; ảnh nằm trong **People & Connections / Giao lưu kết nối**.
5. Kiểm tra bản xem trước và lưu. Chờ thông báo lưu thành công rồi mở thư viện để xem kết quả.

Nguồn ảnh hiện tại có thể tiếp tục dùng `https://www.vovsmart.net/picture/` và đúng tên tệp, bao gồm chữ hoa/thường. Ví dụ tên có dấu cách phải được mã hóa hợp lệ trong URL. Không cần đưa lại toàn bộ ảnh vào GitHub: ứng dụng lưu link, tiêu đề, năm và thông tin mô tả.

## Sửa và gán năm

Tìm mục cần sửa trong danh sách quản trị, mở trình chỉnh sửa, thay link hoặc thông tin và lưu. Có thể gán năm khác để đưa ảnh sang đúng mốc thời gian. Năm do người quản trị nhập là giá trị hiển thị và sắp xếp; không phụ thuộc ngày tải tệp lên máy chủ. Thư viện hiển thị tất cả media ngay từ đầu, không cần nút xem thêm.

Nội dung tiếng Anh được dùng khi người xem ở chế độ EN; nội dung tiếng Việt được dùng ở chế độ VI. Hãy cập nhật cả hai phần khi đổi ý nghĩa tiêu đề hoặc địa điểm.

## Xóa ảnh khỏi thư viện

Chọn xóa ở đúng mục cần bỏ và xác nhận theo hộp thoại. Thao tác chỉ xóa mục trong danh mục. Tệp ảnh ở `/picture/` hoặc nhà cung cấp ảnh vẫn còn nguyên; các ảnh khác sử dụng cùng link không bị xóa theo.

Mỗi lần lưu được ghi thành commit trong repo. Khi cần phục hồi mục đã xóa, người quản trị kỹ thuật có thể lấy lại mục từ phiên bản trước của `data/catalog.json` trong lịch sử Git.

## Nếu không lưu được

| Hiện tượng | Cách xử lý |
| --- | --- |
| Chưa cấu hình kho dữ liệu / chỉ đọc | Người quản trị hệ thống cần cài biến GitHub và khóa trên Vercel rồi triển khai lại |
| Khóa không hợp lệ | Kiểm tra đúng khóa media; nếu khóa vừa đổi cần dùng khóa mới |
| Lỗi `409` hoặc danh mục đã thay đổi | Có người/tab khác vừa lưu; tải lại danh mục, kiểm tra nội dung mới rồi thực hiện lại thay đổi |
| Lỗi origin / `403` | Thêm đúng origin đang dùng vào `MEDIA_ALLOWED_ORIGINS`; kiểm tra proxy không bỏ header Origin |
| Link xem trước không hiện ảnh | Kiểm tra HTTPS, chính tả tên tệp, quyền truy cập và khả năng chống hotlink của máy chủ ảnh |
| GitHub tạm từ chối / hết hạn mức | Chờ rồi thử lại; người quản trị kiểm tra token, quyền repo và hạn mức API |

Không cần bấm lưu nhiều lần khi đang chờ một thao tác. Nếu có lỗi, nội dung chưa được xác nhận lưu thành công không nên được coi là đã xuất hiện cho mọi người xem.
