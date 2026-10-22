# ☕ Smart Coffee Management & AI Insights System
### Hệ Thống Quản Lý Chuỗi Cà Phê Thông Minh & Dự Báo Trí Tuệ Nhân Tạo

---

## 📌 1. Tổng Quan Hệ Thống

Dự án **Smart Coffee** là nền tảng quản lý chuỗi cửa hàng cà phê toàn diện kết hợp trí tuệ nhân tạo (AI & Machine Learning) phục vụ tối ưu hóa vận hành, quản lý doanh số thời gian thực và tự động hóa chuỗi cung ứng nguyên vật liệu.

* **Thị trường mục tiêu**: Chuỗi chi nhánh tại **Thị xã Sơn Tây & Ba Vì, Hà Nội**.
* **Thiết kế giao diện**: **Minimalist Soft Brown & Milk White** (Nâu cà phê dịu `#6F4E37`, Xanh Sage `#4A6B5D`, nền Trắng ngà `#FAF8F5`).
* **Hệ thống Icon**: 100% Ant Design Official Icons (`@ant-design/icons`).
* **Phân quyền RBAC**: 3 cấp độ chặt chẽ (`SUPER_ADMIN`, `BRANCH_MANAGER`, `STAFF`).
* **Kiến trúc dữ liệu**: MySQL 8.0+ với Raw SQL PyMySQL tối ưu hiệu năng cao.

---

## 🏗️ 2. Kiến Trúc Kỹ Thuật (Tech Stack)

```
Smart Coffee System Architecture
├── Backend (Python Flask RESTful API)
│   ├── Raw SQL Adapter (PyMySQL, DictCursor, Connection Pooling)
│   ├── JWT Authentication & RBAC Middleware (Super Admin, Branch Manager, Staff)
│   └── AI/ML Engine (Scikit-Learn Random Forest, Mlxtend Apriori, BOM Processor)
│
├── Frontend (React 18 + Vite)
│   ├── UI Framework: Ant Design 5 (vi_VN Locale, Minimalist Theme Tokens)
│   ├── Data Visualization: Apache ECharts (Responsive Vector SVG)
│   ├── State & Auth: Context API + Axios Interceptors
│   └── Client-side Routing: React Router v6 với Route Guards phân quyền
│
└── Database & Containerization
    ├── Database: MySQL 8.0+ (14 Tables, B-Tree Indexes, BOM Relations)
    └── Docker: Multi-stage Build, Nginx Reverse Proxy, Docker Compose
```

---

## 🤖 3. Chi Tiết Cách Thức Hoạt Động Của Các Module AI (AI / Machine Learning Engine)

Hệ thống AI được xây dựng độc lập trong thư mục `backend/app/ai_engine/` với 3 thuật toán cốt lõi:

```
                  ┌───────────────────────────────────────────────────────────┐
                  │                 LỊCH SỬ ĐƠN HÀNG (MySQL)                  │
                  └─────────────────────────────┬─────────────────────────────┘
                                                │
                 ┌──────────────────────────────┼─────────────────────────────┐
                 │                              │                             │
                 ▼                              ▼                             ▼
   ┌───────────────────────────┐  ┌───────────────────────────┐  ┌───────────────────────────┐
   │  1. DỰ BÁO DOANH THU      │  │  2. NHU CẦU NGUYÊN LIỆU   │  │  3. GỢI Ý BÁN CHÉO (POS)  │
   │  (Random Forest Regressor)│  │  (RF + Định Lượng BOM)    │  │  (Thuật toán Apriori)     │
   └─────────────┬─────────────┘  └─────────────┬─────────────┘  └─────────────┬─────────────┘
                 │                              │                             │
                 ▼                              ▼                             ▼
       Đồ thị chuỗi thời gian        Đề xuất danh sách nhập kho     Popup gợi ý combo bán kèm
        & Dải tin cậy 95%               và dự trù chi phí vốn           ngay trên quầy thu ngân
```

### 📈 Module 1: Dự Báo Doanh Thu Chuỗi Thời Gian (`revenue_forecaster.py`)
* **Mục tiêu**: Dự báo chính xác tổng doanh thu của từng chi nhánh hoặc toàn chuỗi trong 7 ngày và 30 ngày tiếp theo.
* **Quy trình xử lý dữ liệu (Data Pipeline & Feature Engineering)**:
  1. **Tổng hợp dữ liệu**: Gom nhóm doanh thu theo ngày từ bảng `orders` với trạng thái `COMPLETED`.
  2. **Tạo biến trễ (Lag Features)**:
     - `lag_1`: Doanh thu ngày hôm trước.
     - `lag_7`: Doanh thu cùng ngày tuần trước (phát hiện chu kỳ 7 ngày).
     - `rolling_mean_7`: Trung bình trượt 7 ngày gần nhất (làm mượt biến động ngắn hạn).
  3. **Biến lịch biểu (Calendar Features)**:
     - `day_of_week` (Thứ trong tuần: 0 - 6).
     - `is_weekend` (1 nếu là Thứ 7 hoặc Chủ Nhật, 0 nếu là ngày trong tuần).
     - `day_of_month` và `month`.
