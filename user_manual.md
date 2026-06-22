# HƯỚNG DẪN VẬN HÀNH & SỬ DỤNG HỆ THỐNG GMV MAX OS

Chào mừng bạn đến với **GMV Max OS** - Hệ thống tự động hóa tối ưu ngân sách quảng cáo, tự động nhân bản chiến dịch và chẩn đoán hiệu suất quảng cáo TikTok Shop thông minh.

Tài liệu này được biên soạn chi tiết nhằm giúp người vận hành (operator) nắm rõ toàn bộ các chức năng hiện có của dự án và cách vận hành hệ thống một cách trơn tru, hiệu quả nhất.

---

## 1. ĐĂNG NHẬP & CẤU HÌNH CỬA HÀNG (SHOP) BAN ĐẦU

Sau khi hệ thống được khởi chạy thành công, bạn truy cập vào giao diện web qua đường dẫn (mặc định tại localhost là `http://localhost:3000`).

### 1.1. Đăng nhập tài khoản quản trị
*   **Tài khoản mặc định**: `admin@gmvmax.com`
*   **Mật khẩu**: *(Đã được thiết lập mặc định trong cơ sở dữ liệu khi khởi tạo hệ thống)*

### 1.2. Thêm và Cấu hình thông số Cửa hàng (Shop)
Trước khi kết nối tài khoản quảng cáo, bạn cần tạo Cửa hàng và cấu hình các chỉ số mục tiêu cho cửa hàng đó.
1.  Truy cập tab **Cấu hình tài khoản** (Account Settings).
2.  Tại mục **Quản lý Cửa hàng**, nhấn nút **Thêm cửa hàng mới** và cấu hình các thông số sau:
    *   **Tên cửa hàng**: Tên gợi nhớ (Ví dụ: *Alpha Fashion Shop*).
    *   **TikTok Shop ID**: Mã định danh cửa hàng TikTok Shop của bạn.
    *   **Ngưỡng ROI tối thiểu (Auto Relaunch Threshold)**: Ngưỡng hiệu quả quảng cáo (Doanh thu / Chi phí) tối thiểu để giữ chiến dịch hoạt động. Nếu dưới ngưỡng này, chiến dịch sẽ bị dừng và nhân bản bản mới (Mặc định khuyến nghị: `3.0`).
    *   **Chi phí tối thiểu (Min Spend)**: Mức chi tiêu tối thiểu trong ngày (VND hoặc USD tương ứng) để hệ thống bắt đầu quét và kiểm tra ROI. Nếu chiến dịch tiêu chưa tới mức này, hệ thống sẽ bỏ qua để chờ thu thập thêm dữ liệu (Mặc định khuyến nghị: `200,000` VNĐ).
    *   **Số đơn tối đa (Max Orders)**: Chốt chặn an toàn. Nếu chiến dịch trong ngày đã đạt trên số đơn này, hệ thống sẽ **không** tạm dừng chiến dịch cho dù ROI có thấp (Mặc định: `20` đơn).

---

## 2. HƯỚNG DẪN LIÊN KẾT TÀI KHOẢN QUẢNG CÁO QUA AUTH CODE

Hệ thống GMV Max OS quản lý quảng cáo thông qua kết nối API trực tiếp với TikTok Ads Manager. Để liên kết tài khoản quảng cáo mới vào Shop, hãy thực hiện theo các bước sau:

### 2.1. Lấy mã ủy quyền (Auth Code)
1.  Đăng nhập vào tài khoản **TikTok Developer** hoặc cổng ứng dụng đối tác của bạn.
2.  Tạo URL ủy quyền (Authorization URL) với các phạm vi quyền (scopes) cần thiết như quản lý chiến dịch (`campaign:write`, `campaign:read`, `ads:read`), xem báo cáo (`report:read`).
3.  Truy cập URL đó bằng tài khoản quảng cáo của bạn, bấm chấp nhận ủy quyền. Trình duyệt sẽ chuyển hướng (redirect) về một URL chứa tham số `auth_code` (Ví dụ: `http://localhost:3000/?auth_code=3g9x8f...`).
4.  Sao chép đoạn mã `auth_code` đó (mã này thường có hiệu lực rất ngắn từ 5-10 phút).

### 2.2. Nhập Auth Code trên giao diện Web
1.  Truy cập tab **Cấu hình tài khoản** (Account Settings).
2.  Di chuyển xuống mục **Liên kết tài khoản quảng cáo**.
3.  Chọn **Cửa hàng (Shop)** mục tiêu mà bạn muốn gán tài khoản quảng cáo này vào.
4.  Dán **Mã ủy quyền (Auth Code)** đã sao chép ở trên vào ô nhập liệu.
5.  Nhấn nút **Kết nối (Connect)**.

