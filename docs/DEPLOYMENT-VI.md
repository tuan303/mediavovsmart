# Triển khai VOVSMART Media tại vovsmart.net/media

Tài liệu này áp dụng cho bộ mã nguồn media tại repo do người dùng cung cấp: [tuan303/mediavovsmart](https://github.com/tuan303/mediavovsmart). Website chính nằm tại repo [tuan303/vov-web](https://github.com/tuan303/vov-web). `YOUR-VERCEL-PROJECT` trong mẫu cấu hình là chỗ trống phải thay bằng hostname Vercel media thực tế sau khi triển khai.

## 1. Đường đi của yêu cầu

```text
Người xem → https://vovsmart.net/media/
          → www.vovsmart.net/media/ theo chuyển hướng domain hiện tại
          → dự án Vercel website chính: rewrite riêng /media/
          → https://YOUR-VERCEL-PROJECT.vercel.app/media/
          → giao diện và Vercel Functions
          → GitHub: data/catalog.json

Ảnh gốc → link HTTPS được lưu trong danh mục, ví dụ /picture ở máy chủ hiện tại
```

Kiểm tra HTTP ngày 16/10/2026 trả về `server: Vercel`, `x-vercel-id` và `x-vercel-cache` cho `https://www.vovsmart.net/`. Tên miền gốc chuyển sang `www`. Repo website chính đã xác định là [tuan303/vov-web](https://github.com/tuan303/vov-web); `vercel.json` hiện có redirect từ `vov-web-eight.vercel.app` về `www.vovsmart.net` và rewrite `/picture` tới `document.vovsmart.net`. Phương án triển khai là thêm external rewrite riêng cho `/media/` ở dự án này.

Trang chủ và thư mục `/picture` tiếp tục được phục vụ theo cấu hình hiện có. DNS hoạt động theo hostname nên không thể tạo một bản ghi DNS riêng cho `vovsmart.net/media`. Việc chuyển từng đường dẫn phù hợp với [hướng dẫn Incremental Migration của Vercel](https://vercel.com/docs/incremental-migration#keep-your-domain-on-the-legacy-server).

Đường dẫn `/srv/vovsmart-document/public/picture/` xuất hiện trong ảnh chụp trước đây chỉ cho biết vị trí thư mục ảnh; chưa đủ để kết luận máy chủ đang dùng Nginx, Apache hay dịch vụ hosting nào.

## 2. Chuẩn bị repo và dữ liệu

Đưa toàn bộ thư mục dự án lên [tuan303/mediavovsmart](https://github.com/tuan303/mediavovsmart). Repo phải chứa `data/catalog.json` trên nhánh được chọn. Danh mục ban đầu có 68 ảnh; nội dung ảnh tiếp tục lấy từ các URL nguồn. Hai tài nguyên hiển thị cục bộ đi kèm trong `public/media/assets/photos/` đã được giữ lại cho định dạng ảnh gốc đặc biệt.

Tạo fine-grained personal access token trên GitHub, giới hạn vào đúng repo này, cấp **Contents: Read and write**. Không cần quyền Workflows cho ứng dụng. Chọn thời hạn phù hợp và ghi nhớ ngày gia hạn. Nếu repo thuộc tổ chức, có thể cần quản trị viên tổ chức duyệt token. Thao tác lưu cập nhật một tệp bằng SHA của phiên bản trước theo [GitHub Contents API](https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents).

Kiểm tra quy tắc bảo vệ nhánh: ứng dụng cần quyền ghi trực tiếp vào nhánh dữ liệu. Nếu `main` bắt buộc pull request, sử dụng một repo dữ liệu riêng hoặc nhánh dữ liệu phù hợp và đặt `GITHUB_REPOSITORY` / `GITHUB_BRANCH` tương ứng. Không bỏ quy tắc bảo vệ chung chỉ để cho phép ứng dụng hoạt động.

## 3. Tạo dự án Vercel

Import repo từ GitHub, Framework Preset **Other**, Root Directory là thư mục chứa `package.json` và `vercel.json`. Dùng Build Command và Output Directory đã khai báo trong `vercel.json`; giữ các file `api/` tại gốc dự án để Vercel triển khai Functions.

Thêm biến môi trường cho **Production**:

```text
GITHUB_REPOSITORY=tuan303/mediavovsmart
GITHUB_BRANCH=main
GITHUB_TOKEN=<fine-grained token riêng của repo>
MEDIA_ADMIN_KEY=<khóa ngẫu nhiên được tạo riêng>
MEDIA_ALLOWED_ORIGINS=https://vovsmart.net,https://www.vovsmart.net,https://YOUR-VERCEL-PROJECT.vercel.app
```

Các dòng trên là mẫu, không phải secret có thể dùng. Tạo khóa quản trị trên máy của người quản trị bằng `npm run admin:key`, lưu vào trình quản lý mật khẩu và trường biến môi trường Vercel. Không nhập `GITHUB_TOKEN` vào màn hình quản trị media. Khi thay đổi biến môi trường, tạo deployment mới để áp dụng. [Tài liệu Vercel về biến môi trường](https://vercel.com/docs/environment-variables).

`MEDIA_ALLOWED_ORIGINS` gồm các origin chính xác, phân tách bằng dấu phẩy; không có `/media`, dấu `*` hoặc đường dẫn con. Nếu dùng một URL Preview để quản trị thử, thêm đúng origin đó vào môi trường Preview. Nên để Preview dùng nhánh/repo dữ liệu thử nghiệm, tránh việc thử thêm/xóa ảnh tác động vào danh mục Production.

Vercel Git integration có thể tạo deployment mới khi có commit; thay đổi media qua ứng dụng cũng tạo commit. Vì API đọc danh mục GitHub ở thời điểm yêu cầu, phần danh mục không cần chờ build mới mới có hiệu lực. [Tài liệu GitHub integration của Vercel](https://vercel.com/docs/git/vercel-for-github).

## 4. Kiểm tra trên Vercel trước khi nối tên miền

Chạy `npm ci`, `npm run check`, `npm test`, `npm run build` trong repo. Sau khi Vercel báo deployment thành công, dùng hostname ổn định của **dự án Production** làm upstream, không dùng URL của một commit cụ thể hoặc Preview ngẫu nhiên.

Kiểm tra các địa chỉ sau trên URL Vercel thực tế:

| Đường dẫn | Kết quả cần thấy |
| --- | --- |
| `/` | Chuyển tới `/media/` |
| `/media/` | Thư viện media, tiếng Anh mặc định; tất cả ảnh hiện ngay |
| `/media/api/catalog` | JSON danh mục; không chứa token hoặc khóa quản trị |
| `/media/admin/` | Trang quản trị, yêu cầu khóa trước khi ghi dữ liệu |

Thử bộ lọc năm, chuyển EN / VI và mở ảnh. Trên nhánh dữ liệu thử nghiệm, thêm một link ảnh, sửa tiêu đề và năm, tải lại trang, kiểm tra thay đổi tồn tại, rồi xóa mục thử. Kiểm tra đăng xuất và nhập khóa sai không cho phép sửa. Các kiểm tra cục bộ không thay thế lần xác nhận thực tế trên Vercel.

Nếu deployment đang bật Vercel Authentication hoặc Deployment Protection, người xem qua proxy cũng có thể bị chặn. Chọn thiết lập truy cập Production phù hợp với yêu cầu công khai của website trong Vercel; không nhúng token bỏ qua bảo vệ vào JavaScript hoặc mã nguồn được commit.

## 5. Thêm rewrite trong dự án Vercel của website chính

Mở repo [tuan303/vov-web](https://github.com/tuan303/vov-web), đối chiếu dự án Vercel đang gắn `www.vovsmart.net` trước khi phát hành. Đây là **dự án website chính**, khác với repo media `tuan303/mediavovsmart`.

Trong `vercel.json` của `tuan303/vov-web`, bổ sung các phần tử `redirects`, `rewrites` và `headers` từ [vercel-main-site-rewrites.example.json](vercel-main-site-rewrites.example.json) vào các mảng hiện tại. Redirect chính xác `/media` sang `/media/` để đường dẫn tài nguyên tương đối được phân giải đúng; rewrite `/media/:path*` chuyển các request còn lại lên ứng dụng media. Thay hostname mẫu bằng hostname Production media đã kiểm tra. Đặt các quy tắc riêng này trước catch-all nếu có.

Giữ nguyên rewrite `/picture` đến `document.vovsmart.net`, redirect hostname về `www.vovsmart.net`, `cleanUrls`, mọi header và các quy tắc hiện hữu. Không thêm cấu hình `trailingSlash` toàn cục để xử lý riêng `/media`, vì có thể làm thay đổi URL của site chính. Không chép mẫu đè lên toàn bộ `vercel.json` của website chính hoặc vào `vercel.json` của ứng dụng media.

External rewrite giữ URL người xem ở domain VOVSMART và gửi toàn bộ đường dẫn `/media/...` lên ứng dụng media. Mẫu tắt cache rewrite để danh mục và quản trị không lấy dữ liệu cũ. [Tài liệu Vercel về external rewrites và cache](https://vercel.com/docs/routing/rewrites#rewrites-to-external-origins).

Nếu site chính đang dùng cấu hình `routes` nâng cao hoặc có router/framework can thiệp `/media`, người quản trị cần tích hợp quy tắc tương đương vào cấu hình hiện có sau khi đọc repo; không trộn máy móc các kiểu cấu hình. Triển khai một Preview của website chính để xác nhận `/media/`, ảnh tĩnh và API trước khi đưa cấu hình lên Production.

Giữ chuyển hướng apex → `www` đang hoạt động và bảo toàn đường dẫn/query. Không thay DNS hoặc chuyển domain từ dự án chính sang dự án media. `MEDIA_ALLOWED_ORIGINS` của dự án media cần chứa origin website chính và origin Preview chính xác nếu thử thao tác quản trị qua Preview đó.

## Phương án phụ: điểm nhận request là Nginx

Chỉ dùng phần này nếu người quản trị xác nhận tuyến request thực tế cần chỉnh tại Nginx. Sao lưu cấu hình virtual host, thêm [nginx-media.conf.example](nginx-media.conf.example) vào server block HTTPS đang phục vụ domain và thay hostname mẫu. Giữ location `/` và `/picture/` hiện có.

Mẫu giữ nguyên `/media/...`; `proxy_pass` không có URI/dấu `/` sau hostname. Xác nhận đường dẫn CA bundle của máy chủ: mẫu dùng Debian/Ubuntu `/etc/ssl/certs/ca-certificates.crt`, còn RHEL thường dùng `/etc/pki/tls/certs/ca-bundle.crt`. Giữ xác thực TLS và SNI. [Tài liệu Nginx proxy module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html).

Nếu có chuyển hướng apex/www, đặt proxy ở virtual host cuối và bảo toàn `$request_uri`. Sau khi điền đúng giá trị và xác nhận vị trí cấu hình, người quản trị chạy:

```sh
sudo nginx -t
sudo systemctl reload nginx
```

Chỉ reload khi kiểm tra cú pháp thành công. Không cài thêm Nginx chỉ vì có tệp mẫu này. Đường dẫn `/srv/vovsmart-document/` trong ảnh chụp không chứng minh rằng tên miền chính nhận request qua Nginx.

## 6. Xác nhận địa chỉ chính thức

Mở `https://vovsmart.net/media`, kiểm tra trang tải được và địa chỉ vẫn thuộc domain VOVSMART (có thể chuyển sang `www` theo cấu hình hiện tại). Kiểm tra tiếp `https://vovsmart.net/media/admin/` và thao tác đọc/ghi thật đã được cho phép. Đối chiếu một lần lưu với commit mới trong GitHub và với danh mục sau khi tải lại trên thiết bị khác.

Kiểm tra trang chủ, ảnh trong `/picture/`, cả hai hostname có/không `www`, truy vấn tìm kiếm và điều hướng sau khi chuyển ngôn ngữ. Nếu thấy `403` khi lưu, kiểm tra origin và biến môi trường; `502` từ Nginx thường cần kiểm tra hostname upstream, TLS hoặc khả năng kết nối.

Muốn quay lại cấu hình trước khi nối đường dẫn, hoàn tác commit bổ sung rewrite ở website chính và triển khai lại; nếu dùng phương án Nginx thì khôi phục cấu hình virtual host đã sao lưu. Muốn phục hồi một lần sửa nội dung media, phục hồi `data/catalog.json` từ lịch sử Git. Khôi phục một Vercel deployment cũ không tự khôi phục dữ liệu đang đọc trực tiếp từ GitHub.

## Giới hạn vận hành

Khóa quản trị dùng chung chưa hỗ trợ tài khoản, vai trò hoặc lịch sử người sửa riêng. Thư viện là nội dung công khai; private repo chỉ bảo vệ mã nguồn và quyền ghi. Ảnh phải có URL HTTPS trực tiếp, cho phép truy cập từ trình duyệt người xem và không sớm hết hạn. Nếu link nguồn bị xóa hoặc chặn hotlink, ảnh sẽ không tải được.

GitHub có giới hạn tốc độ đọc và ghi; xem [REST API rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api). Thiết kế này phù hợp thư viện nhỏ và cập nhật không thường xuyên. Với lưu lượng lớn, nhiều biên tập viên hoặc nhu cầu quản trị theo tài khoản, cần nâng cấp lớp lưu trữ và xác thực.
