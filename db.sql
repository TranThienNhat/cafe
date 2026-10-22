-- =============================================================================
-- SMART COFFEE MANAGEMENT & AI SYSTEM (HỆ THỐNG QUẢN LÝ CHUỖI CÀ PHÊ THÔNG MINH)
-- DATABASE SCHEMA & INITIAL DATA: smart_coffee_db (MySQL 8.0+)
-- THỊ TRƯỜNG: THỊ XÃ SƠN TÂY & BA VÌ, HÀ NỘI
-- =============================================================================

DROP DATABASE IF EXISTS smart_coffee_db;
CREATE DATABASE smart_coffee_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smart_coffee_db;

-- =============================================================================
-- 1. QUẢN TRỊ CHI NHÁNH, NGƯỜI DÙNG & BÀN
-- =============================================================================

-- Chi nhánh cửa hàng
CREATE TABLE branches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    address VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Người dùng & Phân quyền (RBAC: SUPER_ADMIN, BRANCH_MANAGER, STAFF)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT NULL,
    full_name VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role ENUM('SUPER_ADMIN', 'BRANCH_MANAGER', 'STAFF') NOT NULL DEFAULT 'STAFF',
    status ENUM('ACTIVE', 'LOCKED') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Sơ đồ bàn phục vụ
CREATE TABLE tables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    area VARCHAR(50) DEFAULT 'Tầng 1',
    status ENUM('AVAILABLE', 'OCCUPIED', 'RESERVED') DEFAULT 'AVAILABLE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================================================
-- 2. KHÁCH HÀNG & THÀNH VIÊN TÍCH ĐIỂM
-- =============================================================================

CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    loyalty_points INT DEFAULT 0,
    membership_level ENUM('STANDARD', 'SILVER', 'GOLD', 'DIAMOND') DEFAULT 'STANDARD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =============================================================================
-- 3. THỰC ĐƠN & NGUYÊN LIỆU ĐỊNH LƯỢNG (BOM)
-- =============================================================================

-- Danh mục món
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT
) ENGINE=InnoDB;

-- Sản phẩm / Món bán
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    base_price DECIMAL(10, 0) NOT NULL,
    status ENUM('AVAILABLE', 'OUT_OF_STOCK', 'DISCONTINUED') DEFAULT 'AVAILABLE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB;

-- Nguyên vật liệu thô (Hạt cafe, sữa tươi, đường, kem...)
CREATE TABLE ingredients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    unit VARCHAR(30) NOT NULL,
    cost_price DECIMAL(10, 0) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Công thức định lượng (BOM - Bill of Materials)
CREATE TABLE product_recipes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    ingredient_id INT NOT NULL,
    amount_needed DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================================================
-- 4. KHO CHI NHÁNH & NHÀ CUNG CẤP
-- =============================================================================

-- Nhà cung cấp nguyên vật liệu
CREATE TABLE suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(20),
    address VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Tồn kho nguyên liệu tại từng chi nhánh
CREATE TABLE branch_inventories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT NOT NULL,
    ingredient_id INT NOT NULL,
    stock_quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
    safety_stock DECIMAL(10, 2) NOT NULL DEFAULT 10,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_branch_ingredient (branch_id, ingredient_id),
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Phiếu nhập kho
CREATE TABLE purchase_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT NOT NULL,
    supplier_id INT NOT NULL,
    created_by_user_id INT NOT NULL,
    total_cost DECIMAL(10, 0) NOT NULL DEFAULT 0,
    status ENUM('PENDING', 'COMPLETED', 'CANCELLED') DEFAULT 'COMPLETED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (created_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- Chi tiết phiếu nhập kho
CREATE TABLE purchase_order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    purchase_order_id INT NOT NULL,
    ingredient_id INT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(10, 0) NOT NULL,
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
) ENGINE=InnoDB;

-- =============================================================================
-- 5. BÁN HÀNG & ĐƠN HÀNG (POS & MACHINE LEARNING DATASET)
-- =============================================================================

CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT NOT NULL,
    table_id INT NULL,
    customer_id INT NULL,
    staff_id INT NOT NULL,
    order_type ENUM('DINE_IN', 'TAKE_AWAY') DEFAULT 'DINE_IN',
    total_amount DECIMAL(10, 0) NOT NULL,
    discount_amount DECIMAL(10, 0) DEFAULT 0,
    final_amount DECIMAL(10, 0) NOT NULL,
    payment_method ENUM('CASH', 'TRANSFER_QR', 'CARD') DEFAULT 'CASH',
    status ENUM('PENDING', 'COMPLETED', 'CANCELLED') DEFAULT 'COMPLETED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE SET NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (staff_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- Chi tiết món trong đơn hàng
CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 0) NOT NULL,
    item_notes VARCHAR(255) NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

-- =============================================================================
-- 6. NHẬT KÝ HOẠT ĐỘNG (AUDIT LOGS)
-- =============================================================================

CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    detail TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =============================================================================
-- 7. CÁC INDEX TỐI ƯU TRUY VẤN VÀ HUẤN LUYỆN MACHINE LEARNING
-- =============================================================================

CREATE INDEX idx_orders_created_status ON orders(created_at, status);
CREATE INDEX idx_orders_branch ON orders(branch_id);
CREATE INDEX idx_order_items_order_product ON order_items(order_id, product_id);

-- =============================================================================
-- 8. NẠP DỮ LIỆU BAN ĐẦU (INITIAL SEED DATA - SƠN TÂY, BA VÌ, HÀ NỘI)
-- =============================================================================

-- Chi nhánh
INSERT INTO branches (id, name, address, phone, status) VALUES
(1, 'Chi nhánh Thành Cổ Sơn Tây (Trụ sở)', 'Số 12 Phố Đinh Tiên Hoàng, P. Lê Lợi, TX. Sơn Tây, Hà Nội', '024 3383 1234', 'ACTIVE'),
(2, 'Chi nhánh Quang Trung - Sơn Tây', 'Số 186 Đường Quang Trung, P. Quang Trung, TX. Sơn Tây, Hà Nội', '024 3383 5678', 'ACTIVE'),
(3, 'Chi nhánh Làng Cổ Đường Lâm', 'Cổng Làng Mông Phụ, Xã Đường Lâm, TX. Sơn Tây, Hà Nội', '024 3383 9999', 'ACTIVE');

-- Tài khoản người dùng (Mật khẩu mặc định: password123)
INSERT INTO users (id, branch_id, full_name, username, password_hash, phone, role, status) VALUES
(1, NULL, 'Nguyễn Quản Trị Chuỗi', 'admin', 'scrypt:32768:8:1$n1mDkiM9v4HG1AFK$086b12037095a9a7a001ea985fa17fc0c9e38c78b5748d18787b30104379bff998e792a0f19ecac908296a77ae6b2778df047003c9faf452daf267935a43cd72', '0901111111', 'SUPER_ADMIN', 'ACTIVE'),
(2, 1, 'Trần Văn Hoàng (Quản lý Thành Cổ)', 'manager_sontay', 'scrypt:32768:8:1$n1mDkiM9v4HG1AFK$086b12037095a9a7a001ea985fa17fc0c9e38c78b5748d18787b30104379bff998e792a0f19ecac908296a77ae6b2778df047003c9faf452daf267935a43cd72', '0902222222', 'BRANCH_MANAGER', 'ACTIVE'),
(3, 1, 'Lê Thu Trang (Thu ngân Thành Cổ)', 'staff_sontay1', 'scrypt:32768:8:1$n1mDkiM9v4HG1AFK$086b12037095a9a7a001ea985fa17fc0c9e38c78b5748d18787b30104379bff998e792a0f19ecac908296a77ae6b2778df047003c9faf452daf267935a43cd72', '0903333333', 'STAFF', 'ACTIVE'),
(4, 3, 'Phạm Minh Đức (Quản lý Đường Lâm)', 'manager_duonglam', 'scrypt:32768:8:1$n1mDkiM9v4HG1AFK$086b12037095a9a7a001ea985fa17fc0c9e38c78b5748d18787b30104379bff998e792a0f19ecac908296a77ae6b2778df047003c9faf452daf267935a43cd72', '0904444444', 'BRANCH_MANAGER', 'ACTIVE');