```text
Giao diện kết nối tài khoản quảng cáo:
┌──────────────────────────────────────────────────────────┐
│  KẾT NỐI TÀI KHOẢN QUẢNG CÁO MỚI                         │
│                                                          │
│  Chọn cửa hàng liên kết:  [ Alpha Fashion Shop   [v] ]   │
│  Mã ủy quyền (Auth Code): [ 3g9x8f2d5k9s2l1a0...     ]   │
│                                                          │
│  [  KẾT NỐI (CONNECT)  ]                                 │
└──────────────────────────────────────────────────────────┘
```

### 2.3. Quy trình tự động xử lý sau khi kết nối
Sau khi bạn bấm Connect, hệ thống sẽ tự động thực hiện ngầm các công việc sau:
1.  Gửi yêu cầu tới API TikTok để trao đổi **Auth Code** lấy **Access Token** (dùng để gọi API) và **Refresh Token** (dùng để tự động gia hạn quyền truy cập).
2.  Tự động quét toàn bộ danh sách các tài khoản quảng cáo (Advertiser Accounts) mà Token này có quyền quản lý.
3.  Lưu thông tin các tài khoản quảng cáo đó vào cơ sở dữ liệu với trạng thái hoạt động là `ACTIVE`, liên kết trực tiếp dưới Cửa hàng (Shop) bạn đã chọn.
4.  Tải dữ liệu ban đầu của các chiến dịch đang chạy về hệ thống để bắt đầu theo dõi.

---

## 3. CƠ CHẾ HOẠT ĐỘNG CỦA HỆ THỐNG TỰ ĐỘNG HÓA (AUTOMATION ENGINE)

Trái tim của GMV Max OS là hai quy tắc tự động hóa cốt lõi, chạy liên tục thông qua bộ lập lịch ngầm (Cron Worker) định kỳ mỗi **5 phút** hoặc khi bạn nhấn nút **Đồng bộ (Sync)** thủ công trên Dashboard.

---

### 3.1. QUY TẮC 1: Tự động Tạm dừng & Nhân bản Chiến dịch ROI thấp (Rule 5)

*   **Mục tiêu**: Loại bỏ các chiến dịch đang tiêu tiền lãng phí mà không tạo ra hiệu quả đầu tư mong muốn, đồng thời tự động tạo ngay một chiến dịch thay thế (Clone V2, V3...) để tối ưu hóa lại tệp đối tượng tiềm năng.

*   **Các điều kiện kiểm tra (Phải thỏa mãn đồng thời)**:
    1.  **Trạng thái chiến dịch**: Chiến dịch đang ở trạng thái Hoạt động (`ENABLE`) trên TikTok Ads Manager.
    2.  **Chi tiêu tối thiểu**: Số tiền đã tiêu trong ngày hôm nay của chiến dịch phải đạt hoặc vượt ngưỡng chi phí tối thiểu của Shop (Ví dụ: `>= 200,000` VNĐ).
    3.  **ROI kém**: Hiệu quả doanh thu trên chi phí (ROI) hôm nay thấp hơn ngưỡng cấu hình tối thiểu của Shop (Ví dụ: `< 3.0`).
    4.  **Chốt chặn an toàn (Giới hạn đơn hàng)**: Số đơn hàng thu về trong ngày của chiến dịch phải **dưới 20 đơn** (`orders < 20`).
        *   *Ý nghĩa bảo vệ*: Nếu một chiến dịch tuy ROI thấp (do vừa tăng ngân sách hay do lệch báo cáo tạm thời) nhưng đã đem lại trên 20 đơn hàng thực tế, hệ thống sẽ **bỏ qua không tắt** để tránh can thiệp ngoài ý muốn của nhà quảng cáo.

*   **Các hành động tự động được thực hiện**:
    1.  **Tạm dừng (Pause)** chiến dịch hiệu quả thấp trên TikTok Ads Manager để chặn việc đốt tiền.
    2.  **Cập nhật dữ liệu**: Chuyển trạng thái chiến dịch trong cơ sở dữ liệu cục bộ sang `CAMPAIGN_STATUS_DISABLE`.
    3.  **Nhân bản (Clone) chiến dịch mới**:
        *   Gửi lệnh API sao chép toàn bộ cấu hình chiến dịch cũ (mục tiêu chiến dịch, sản phẩm quảng cáo, cấu hình nhóm quảng cáo, các video/creative liên kết...).
        *   Tên chiến dịch mới được tự động đặt bằng cách thêm hậu tố số tăng dần (Ví dụ: từ `Camp_Fashion` thành `Camp_Fashion 1`, `Camp_Fashion 2`).
    4.  **Đồng bộ Múi giờ**: Hệ thống sẽ đọc múi giờ gốc của tài khoản quảng cáo để tính toán thời gian chạy thực tế phù hợp, đảm bảo chiến dịch mới được kích hoạt chạy ngay lập tức mà không bị dời lịch sang ngày hôm sau.
    5.  **Gửi Cảnh báo**: Ghi lại nhật ký hệ thống và gửi thông báo khẩn cấp qua Telegram Bot để bạn nắm được ID của chiến dịch cũ bị tắt và ID của chiến dịch mới vừa được tạo.

