# Triển khai VOVSMART Media tại vovsmart.net/media

Tài liệu này áp dụng cho bộ mã nguồn media tại repo do người dùng cung cấp: [tuan303/mediavovsmart](https://github.com/tuan303/mediavovsmart). Website chính nằm tại repo [tuan303/vov-web](https://github.com/tuan303/vov-web). Hostname Production media đã xác nhận là [mediavovsmart.vercel.app](https://mediavovsmart.vercel.app/media/); mẫu rewrite dùng đúng hostname này. Địa chỉ đích sau khi nối tuyến là `https://www.vovsmart.net/media/`.

## 1. Đường đi của yêu cầu

```text
Người xem → https://vovsmart.net/media/
          → www.vovsmart.net/media/ theo chuyển hướng domain hiện tại
          → dự án Vercel website chính: rewrite riêng /media/
          → https://mediavovsmart.vercel.app/media/
          → giao diện và Vercel Functions
          → Private Vercel Blob: media/catalog.json

Mã nguồn → GitHub: tuan303/mediavovsmart

Ảnh gốc → link HTTPS được lưu trong danh mục, ví dụ /picture ở máy chủ hiện tại
```

Kiểm tra HTTP ngày 16/10/2026 trả về `server: Vercel`, `x-vercel-id` và `x-vercel-cache` cho `https://www.vovsmart.net/`. Tên miền gốc chuyển sang `www`. Repo website chính đã xác định là [tuan303/vov-web](https://github.com/tuan303/vov-web); `vercel.json` hiện có redirect từ `vov-web-eight.vercel.app` về `www.vovsmart.net` và rewrite `/picture` tới `document.vovsmart.net`. Phương án triển khai là thêm external rewrite riêng cho `/media/` ở dự án này.

Trang chủ và thư mục `/picture` tiếp tục được phục vụ theo cấu hình hiện có. DNS hoạt động theo hostname nên không thể tạo một bản ghi DNS riêng cho `vovsmart.net/media`. Việc chuyển từng đường dẫn phù hợp với [hướng dẫn Incremental Migration của Vercel](https://vercel.com/docs/incremental-migration#keep-your-domain-on-the-legacy-server).

Đường dẫn `/srv/vovsmart-document/public/picture/` xuất hiện trong ảnh chụp trước đây chỉ cho biết vị trí thư mục ảnh; chưa đủ để kết luận máy chủ đang dùng Nginx, Apache hay dịch vụ hosting nào.

## 2. Chuẩn bị repo và dữ liệu

Đưa toàn bộ thư mục dự án lên [tuan303/mediavovsmart](https://github.com/tuan303/mediavovsmart). `data/catalog.json` trong repo là danh mục khởi tạo 68 ảnh. Hai tài nguyên hiển thị cục bộ trong `public/media/assets/photos/` được giữ lại cho định dạng ảnh gốc đặc biệt; các ảnh khác tiếp tục lấy từ URL nguồn.

Kho danh mục đang dùng là **Private Vercel Blob**, tên `vovsmart-media-catalog`, đã liên kết với dự án media trong team `tuan303-5380s-projects`. Vercel thêm `BLOB_READ_WRITE_TOKEN` vào môi trường đã liên kết. Tệp danh mục ở đường dẫn cố định `media/catalog.json` đã được seed 68 ảnh từ `data/catalog.json`. Không ghi đè tệp này bằng bản seed khi triển khai lại, vì sẽ mất các cập nhật sau đó.

Với một kho mới chưa có danh mục, kỹ thuật viên chuẩn bị `.env.local` chứa thông tin kết nối phía máy chủ rồi chạy `npm run catalog:init`. Script chỉ khởi tạo tệp private `media/catalog.json`, không ghi đè đối tượng đã có và không in secret. `.env.local` không được commit hoặc đưa vào gói bàn giao. Không chạy lại bước khởi tạo để “đồng bộ” những lần sửa ảnh.

Ứng dụng đọc/ghi Blob từ Functions, kiểm tra ETag trước khi ghi để tránh ghi đè thay đổi của phiên khác. Khi đã cấu hình Blob mà danh mục bị thiếu, không hợp lệ hoặc không truy cập được, API báo lỗi; không tự seed/reset hoặc quay lại dữ liệu cũ trong repo. GitHub chỉ quản lý mã nguồn và danh mục khởi tạo; mỗi lần lưu media không tạo commit. [Tài liệu Vercel Blob SDK](https://vercel.com/docs/vercel-blob/using-blob-sdk).

## 3. Tạo dự án Vercel

Dự án media đã được tạo và liên kết GitHub trong team được người dùng chọn: `tuan303-5380s-projects`, project ID `prj_wTHnZWWXezGe5YQSaTeqyjbmtoZG`. Không tạo thêm một dự án trùng tên chỉ để chạy lại hướng dẫn. Framework Preset **Other**, Root Directory là thư mục chứa `package.json` và `vercel.json`. Dùng Build Command và Output Directory đã khai báo; giữ `api/` tại gốc dự án để Vercel triển khai Functions.

Thêm biến môi trường cho **Production**:

```text
BLOB_READ_WRITE_TOKEN=<Vercel tự thêm khi kết nối Private Blob store>
MEDIA_ADMIN_KEY=<khóa ngẫu nhiên được tạo riêng>
MEDIA_ALLOWED_ORIGINS=https://vovsmart.net,https://www.vovsmart.net,https://mediavovsmart.vercel.app
```

Các dòng trên là mẫu, không phải secret có thể dùng. Adapter hỗ trợ cả `BLOB_STORE_ID` với xác thực OIDC tự động của Vercel khi không dùng token đọc/ghi. Tạo khóa quản trị trên máy của người quản trị bằng `npm run admin:key`, lưu vào trình quản lý mật khẩu và trường biến môi trường Vercel. Không nhập token Blob vào màn hình quản trị media. Không cần GitHub personal access token cho phương án Blob. Khi thay đổi biến môi trường, tạo deployment mới để áp dụng. [Tài liệu Vercel về biến môi trường](https://vercel.com/docs/environment-variables).

`MEDIA_ALLOWED_ORIGINS` gồm các origin chính xác, phân tách bằng dấu phẩy; không có `/media`, dấu `*` hoặc đường dẫn con. Nếu dùng một URL Preview để quản trị thử, thêm đúng origin đó vào môi trường Preview. Liên kết Preview với một Blob store thử nghiệm riêng, hoặc không cấp quyền ghi ở Preview, để thao tác thử không ảnh hưởng danh mục Production.

Git integration triển khai các thay đổi mã nguồn được push lên repo. Sửa media chỉ cập nhật Blob; API đọc danh mục đang chạy nên không cần chờ một deployment mới. [Tài liệu GitHub integration của Vercel](https://vercel.com/docs/git/vercel-for-github).

## 4. Kiểm tra trên Vercel trước khi nối tên miền

Chạy `npm ci`, `npm run check`, `npm test`, `npm run build` trong repo. Sau khi Vercel báo deployment thành công, dùng hostname ổn định của **dự án Production** làm upstream, không dùng URL của một commit cụ thể hoặc Preview ngẫu nhiên.

Kiểm tra các địa chỉ sau trên URL Vercel thực tế:

| Đường dẫn | Kết quả cần thấy |
| --- | --- |
| `/` | Chuyển tới `/media/` |
| `/media/` | Thư viện media, tiếng Anh mặc định; tất cả ảnh hiện ngay |
| `/media/api/catalog` | JSON danh mục; không chứa token hoặc khóa quản trị |
| `/media/admin/` | Trang quản trị, yêu cầu khóa trước khi ghi dữ liệu |

Thử bộ lọc năm, chuyển EN / VI và mở ảnh. Trên kho dữ liệu thử nghiệm, thêm một link ảnh, sửa tiêu đề và năm, tải lại trang, kiểm tra thay đổi tồn tại, rồi xóa mục thử. Kiểm tra đăng xuất và nhập khóa sai không cho phép sửa. Các kiểm tra cục bộ không thay thế lần xác nhận thực tế trên Vercel.

Nếu deployment đang bật Vercel Authentication hoặc Deployment Protection, người xem qua proxy cũng có thể bị chặn. Chọn thiết lập truy cập Production phù hợp với yêu cầu công khai của website trong Vercel; không nhúng token bỏ qua bảo vệ vào JavaScript hoặc mã nguồn được commit.

## 5. Thêm rewrite trong dự án Vercel của website chính

Mở repo [tuan303/vov-web](https://github.com/tuan303/vov-web), đối chiếu dự án Vercel đang gắn `www.vovsmart.net` trước khi phát hành. Đây là **dự án website chính**, khác với repo media `tuan303/mediavovsmart`.

Trong `vercel.json` của `tuan303/vov-web`, bổ sung các phần tử `redirects`, `rewrites` và `headers` từ [vercel-main-site-rewrites.example.json](vercel-main-site-rewrites.example.json) vào các mảng hiện tại. Redirect chính xác `/media` sang `/media/` để đường dẫn tài nguyên tương đối được phân giải đúng; rewrite `/media/:path*` chuyển các request còn lại lên `https://mediavovsmart.vercel.app/media/:path*`. Đặt các quy tắc riêng này trước catch-all nếu có.

Giữ nguyên rewrite `/picture` đến `document.vovsmart.net`, redirect hostname về `www.vovsmart.net`, `cleanUrls`, mọi header và các quy tắc hiện hữu. Không thêm cấu hình `trailingSlash` toàn cục để xử lý riêng `/media`, vì có thể làm thay đổi URL của site chính. Không chép mẫu đè lên toàn bộ `vercel.json` của website chính hoặc vào `vercel.json` của ứng dụng media.

External rewrite giữ URL người xem ở domain VOVSMART và gửi toàn bộ đường dẫn `/media/...` lên ứng dụng media. Mẫu tắt cache rewrite để danh mục và quản trị không lấy dữ liệu cũ. [Tài liệu Vercel về external rewrites và cache](https://vercel.com/docs/routing/rewrites#rewrites-to-external-origins).

Nếu site chính đang dùng cấu hình `routes` nâng cao hoặc có router/framework can thiệp `/media`, người quản trị cần tích hợp quy tắc tương đương vào cấu hình hiện có sau khi đọc repo; không trộn máy móc các kiểu cấu hình. Triển khai một Preview của website chính để xác nhận `/media/`, ảnh tĩnh và API trước khi đưa cấu hình lên Production.

Giữ chuyển hướng apex → `www` đang hoạt động và bảo toàn đường dẫn/query. Không thay DNS hoặc chuyển domain từ dự án chính sang dự án media. `MEDIA_ALLOWED_ORIGINS` của dự án media cần chứa origin website chính và origin Preview chính xác nếu thử thao tác quản trị qua Preview đó.

## Phương án phụ: điểm nhận request là Nginx

Chỉ dùng phần này nếu người quản trị xác nhận tuyến request thực tế cần chỉnh tại Nginx. Sao lưu cấu hình virtual host, thêm [nginx-media.conf.example](nginx-media.conf.example) vào server block HTTPS đang phục vụ domain; upstream trong mẫu là `mediavovsmart.vercel.app`. Giữ location `/` và `/picture/` hiện có.

Mẫu giữ nguyên `/media/...`; `proxy_pass` không có URI/dấu `/` sau hostname. Xác nhận đường dẫn CA bundle của máy chủ: mẫu dùng Debian/Ubuntu `/etc/ssl/certs/ca-certificates.crt`, còn RHEL thường dùng `/etc/pki/tls/certs/ca-bundle.crt`. Giữ xác thực TLS và SNI. [Tài liệu Nginx proxy module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html).

Nếu có chuyển hướng apex/www, đặt proxy ở virtual host cuối và bảo toàn `$request_uri`. Sau khi điền đúng giá trị và xác nhận vị trí cấu hình, người quản trị chạy:

```sh
sudo nginx -t
sudo systemctl reload nginx
```

Chỉ reload khi kiểm tra cú pháp thành công. Không cài thêm Nginx chỉ vì có tệp mẫu này. Đường dẫn `/srv/vovsmart-document/` trong ảnh chụp không chứng minh rằng tên miền chính nhận request qua Nginx.

## 6. Xác nhận địa chỉ chính thức

Mở `https://vovsmart.net/media`, kiểm tra trang tải được và địa chỉ vẫn thuộc domain VOVSMART (có thể chuyển sang `www` theo cấu hình hiện tại). Kiểm tra tiếp `https://vovsmart.net/media/admin/` và thao tác đọc/ghi thật đã được cho phép. Đối chiếu một lần lưu với danh mục API và kiểm tra sau khi tải lại trên thiết bị khác. Các thay đổi này nằm trong Blob, không xuất hiện như commit GitHub.

Kiểm tra trang chủ, ảnh trong `/picture/`, cả hai hostname có/không `www`, truy vấn tìm kiếm và điều hướng sau khi chuyển ngôn ngữ. Nếu thấy `403` khi lưu, kiểm tra origin và biến môi trường; `502` từ Nginx thường cần kiểm tra hostname upstream, TLS hoặc khả năng kết nối.

Muốn quay lại cấu hình trước khi nối đường dẫn, hoàn tác commit bổ sung rewrite ở website chính và triển khai lại; nếu dùng phương án Nginx thì khôi phục cấu hình virtual host đã sao lưu. Muốn phục hồi nội dung media, dùng bản sao lưu của danh mục Blob. Khôi phục Vercel deployment hoặc commit GitHub cũ không tự khôi phục dữ liệu đang chạy trong Blob.

Trước khi sửa nhiều mục, tải bản JSON danh mục hiện tại từ `/media/api/catalog` và giữ bản sao có ngày tháng ở nơi quản trị kiểm soát; kỹ thuật viên cũng có thể xuất trực tiếp qua private Blob SDK với `get` và `useCache: false`. Khi phục hồi, cần lấy đúng mảng ảnh từ bản sao, kiểm tra dữ liệu và cập nhật vào `media/catalog.json` có điều kiện `ifMatch` với ETag hiện tại để tránh đè thay đổi đang diễn ra. Chưa có lịch sử phiên bản tự động hoặc nút hoàn tác trong trang quản trị. Tệp seed trong GitHub chỉ khôi phục được danh mục ban đầu, không chứa các lần sửa sau đó.

## Giới hạn vận hành

Khóa quản trị dùng chung chưa hỗ trợ tài khoản, vai trò hoặc lịch sử người sửa riêng. Kho Blob là private nhưng API công khai có chủ đích trả danh mục cho người xem thư viện. Token lưu trữ chỉ ở phía máy chủ. Ảnh phải có URL HTTPS trực tiếp, cho phép truy cập từ trình duyệt người xem và không sớm hết hạn. Nếu link nguồn bị xóa hoặc chặn hotlink, ảnh sẽ không tải được.

Thiết kế phù hợp thư viện nhỏ và cập nhật không thường xuyên. Hai phiên lưu đồng thời sẽ được bảo vệ bằng ETag; phiên dùng bản cũ nhận `409` và cần tải lại. Theo dõi mức sử dụng Vercel Blob của tài khoản; với nhiều biên tập viên hoặc nhu cầu quản trị theo tài khoản, cần nâng cấp lớp xác thực và bổ sung sao lưu tự động.

## Phụ lục: GitHub Contents API là backend tùy chọn

Phương án này có sẵn trong mã nhưng **không phải cấu hình Blob đang triển khai**. Chỉ dùng khi người quản trị chủ động chọn lưu danh mục bằng GitHub. Cấu hình `GITHUB_REPOSITORY=tuan303/mediavovsmart`, `GITHUB_BRANCH=main` và `GITHUB_TOKEN`; bỏ cả `BLOB_READ_WRITE_TOKEN` lẫn `BLOB_STORE_ID` nếu muốn chọn backend GitHub. Khi một trong hai biến Blob có giá trị, ứng dụng ưu tiên Blob.

Token GitHub cần là fine-grained token chỉ cho đúng repo, quyền **Contents: Read and write**. Repo/nhánh phải có `data/catalog.json` và cho phép ghi trực tiếp. Nếu quy tắc bảo vệ nhánh yêu cầu pull request, dùng repo/nhánh dữ liệu phù hợp thay vì tắt quy tắc bảo vệ chung. [GitHub Contents API](https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents).

Chỉ trong chế độ GitHub, mỗi lần sửa media mới tạo commit và có thể phục hồi qua lịch sử Git. API dùng SHA để phát hiện xung đột; giới hạn sử dụng theo [GitHub REST API rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api). Không nhập GitHub token vào màn hình quản trị; người dùng vẫn nhập khóa `MEDIA_ADMIN_KEY` riêng.
