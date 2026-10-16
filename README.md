# VOVSMART Media

Thư viện ảnh song ngữ English / Tiếng Việt, chạy tại `/media/` trên Vercel. English là mặc định; toàn bộ media hiển thị ngay, có bộ lọc năm và lĩnh vực. Trang `/media/admin/` cho phép chèn link ảnh HTTPS, sửa thông tin, xóa ảnh khỏi thư viện và gán năm.

Mã nguồn dùng repo [tuan303/mediavovsmart](https://github.com/tuan303/mediavovsmart); website chính nằm ở [tuan303/vov-web](https://github.com/tuan303/vov-web). Dự án Vercel media đã kết nối GitHub trong team `tuan303-5380s-projects`. Kho **Private Vercel Blob** `vovsmart-media-catalog` lưu danh mục đang sử dụng. Rewrite trong website chính đã được triển khai để phục vụ `/media/`.

Website đang hoạt động tại [www.vovsmart.net/media/](https://www.vovsmart.net/media/), quản trị tại [www.vovsmart.net/media/admin/](https://www.vovsmart.net/media/admin/). Nhập `https://vovsmart.net/media` sẽ chuyển tới đúng thư viện. Hostname Production Vercel là [mediavovsmart.vercel.app/media/](https://mediavovsmart.vercel.app/media/). Danh mục Blob đã được khởi tạo 68 ảnh; khóa quản trị chỉ cấu hình cho môi trường Production. Đã xác nhận HTTP 200 cho trang media/quản trị và thao tác thêm, sửa, xóa qua API trên domain chính.

## Mô hình lưu trữ

- `public/media/`: giao diện và tài nguyên tĩnh; đường dẫn đã đặt dưới `/media/`.
- `data/catalog.json`: danh mục khởi tạo 68 ảnh; không tự đồng bộ lại từ dữ liệu đang chạy.
- Private Vercel Blob, đường dẫn `media/catalog.json`: danh mục đang chạy, dùng chung cho mọi người xem.
- `api/catalog.js`: API đọc danh mục; truy cập ngoài qua `/media/api/catalog`.
- `api/admin.js`: API quản trị có khóa, lưu thay đổi vào Private Vercel Blob.
- `docs/vercel-main-site-rewrites.example.json`: mẫu bổ sung vào dự án website chính để đưa `/media/` sang ứng dụng này.
- `docs/nginx-media.conf.example`: phương án phụ nếu sau này xác nhận điểm nhận request là Nginx.

Ảnh nằm tại link nguồn; ứng dụng chỉ lưu link và thông tin mô tả trong Blob. Xóa trong trang quản trị chỉ xóa mục khỏi danh mục, không xóa tệp ảnh trên máy chủ nguồn. Lưu media không tạo commit GitHub và không cần triển khai lại website. Bản khởi tạo trong repo không phải bản sao lưu tự động của danh mục hiện tại.

## Chuẩn bị và kiểm tra

Cài phiên bản Node.js tương thích với `package.json`, rồi chạy tại thư mục dự án:

```sh
npm ci
npm run check
npm test
npm run build
```

Kiểm tra trong trình duyệt bằng môi trường phát triển có hỗ trợ Vercel Functions; mở trực tiếp tệp HTML không chạy được API quản trị.

## Cấu hình triển khai và bảo trì

1. Đưa mã nguồn cùng `data/catalog.json` lên nhánh `main` của [tuan303/mediavovsmart](https://github.com/tuan303/mediavovsmart). Không commit `.env`, khóa quản trị hoặc token lưu trữ.
2. Dùng dự án media đã liên kết GitHub trong team `tuan303-5380s-projects`. Framework Preset là **Other**; dùng cấu hình build và output trong `vercel.json`. Nếu cài một bản sao mới, import repo và liên kết một Blob store **Private** riêng.
3. Kiểm tra các biến bên dưới trong **Settings → Environment Variables**, rồi triển khai lại nếu thay đổi. Khởi tạo `media/catalog.json` từ danh mục đi kèm một lần trước khi bật quản trị. Không ghi đè dữ liệu Blob đã có khi deploy hoặc chạy lại quy trình cài đặt.
4. Khi thay đổi cấu hình, kiểm tra cả URL Vercel và domain chính tại `/media/`, `/media/admin/`, `/media/api/catalog`. Rewrite của website chính đã triển khai; xem [hướng dẫn](docs/DEPLOYMENT-VI.md) để duy trì các quy tắc này.

| Biến | Giá trị cần cấu hình |
| --- | --- |
| `BLOB_READ_WRITE_TOKEN` | Vercel tự thêm khi liên kết Private Blob store; chỉ dùng phía máy chủ |
| `BLOB_STORE_ID` | Tùy chọn khi dùng cơ chế OIDC của store đã kết nối thay cho token đọc/ghi |
| `MEDIA_ADMIN_KEY` | Khóa ngẫu nhiên ít nhất 32 ký tự, tạo bằng `npm run admin:key` |
| `MEDIA_ALLOWED_ORIGINS` | `https://vovsmart.net,https://www.vovsmart.net,https://mediavovsmart.vercel.app`; không thêm đường dẫn `/media` |

`MEDIA_ADMIN_KEY` là khóa riêng dành cho người quản trị, khác token Blob. Không cần tạo GitHub personal access token cho cấu hình đang triển khai. Khi chưa cấu hình kho lưu trữ, thư viện chỉ đọc danh mục đi kèm mã nguồn và thao tác ghi bị khóa. Khi đã cấu hình Blob nhưng tệp không tồn tại hoặc không đọc được, API báo lỗi và không tự khởi tạo lại dữ liệu. Hướng dẫn dịch vụ: [Vercel Blob SDK](https://vercel.com/docs/vercel-blob/using-blob-sdk), [Vercel for GitHub](https://vercel.com/docs/git/vercel-for-github), [Vercel Environment Variables](https://vercel.com/docs/environment-variables).

## Dùng địa chỉ vovsmart.net/media

Website chính dùng repo [tuan303/vov-web](https://github.com/tuan303/vov-web), với cấu hình chuyển hostname `vov-web-eight.vercel.app` về `www.vovsmart.net` và chuyển `/picture` tới `document.vovsmart.net`. Cấu hình đã bổ sung redirect `/media` → `/media/`, rewrite riêng cho `/media/` và `/media/admin/`, rồi wildcard `/media/:path*` tới ứng dụng media. Các cấu hình sẵn có được giữ nguyên.

DNS chỉ phân giải tên miền, không phân luồng theo `/media`. Không cần đổi DNS để vận hành cấu hình này. [Mẫu rewrite](docs/vercel-main-site-rewrites.example.json) ghi lại các quy tắc media cần giữ; xem [DEPLOYMENT-VI.md](docs/DEPLOYMENT-VI.md). Vercel hỗ trợ [rewrite tới ứng dụng khác trong khi giữ URL trình duyệt](https://vercel.com/docs/routing/rewrites#rewrites-to-external-origins).

## Cập nhật media

Mở `/media/admin/`, nhập khóa quản trị, dán link ảnh HTTPS trực tiếp, điền tiêu đề EN / VI và chọn năm. Đánh dấu **No year / Không có năm** cho nhóm **People & Connections / Giao lưu kết nối**. Có thể sửa từng mục hoặc xóa khỏi thư viện. [Hướng dẫn chi tiết](docs/ADMIN-VI.md).

Mỗi phiên quản trị giữ khóa trong bộ nhớ của trang, không lưu khóa vào localStorage. Sau khi tải lại trang hoặc đăng xuất, cần nhập lại khóa. Khóa chung phù hợp một nhóm quản trị nhỏ; chưa có tài khoản riêng, phân quyền hoặc nhật ký theo từng người.

Nếu hai người lưu cùng lúc, điều kiện phiên bản ETag ngăn ghi đè bản mới và thao tác dùng bản cũ nhận lỗi `409`; tải lại danh mục rồi áp dụng lại thay đổi. Cần sao lưu riêng dữ liệu Blob để phục hồi nội dung đã sửa/xóa. GitHub lưu lịch sử mã nguồn, không lưu lịch sử các lần quản trị media ở cấu hình Blob.

Ứng dụng còn hỗ trợ GitHub Contents API như một backend tùy chọn; chỉ cấu hình khi chủ động chọn phương án đó. Xem phần phụ lục trong [DEPLOYMENT-VI.md](docs/DEPLOYMENT-VI.md).