---

### 3.2. QUY TẮC 2: Tự động Tăng ngân sách khi chiến dịch hiệu quả (Rule 7)

*   **Mục tiêu**: Nhanh chóng đẩy thêm tiền cho các chiến dịch đang sinh lời tốt và có dấu hiệu cạn ngân sách trong ngày để gom thêm nhiều đơn hàng nhất có thể.

*   **Các điều kiện kiểm tra (Phải thỏa mãn đồng thời)**:
    1.  **Trạng thái chiến dịch**: Chiến dịch đang Hoạt động (`ENABLE`).
    2.  **Chế độ ngân sách**: Chiến dịch đang cài đặt ngân sách ngày (`BUDGET_MODE_DAY`).
    3.  **Mức độ tiêu tiền**: Số tiền chi tiêu hôm nay đã chạm ngưỡng **tối thiểu 60%** ngân sách ngày hiện tại của chiến dịch.
    4.  **ROI tốt**: Hiệu quả quảng cáo hôm nay vượt trội: **ROI > 3.0**.
    5.  **Giãn cách tần suất (Cooldown)**: Không có hành động tăng ngân sách nào được thực hiện cho chiến dịch này trong **30 phút qua**.
        *   *Ý nghĩa bảo vệ*: Tránh việc tăng ngân sách liên tục nhiều lần trong khoảng thời gian quá ngắn, đảm bảo tuân thủ giới hạn gọi API của TikTok và để chiến dịch có thời gian phân phối, đo lường hiệu suất mới.

*   **Các hành động tự động được thực hiện**:
    1.  **Tính toán ngân sách tăng thêm**: Tăng thêm **30%** so với ngân sách ngày hiện tại của chiến dịch.
    2.  **Tự động làm tròn số tiền**:
        *   Đối với tài khoản sử dụng tiền Việt Nam đồng (VND): Số tiền tăng thêm được làm tròn đến hàng nghìn gần nhất (Ví dụ: Ngân sách cũ 1,000,000đ -> Tăng 30% là 300,000đ. Nếu tính ra số lẻ như 299,500đ sẽ tự động làm tròn thành 300,000đ).
        *   Đối với tài khoản sử dụng ngoại tệ (USD, MYR...): Làm tròn về số nguyên gần nhất.
    3.  **Cập nhật trên TikTok**: Gọi API cập nhật ngân sách mới lên TikTok Ads Manager.
    4.  **Cập nhật Cơ sở dữ liệu**: Lưu mức ngân sách mới vào cơ sở dữ liệu cục bộ của hệ thống.
    5.  **Báo cáo**: Tạo cảnh báo `BUDGET_AUTO_INCREASED` và gửi tin nhắn Telegram báo cáo chi tiết (Ngân sách cũ, ngân sách mới, số tiền đã tiêu, ROI đạt được).

---

## 4. CHẨN ĐOÁN HIỆU SUẤT CHIẾN DỊCH BẰNG TRÍ TUỆ NHÂN TẠO (AI DIAGNOSTICS)

Hệ thống được tích hợp sẵn công cụ phân tích thông minh sử dụng Gemini AI để đưa ra cái nhìn tổng quan và các hành động sửa lỗi tối ưu cho tài khoản của bạn.

### 4.1. Cách thức kích hoạt chẩn đoán
1.  Truy cập tab **Chẩn đoán AI** (AI Diagnostics).
2.  Nhập mã khoá kết nối **Gemini API Key** của bạn (Khoá này được lưu trực tiếp và bảo mật trên bộ nhớ trình duyệt cá nhân của bạn, không gửi về server của GMV Max OS để đảm bảo an toàn tối đa).
3.  Chọn Shop cần chẩn đoán và bấm **Bắt đầu chẩn đoán AI** (Run AI Diagnostics).

### 4.2. Các bước xử lý của AI
*   **Bước 1**: Đọc dữ liệu chi tiết của ngày hôm nay (bao gồm tất cả các chỉ số chiến dịch, sản phẩm, video quảng cáo và các cảnh báo tự động hóa đã kích hoạt).
*   **Bước 2**: Tính toán và phân tích các chỉ số tài chính (CPA, CTR, CPM, CPC, tỷ lệ chuyển đổi, mức độ tiêu hao ngân sách).
*   **Bước 3**: Chuyển dữ liệu sang mô hình AI tối ưu `gemini-2.5-flash` (và tự động chuyển sang `gemini-1.5-flash` làm phương án dự phòng nếu xảy ra lỗi nghẽn mạng).
*   **Bước 4**: Hiển thị báo cáo dưới dạng biểu đồ, bảng biểu (AI Blueprint) đề xuất các giải pháp tăng/giảm ngân sách, tối ưu hóa nội dung video quảng cáo.