-- Danh mục món
INSERT INTO categories (id, name, description) VALUES
(1, 'Cà Phê Truyền Thống & Phố Cổ', 'Cà phê trứng Hà Nội, cà phê phin, bạc xỉu kem béo'),
(2, 'Cà Phê Pha Máy (Espresso)', 'Espresso, Americano, Cappuccino, Latte'),
(3, 'Trà Sen Tây Hồ & Trà Đặc Sản', 'Trà sen vàng, trà ô long, trà hoa quả tươi'),
(4, 'Đá Xay & Sinh Tố Mộc Châu', 'Sinh tố bơ sáp, matcha đá xay kem phô mai'),
(5, 'Bánh Ngọt & Chè Lam Xứ Đoài', 'Chè lam Đường Lâm, bánh croissant, hạt hướng dương');

-- Nguyên vật liệu thô
INSERT INTO ingredients (id, name, unit, cost_price) VALUES
(1, 'Hạt Cà Phê Robusta Sơn La - Buôn Ma Thuột', 'gram', 180),
(2, 'Hạt Cà Phê Arabica Cầu Đất Thượng Hạng', 'gram', 320),
(3, 'Sữa Đặc Có Đường Ông Thọ', 'ml', 65),
(4, 'Sữa Tươi Thanh Trùng Ba Vì', 'ml', 35),
(5, 'Đường Mía Tinh Luyện & Đường Phèn', 'ml', 25),
(6, 'Trà Xanh Thái Nguyên Tân Cương', 'ml', 40),
(7, 'Đào Ngâm Giòn & Mứt Trái Cây', 'miếng', 3000),
(8, 'Bột Kem Trứng Tươi Phố Cổ', 'gram', 450),
(9, 'Trân Châu Hoàng Kim Đường Đen', 'gram', 80),
(10, 'Bột Kem Sữa Béo Thực Vật', 'gram', 120),
(11, 'Bánh Croissant Bơ Tỏi Nướng Giòn', 'cái', 15000),
(12, 'Chè Lam Cổ Truyền Đường Lâm (Đặc sản)', 'đĩa', 12000),
(13, 'Hạt Hướng Dương Vị Dừa Xứ Đoài', 'gói', 8000);

-- Sản phẩm / Món bán
INSERT INTO products (id, category_id, name, base_price, status) VALUES
(1, 1, 'Cà Phê Trứng Hà Nội (Đặc Sản Phố Cổ)', 39000, 'AVAILABLE'),
(2, 1, 'Cà Phê Nâu Đá Hà Nội', 29000, 'AVAILABLE'),
(3, 1, 'Cà Phê Muối Kem Béo Xứ Đoài', 35000, 'AVAILABLE'),
(4, 1, 'Bạc Xỉu Kem Sữa Ba Vì', 32000, 'AVAILABLE'),
(5, 2, 'Americano Đá Tỉnh Táo', 35000, 'AVAILABLE'),
(6, 3, 'Trà Sen Vàng Tây Hồ Cốt Dừa', 45000, 'AVAILABLE'),
(7, 3, 'Trà Đào Cam Sả Mật Ong', 42000, 'AVAILABLE'),
(8, 4, 'Sinh Tố Bơ Sáp Mộc Châu Đá Xay', 49000, 'AVAILABLE'),
(9, 5, 'Bánh Croissant Bơ Tỏi Giòn Rụm', 30000, 'AVAILABLE'),
(10, 5, 'Đĩa Chè Lam Cổ Truyền Đường Lâm', 25000, 'AVAILABLE'),
(11, 5, 'Hạt Hướng Dương Vị Dừa Xứ Đoài', 15000, 'AVAILABLE'),
(12, 1, 'Topping Kem Trứng Đánh Bông (Thêm)', 12000, 'AVAILABLE');

-- Công thức định lượng (BOM)
INSERT INTO product_recipes (product_id, ingredient_id, amount_needed) VALUES
(1, 1, 25), (1, 3, 20), (1, 8, 30),
(2, 1, 25), (2, 3, 30),
(3, 1, 25), (3, 3, 25), (3, 10, 20),
(4, 1, 20), (4, 3, 35), (4, 4, 60),
(5, 2, 20),
(6, 6, 100), (6, 4, 40), (6, 5, 20),
(7, 6, 120), (7, 7, 2), (7, 5, 20),
(8, 4, 80), (8, 3, 30), (8, 10, 20),
(9, 11, 1),
(10, 12, 1),
(11, 13, 1),
(12, 8, 40);

