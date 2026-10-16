# VOVSMART Media

Thư viện ảnh song ngữ English / Tiếng Việt, chạy tại `/media/` trên Vercel. English là mặc định; toàn bộ media hiển thị ngay, có bộ lọc năm và lĩnh vực. Trang `/media/admin/` cho phép chèn link ảnh HTTPS, sửa thông tin, xóa ảnh khỏi thư viện và gán năm.

**Trạng thái bàn giao:** đây là mã nguồn và cấu hình triển khai cho repo [tuan303/mediavovsmart](https://github.com/tuan303/mediavovsmart). Website chính nằm ở repo [tuan303/vov-web](https://github.com/tuan303/vov-web). Cần kết nối repo media với Vercel và bổ sung rewrite trong repo website chính. Tệp cấu hình mẫu không tự thay đổi website hiện tại; việc có mã nguồn chưa đồng nghĩa đường dẫn chính thức đã hoạt động.

## Mô hình lưu trữ

- `public/media/`: giao diện và tài nguyên tĩnh; đường dẫn đã đặt dưới `/media/`.
- `data/catalog.json`: danh mục ảnh chuẩn, được quản lý bằng lịch sử Git.
- `api/catalog.js`: API đọc danh mục; truy cập ngoài qua `/media/api/catalog`.
- `api/admin.js`: API quản trị có khóa, lưu thay đổi vào GitHub bằng Contents API.
- `docs/vercel-main-site-rewrites.example.json`: mẫu bổ sung vào dự án website chính để đưa `/media/` sang ứng dụng này.
- `docs/nginx-media.conf.example`: phương án phụ nếu sau này xác nhận điểm nhận request là Nginx.

Ảnh nằm tại link nguồn; ứng dụng lưu link và thông tin mô tả, không tải ảnh lên GitHub. Xóa trong trang quản trị chỉ xóa mục khỏi danh mục, không xóa tệp ảnh trên máy chủ nguồn. Mỗi lần lưu tạo một commit. Không cần cơ sở dữ liệu riêng cho quy mô thư viện hiện tại và tần suất chỉnh sửa thấp.

## Chuẩn bị và kiểm tra

Cài phiên bản Node.js tương thích với `package.json`, rồi chạy tại thư mục dự án:

```sh
npm ci
npm run check
npm test
npm run build
```

Kiểm tra trong trình duyệt bằng môi trường phát triển có hỗ trợ Vercel Functions; mở trực tiếp tệp HTML không chạy được API quản trị.

## Đưa lên GitHub và Vercel

1. Đưa mã nguồn cùng `data/catalog.json` lên nhánh `main` của [tuan303/mediavovsmart](https://github.com/tuan303/mediavovsmart). Không commit `.env`, khóa quản trị hoặc GitHub token.
2. Trong Vercel, chọn **Add New → Project**, import repo vừa tạo. Chọn Framework Preset **Other**; dùng cấu hình build và output trong `vercel.json`.
3. Thêm các biến bên dưới vào **Settings → Environment Variables**, rồi triển khai lại để bản deploy sử dụng chúng. Nhập secret trực tiếp vào Vercel, không đưa vào mã frontend hay gửi trong hội thoại.
4. Kiểm tra URL Vercel `/media/`, `/media/admin/` và `/media/api/catalog`. Sau khi bản Vercel hoạt động, thêm rewrite ở dự án website chính theo [hướng dẫn triển khai](docs/DEPLOYMENT-VI.md).

| Biến | Giá trị cần cấu hình |
| --- | --- |
| `GITHUB_REPOSITORY` | `tuan303/mediavovsmart` |
| `GITHUB_BRANCH` | `main`, hoặc nhánh dữ liệu đã chọn |
| `GITHUB_TOKEN` | Fine-grained token chỉ truy cập repo trên, quyền **Contents: Read and write** |
| `MEDIA_ADMIN_KEY` | Khóa ngẫu nhiên ít nhất 32 ký tự, tạo bằng `npm run admin:key` |
| `MEDIA_ALLOWED_ORIGINS` | `https://vovsmart.net,https://www.vovsmart.net` và origin Vercel thực tế nếu cần dùng trang quản trị tại đó; không thêm đường dẫn `/media` |

GitHub token dùng cho máy chủ; `MEDIA_ADMIN_KEY` là khóa riêng dành cho người quản trị. Khi chưa cấu hình GitHub, thư viện đọc danh mục đi kèm mã nguồn và thao tác ghi bị khóa. Hướng dẫn nhập repo chính thức: [Vercel for GitHub](https://vercel.com/docs/git/vercel-for-github). Cách áp dụng biến môi trường: [Vercel Environment Variables](https://vercel.com/docs/environment-variables).

## Dùng địa chỉ vovsmart.net/media

Kiểm tra HTTP ngày 16/10/2026 cho thấy `www.vovsmart.net` được phục vụ qua Vercel; tên miền gốc chuyển tới `www`. Website chính dùng repo [tuan303/vov-web](https://github.com/tuan303/vov-web), với cấu hình hiện có chuyển hostname `vov-web-eight.vercel.app` về `www.vovsmart.net` và chuyển `/picture` tới `document.vovsmart.net`. Bổ sung external rewrite cho `/media/` vào `vercel.json` của repo này, giữ nguyên các rewrite, header và redirect đang dùng.

DNS chỉ phân giải tên miền, không phân luồng theo `/media`. Giữ cấu hình tên miền, trang chủ và `/picture`; bổ sung [mẫu rewrite](docs/vercel-main-site-rewrites.example.json), không thay thế cấu hình hiện có. Đọc [DEPLOYMENT-VI.md](docs/DEPLOYMENT-VI.md). Vercel hỗ trợ [rewrite tới ứng dụng khác trong khi giữ URL trình duyệt](https://vercel.com/docs/routing/rewrites#rewrites-to-external-origins).

## Cập nhật media

Mở `/media/admin/`, nhập khóa quản trị, dán link ảnh HTTPS trực tiếp, điền tiêu đề EN / VI và chọn năm. Đánh dấu **No year / Không có năm** cho nhóm **People & Connections / Giao lưu kết nối**. Có thể sửa từng mục hoặc xóa khỏi thư viện. [Hướng dẫn chi tiết](docs/ADMIN-VI.md).

Mỗi phiên quản trị giữ khóa trong bộ nhớ của trang, không lưu khóa vào localStorage. Sau khi tải lại trang hoặc đăng xuất, cần nhập lại khóa. Khóa chung phù hợp một nhóm quản trị nhỏ; chưa có tài khoản riêng, phân quyền hoặc nhật ký theo từng người.

Nếu hai người lưu cùng lúc, thao tác dùng bản danh mục cũ nhận lỗi `409`; tải lại danh mục rồi áp dụng lại thay đổi. Repo ghi lại lịch sử để phục hồi bằng Git. API chịu [giới hạn sử dụng của GitHub](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api); nếu lưu lượng hoặc tần suất cập nhật tăng mạnh, nên chuyển phần dữ liệu sang dịch vụ lưu trữ phù hợp.