---

## 5. TƯƠNG TÁC QUA TELEGRAM BOT (ĐIỀU HÀNH TỪ XA)

Bạn có thể quản lý, kiểm tra dữ liệu shop trực tiếp bằng điện thoại thông qua nhóm chat Telegram đã liên kết mà không cần đăng nhập vào giao diện web.

### 5.1. Lệnh kiểm tra tốc độ tiêu tiền `/tocdo` (hoặc `tốc độ`, `tocdo`)
*   **Mô tả**: Bot sẽ đo lường chi phí đã tiêu của tất cả chiến dịch đang hoạt động trong vòng **30 phút qua**.
*   **Phân loại cảnh báo**:
    *   🟢 **Xanh lá**: Tốc độ chi tiêu tốt (Chiến dịch đã tiêu từ 100,000 VNĐ trở lên trong 30 phút).
    *   🟡 **Vàng**: Chiến dịch tiêu tiền chậm hoặc bị chững lại (Chi tiêu dưới 100,000 VNĐ trong 30 phút). Bạn nên kiểm tra xem nhóm quảng cáo có bị bó tệp hay bị cạnh tranh thầu không.

### 5.2. Lệnh xuất báo cáo hiệu suất ngày `/baocao` (hoặc `báo cáo`, `baocao`)
*   **Mô tả**: Tổng hợp toàn bộ các chỉ số của shop tính đến thời điểm hiện tại trong ngày.
*   **Chỉ số báo cáo gồm**: Tổng ngân sách, tổng chi phí đã tiêu, doanh thu GMV thực tế, ROI trung bình và số lượng đơn hàng đã chốt.
*   *Lưu ý*: Báo cáo bao gồm số liệu của cả các chiến dịch đã bị tạm dừng do Rule 5 trước đó để bạn có cái nhìn tổng quát chính xác nhất về hoạt động kinh doanh trong ngày.

---

## 6. HƯỚNG DẪN XỬ LÝ SỰ CỐ THƯỜNG GẶP (FAQ)

### Q1: Tại sao bấm nút phát video ▶️ trên màn hình báo "Video không khả dụng"?
*   **Trường hợp 1 (Tài khoản Test / Dữ liệu giả lập)**: Hệ thống sử dụng các video quảng cáo hoạt động công khai tại Việt Nam để chạy thử nghiệm. Hãy kiểm tra xem mạng internet của bạn có chặn kết nối đến tên miền TikTok không.
*   **Trường hợp 2 (Dữ liệu thực tế)**: Do liên kết xem trước (`preview_url`) được TikTok cung cấp đã hết hạn (TikTok giới hạn liên kết preview chỉ tồn tại từ 24 - 72 giờ vì lý do bảo mật).
    *   *Cách xử lý*: Bạn chỉ cần nhấn nút **Đồng bộ (Sync)** trên Dashboard để hệ thống tự động gọi API lấy liên kết xem trước mới nhất từ TikTok Ads Manager.

### Q2: Tài khoản quảng cáo đột ngột dừng tự động đồng bộ dữ liệu ngầm?
*   **Nguyên nhân**: Mã kết nối (Access Token) từ TikTok đã hết hạn hoặc mật khẩu tài khoản TikTok Shop/Ads Manager của bạn bị thay đổi dẫn đến mất quyền ủy quyền.
*   **Cách xử lý**: Hệ thống có cơ chế tự động làm mới mã bảo mật (Auto-refresh token) trước khi hết hạn 15 phút. Tuy nhiên nếu bị lỗi nặng, hãy truy cập tab **Cấu hình tài khoản**, xóa tài khoản bị lỗi đi và thực hiện liên kết lại bằng Auth Code mới.

### Q3: Giao diện web bị trắng xóa hoặc không cập nhật sau khi chỉnh sửa?
*   **Nguyên nhân**: Bộ nhớ cache chạy thử (`.next`) của Next.js bị lỗi xung đột trong quá trình phát triển hoặc nâng cấp database.
*   **Cách xử lý**:
    1.  Tắt Terminal/Command Prompt đang chạy Next.js.
    2.  Xóa thư mục `.next`:
        *   Trên Windows (PowerShell/CMD): `rmdir /s /q .next`
        *   Trên macOS / Linux: `rm -rf .next`
    3.  Chạy lại dự án bằng lệnh: `npm run dev` (hoặc `npm run build && npm start` đối với bản chạy thực tế VPS).