-- Sơ đồ bàn
INSERT INTO tables (id, branch_id, table_name, area, status) VALUES
(1, 1, 'Bàn Thành Cổ 01', 'Tầng 1 (View Cổng Tiền)', 'AVAILABLE'),
(2, 1, 'Bàn Thành Cổ 02', 'Tầng 1 (Sân Trong)', 'OCCUPIED'),
(3, 1, 'Bàn Thành Cổ 03', 'Tầng 1', 'AVAILABLE'),
(4, 1, 'Bàn Thành Cổ 04', 'Tầng 2 (Ngắm Phố)', 'RESERVED'),
(5, 1, 'Bàn Sân Vườn Xứ Đoài 1', 'Sân Vườn Cổ', 'AVAILABLE'),
(6, 1, 'Bàn Sân Vườn Xứ Đoài 2', 'Sân Vườn Cổ', 'AVAILABLE'),
(7, 1, 'Bàn Phòng Trà VIP', 'Tầng 2', 'AVAILABLE'),
(8, 2, 'Bàn 01 (Quang Trung)', 'Tầng 1', 'AVAILABLE'),
(9, 2, 'Bàn 02 (Quang Trung)', 'Tầng 1', 'AVAILABLE'),
(10, 3, 'Bàn Làng Cổ 01 (Mông Phụ)', 'Hiên Nhà Cổ', 'AVAILABLE');

-- Nhà cung cấp
INSERT INTO suppliers (id, name, phone, address) VALUES
(1, 'Hợp Tác Xã Sữa Tươi Ba Vì', '024 3396 8888', 'Km 29 Quốc Lộ 32, Huyện Ba Vì, Hà Nội'),
(2, 'Công Ty Nông Sản & Trà Thái Nguyên Tân Cương', '0912 345 678', 'KCN Phú Thịnh, TX. Sơn Tây, Hà Nội'),
(3, 'Xưởng Chè Lam Cổ Truyền Mông Phụ Đường Lâm', '0988 765 432', 'Thôn Mông Phụ, Xã Đường Lâm, TX. Sơn Tây, Hà Nội');

-- Tồn kho ban đầu
INSERT INTO branch_inventories (branch_id, ingredient_id, stock_quantity, safety_stock) VALUES
(1, 1, 12000, 3000), (1, 2, 8000, 2000), (1, 3, 15000, 3000), (1, 4, 1800, 3000),
(1, 5, 20000, 4000), (1, 6, 10000, 2000), (1, 7, 50, 15), (1, 8, 5000, 1500),
(1, 9, 8000, 2000), (1, 10, 6000, 1500), (1, 11, 40, 15), (1, 12, 35, 10), (1, 13, 60, 20),
(2, 1, 10000, 3000), (2, 2, 6000, 2000), (2, 3, 12000, 3000), (2, 4, 8000, 3000),
(2, 5, 15000, 4000), (2, 6, 8000, 2000), (2, 7, 40, 15), (2, 8, 4000, 1500),
(2, 9, 6000, 2000), (2, 10, 5000, 1500), (2, 11, 30, 15), (2, 12, 25, 10), (2, 13, 50, 20),
(3, 1, 8000, 2000), (3, 2, 5000, 1500), (3, 3, 10000, 2000), (3, 4, 6000, 2000),
(3, 5, 12000, 3000), (3, 6, 6000, 1500), (3, 7, 30, 10), (3, 8, 3000, 1000),
(3, 9, 5000, 1500), (3, 10, 4000, 1000), (3, 11, 20, 10), (3, 12, 50, 15), (3, 13, 40, 15);

-- Khách hàng mẫu
INSERT INTO customers (id, full_name, phone, loyalty_points, membership_level) VALUES
(1, 'Nguyễn Văn Hùng', '0912345678', 240, 'SILVER'),
(2, 'Trần Thị Thu Hà', '0987654321', 620, 'GOLD'),
(3, 'Lê Hoàng Nam', '0903456789', 1150, 'DIAMOND'),
(4, 'Phạm Ngọc Anh', '0978123456', 50, 'STANDARD');