* **Mô hình học máy**: `RandomForestRegressor(n_estimators=150, max_depth=8, random_state=42)`.
* **Dải tin cậy 95% (Confidence Interval)**:
  $$\text{Upper} = \hat{y} + 1.96 \times \sigma_{\text{residuals}}, \quad \text{Lower} = \max(0, \hat{y} - 1.96 \times \sigma_{\text{residuals}})$$
* **Hiệu năng thực tế**: Hệ số xác định $R^2 \approx 0.88 - 0.92$, sai số tuyệt đối trung bình (MAE) thấp.

---

### 📦 Module 2: Dự Báo Nhu Cầu Nguyên Liệu & Nhập Kho Tự Động (`inventory_forecaster.py`)
* **Mục tiêu**: Tự động tính toán lượng nguyên liệu (cà phê, sữa Ba Vì, cốt trà, kem trứng...) cần mua để không bao giờ bị đứt hàng tại quầy.
* **Thuật toán quy đổi định lượng (Dynamic BOM Calculation)**:
  1. **Bước 1**: Dự báo tổng sản lượng từng món đồ uống bán ra trong chu kỳ $N$ ngày tới (7, 14, 30 ngày) dựa trên tỷ trọng phân phối lịch sử kết hợp với dự báo doanh thu Random Forest.
  2. **Bước 2**: Quy đổi sản lượng món sang lượng nguyên liệu tiêu thụ thông qua bảng công thức `product_recipes`:
     $$\text{Predicted\_Consumption}_i = \sum_{j \in \text{Products}} \left( Q_j \times \text{BOM}_{j, i} \right)$$
  3. **Bước 3**: Tính toán lượng khuyến nghị đặt hàng (Recommended Order Quantity):
     $$\text{Lượng Cần Nhập}_i = \max\left(0, \text{Predicted\_Consumption}_i + \text{Safety\_Stock}_i - \text{Current\_Stock}_i\right)$$
  4. **Bước 4**: Phân loại trạng thái nguyên liệu (`CRITICAL`: hết hàng, `WARNING`: sắp hết, `SUFFICIENT`: đủ hàng) và tính toán tổng chi phí vốn dự kiến.

---

### 🛒 Module 3: Khai Phá Quy Luật Giỏ Hàng & Bán Chéo POS (`market_basket.py`)
* **Mục tiêu**: Tự động phát hiện các nhóm món thường được khách hàng mua cùng nhau để gợi ý Upsell/Cross-sell trực tiếp cho thu ngân khi đang order.
* **Thuật toán**: `apriori` và `association_rules` từ thư viện `mlxtend`.
* **Các chỉ số đánh giá cốt lõi**:
  - **Độ hỗ trợ (Support)**: Tần suất món $A$ và món $B$ xuất hiện đồng thời trong toàn bộ hóa đơn:
    $$\text{Support}(A \rightarrow B) = \frac{\text{Số đơn chứa cả } A \text{ và } B}{\text{Tổng số đơn hàng}}$$
  - **Độ tin cậy (Confidence)**: Xác suất khách hàng sẽ mua thêm $B$ khi đã chọn $A$:
    $$\text{Confidence}(A \rightarrow B) = \frac{\text{Support}(A \cup B)}{\text{Support}(A)}$$
  - **Độ nâng (Lift)**: Mức độ tác động thúc đẩy mua kèm (nếu $\text{Lift} > 1$, việc chọn $A$ làm tăng khả năng mua $B$ rõ rệt):
    $$\text{Lift}(A \rightarrow B) = \frac{\text{Confidence}(A \rightarrow B)}{\text{Support}(B)}$$
* **Cơ chế gợi ý thời gian thực**: Khi thu ngân chọn bất kỳ món nào vào giỏ hàng tại màn hình POS, hệ thống tức thì gửi danh sách giỏ hàng qua API `/api/ai/pos-cross-sell` để lọc các quy luật có Lift cao nhất và hiển thị popup gợi ý.

---

## 🗄️ 4. Cơ Sở Dữ Liệu & Tài Khoản Mẫu

### 🔑 Thông số kết nối MySQL:
* **Host**: `127.0.0.1:3306` | **Database**: `smart_coffee_db`
* **User**: `root` | **Password**: `password123` (hoặc `123456` tùy môi trường)
* **File DDL Cơ sở dữ liệu**: [`smart_coffee_db.sql`](./smart_coffee_db.sql)

### 👥 Danh sách tài khoản đăng nhập (RBAC Matrix):

| Tên Đăng Nhập | Mật Khẩu | Họ và Tên | Vai Trò | Chi Nhánh Phụ Trách | Quyền Hạn Nghiệp Vụ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `admin` | `password123` | Nguyễn Quản Trị Chuỗi | **SUPER_ADMIN** | Toàn hệ thống chuỗi | Quản trị chi nhánh, thực đơn BOM, nhân sự, báo cáo toàn chuỗi, AI Insights toàn cục |
| `manager_sontay` | `password123` | Trần Văn Hoàng | **BRANCH_MANAGER** | CN Thành Cổ Sơn Tây | Quản lý kho chi nhánh, tạo phiếu nhập PO, sơ đồ bàn, báo cáo & dự báo AI chi nhánh |
| `staff_sontay1` | `password123` | Lê Thu Trang | **STAFF** | CN Thành Cổ Sơn Tây | Thao tác quầy bán hàng POS, đổi trạng thái bàn, xem thực đơn |
| `manager_duonglam`| `password123` | Phạm Minh Đức | **BRANCH_MANAGER** | CN Làng Cổ Đường Lâm| Quản lý kho và vận hành chi nhánh Đường Lâm |

---

## 🐳 5. Hướng Dẫn Chạy Bằng Docker & Docker Compose (Khuyên Dùng)

Hệ thống đã được đóng gói toàn diện với Docker (MySQL 8.0 + Flask Python API + React Nginx SPA).

### Bước 1: Khởi động toàn bộ cụm Container
Tại thư mục gốc của dự án, chạy lệnh:
```bash
docker compose up --build -d
```

### Bước 2: Truy cập dịch vụ
* 🌐 **Giao diện Web POS (Frontend)**: **`http://localhost`** hoặc **`http://localhost:3000`**
* 🔌 **Backend API RESTful**: **`http://localhost:5000`**
* 🗄️ **MySQL Database**: `localhost:3306` (Database `smart_coffee_db` tự động được nạp schema và dữ liệu từ `smart_coffee_db.sql`).

### Bước 3: Dừng hệ thống khi không sử dụng
```bash
docker compose down
```

---

## 💻 6. Hướng Dẫn Cài Đặt Thủ Công (Local Development)

Nếu muốn phát triển và chạy trực tiếp trên máy không dùng Docker:

### 1. Khởi tạo Cơ sở dữ liệu MySQL
Import trực tiếp tệp SQL vào MySQL:
```bash
mysql -u root -p < smart_coffee_db.sql
```

### 2. Khởi động Backend Flask API
```bash
cd backend
python -m pip install -r requirements.txt
python run.py
```
*(Server chạy tại `http://127.0.0.1:5000`)*

### 3. Khởi động Frontend React + Vite
```bash
cd frontend
npm install
npm run dev
```
*(Truy cập Web POS tại `http://localhost:3000`)*

---

## 📁 7. Cấu Trúc Mã Nguồn Hoàn Chỉnh

```
Cafe/
├── backend/
│   ├── app/
│   │   ├── ai_engine/          # RandomForest, Inventory BOM, Apriori
│   │   ├── routes/             # 9 bộ Blueprint API RESTful
│   │   ├── config.py           # Cấu hình CSDL, JWT, AI params
│   │   ├── db.py               # Raw SQL Adapter PyMySQL
│   │   └── middleware.py       # JWT & Phân quyền RBAC
│   ├── Dockerfile              # Docker image Backend Python
│   ├── run.py                  # Entrypoint Flask Server
│   ├── requirements.txt        # Thư viện Python phụ thuộc
│   ├── .env                    # Biến môi trường
│   └── .env.example            # Mẫu cấu hình môi trường
│
├── frontend/
│   ├── src/
│   │   ├── api/                # Axios Client & Services
│   │   ├── components/Layout/  # MainLayout Minimalist
│   │   ├── context/            # AuthContext, Branch State
│   │   ├── pages/              # POS, Tables, Menu, Inventory, Reports, AIDashboard, Users, Branches, AuditLogs
│   │   ├── styles/main.css     # Minimalist Theme Tokens
│   │   ├── App.jsx             # Ant Design Config & Protected Routes
│   │   └── main.jsx            # React 18 Root
│   ├── Dockerfile              # Docker multi-stage build Frontend
│   ├── nginx.conf              # Cấu hình Nginx & API Proxy
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
│
├── docker-compose.yml          # Điều phối toàn bộ cụm dịch vụ
├── smart_coffee_db.sql         # DDL Schema & Dữ liệu ban đầu
├── .gitignore                  # Bỏ qua các file rác / nhị phân
└── README.md                   # Tài liệu bàn giao & hướng dẫn hệ thống
```
