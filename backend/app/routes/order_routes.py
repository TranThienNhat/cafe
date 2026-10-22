from flask import Blueprint, request, jsonify, g
from app.db import query_all, query_one, execute_write, get_transaction, log_audit
from app.middleware import require_auth

order_bp = Blueprint("orders", __name__)

# ==========================================
# 1. KHÁCH HÀNG & THÀNH VIÊN
# ==========================================
@order_bp.route("/customers", methods=["GET"])
def search_customers():
    """Tra cứu khách hàng theo số điện thoại hoặc tên"""
    query = request.args.get("q", "").strip()
    if not query:
        customers = query_all("SELECT * FROM customers ORDER BY loyalty_points DESC LIMIT 50")
    else:
        sql = "SELECT * FROM customers WHERE phone LIKE %s OR full_name LIKE %s LIMIT 20"
        customers = query_all(sql, (f"%{query}%", f"%{query}%"))
    return jsonify({"success": True, "customers": customers}), 200

@order_bp.route("/customers", methods=["POST"])
@require_auth
def create_customer():
    """Tạo mới khách hàng thân thiết"""
    data = request.get_json() or {}
    full_name = data.get("full_name", "").strip()
    phone = data.get("phone", "").strip()

    if not full_name or not phone:
        return jsonify({"success": False, "message": "Vui lòng nhập tên và số điện thoại khách hàng"}), 400

    existing = query_one("SELECT * FROM customers WHERE phone = %s", (phone,))
    if existing:
        return jsonify({"success": True, "customer": existing, "message": "Khách hàng đã tồn tại"}), 200

    sql = "INSERT INTO customers (full_name, phone, loyalty_points, membership_level) VALUES (%s, %s, 0, 'STANDARD')"
    result = execute_write(sql, (full_name, phone))
    customer = query_one("SELECT * FROM customers WHERE id = %s", (result["last_id"],))

    return jsonify({"success": True, "message": "Thêm khách hàng thành công", "customer": customer}), 201

# ==========================================
# 2. XỬ LÝ ĐƠN HÀNG POS & TRỪ KHO THEO BOM
# ==========================================
@order_bp.route("", methods=["POST"])
@require_auth
def create_order():
    """
    Tạo đơn hàng POS tại quầy:
    - Lưu hóa đơn (orders & order_items)
    - Tự động trừ kho nguyên vật liệu theo định lượng BOM (product_recipes) qua Transaction
    - Tích điểm khách hàng & cập nhật trạng thái bàn
    """
    data = request.get_json() or {}
    branch_id = data.get("branch_id") or g.current_user.get("branch_id", 1)
    table_id = data.get("table_id")
    customer_id = data.get("customer_id")
    order_type = data.get("order_type", "DINE_IN")
    items = data.get("items", [])  # List of {product_id, quantity, unit_price, item_notes}
    discount_amount = float(data.get("discount_amount", 0))
    payment_method = data.get("payment_method", "CASH")
    staff_id = g.current_user["id"]

    if not items:
        return jsonify({"success": False, "message": "Đơn hàng phải có ít nhất 1 món"}), 400

    total_amount = sum(float(it["quantity"]) * float(it["unit_price"]) for it in items)
    final_amount = max(0.0, total_amount - discount_amount)

    with get_transaction() as cursor:
        # 1. Tạo bản ghi đơn hàng orders
        cursor.execute(
            """
            INSERT INTO orders (branch_id, table_id, customer_id, staff_id, order_type,
                               total_amount, discount_amount, final_amount, payment_method, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'COMPLETED')
            """,
            (branch_id, table_id, customer_id, staff_id, order_type,
             total_amount, discount_amount, final_amount, payment_method)
        )
        order_id = cursor.lastrowid

        # 2. Tạo chi tiết đơn hàng order_items và tổng hợp trừ kho theo BOM
        ingredient_deductions = {} # ingredient_id -> total_amount_to_deduct

        for it in items:
            p_id = it["product_id"]
            qty = int(it["quantity"])
            unit_price = float(it["unit_price"])
            notes = it.get("item_notes", "")

            cursor.execute(
                """
                INSERT INTO order_items (order_id, product_id, quantity, unit_price, item_notes)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (order_id, p_id, qty, unit_price, notes)
            )

            # Lấy công thức BOM của món để tính lượng trừ kho
            cursor.execute(
                "SELECT ingredient_id, amount_needed FROM product_recipes WHERE product_id = %s",
                (p_id,)
            )
            recipes = cursor.fetchall()
            for r in recipes:
                ing_id = r["ingredient_id"]
                deduct_qty = float(r["amount_needed"]) * qty
                ingredient_deductions[ing_id] = ingredient_deductions.get(ing_id, 0.0) + deduct_qty

        # 3. Thực thi trừ kho tự động trong branch_inventories
        for ing_id, deduct_qty in ingredient_deductions.items():
            cursor.execute(
                """
                UPDATE branch_inventories 
                SET stock_quantity = GREATEST(0, stock_quantity - %s)
                WHERE branch_id = %s AND ingredient_id = %s
                """,
                (deduct_qty, branch_id, ing_id)
            )

        # 4. Tích điểm cho khách hàng (1% giá trị đơn hàng làm tròn)
        if customer_id:
            points_earned = int(final_amount // 10000) # Mỗi 10k được 1 điểm
            if points_earned > 0:
                cursor.execute(
                    """
                    UPDATE customers 
                    SET loyalty_points = loyalty_points + %s,
                        membership_level = CASE 
                            WHEN loyalty_points + %s >= 1000 THEN 'DIAMOND'
                            WHEN loyalty_points + %s >= 500 THEN 'GOLD'
                            WHEN loyalty_points + %s >= 100 THEN 'SILVER'
                            ELSE 'STANDARD'
                        END
                    WHERE id = %s
                    """,
                    (points_earned, points_earned, points_earned, points_earned, customer_id)
                )

        # 5. Nếu là đơn tại bàn, cập nhật trạng thái bàn sang OCCUPIED
        if table_id and order_type == "DINE_IN":
            cursor.execute("UPDATE tables SET status = 'OCCUPIED' WHERE id = %s", (table_id,))

    log_audit(staff_id, "CREATE_ORDER", f"Tạo đơn hàng POS #{order_id} ({payment_method}) - {final_amount:,.0f} VNĐ", request.remote_addr)

    return jsonify({
        "success": True,
        "message": f"Tạo đơn hàng #{order_id} thành công và đã trừ kho nguyên liệu",
        "order_id": order_id,
        "total_amount": total_amount,
        "final_amount": final_amount
    }), 201

# ==========================================
# 3. LỊCH SỬ ĐƠN HÀNG & CHI TIẾT
# ==========================================
@order_bp.route("", methods=["GET"])
@require_auth
def get_orders():
    """Lấy danh sách lịch sử đơn hàng với bộ lọc"""
    branch_id = request.args.get("branch_id")
    status = request.args.get("status")
    date_filter = request.args.get("date")
    limit = int(request.args.get("limit", 50))

    sql = """
        SELECT 
            o.id,
            o.branch_id,
            b.name AS branch_name,
            o.table_id,
            t.table_name,
            o.customer_id,
            c.full_name AS customer_name,
            c.phone AS customer_phone,
            o.staff_id,
            u.full_name AS staff_name,
            o.order_type,
            o.total_amount,
            o.discount_amount,
            o.final_amount,
            o.payment_method,
            o.status,
            o.created_at
        FROM orders o
        JOIN branches b ON o.branch_id = b.id
        LEFT JOIN tables t ON o.table_id = t.id
        LEFT JOIN customers c ON o.customer_id = c.id
        JOIN users u ON o.staff_id = u.id
        WHERE 1=1
    """
    params = []
    if branch_id:
        sql += " AND o.branch_id = %s"
        params.append(branch_id)
    if status:
        sql += " AND o.status = %s"
        params.append(status)
    if date_filter:
        sql += " AND DATE(o.created_at) = %s"
        params.append(date_filter)

    sql += " ORDER BY o.id DESC LIMIT %s"
    params.append(limit)

    orders = query_all(sql, params)
    return jsonify({"success": True, "orders": orders}), 200

@order_bp.route("/<int:order_id>", methods=["GET"])
@require_auth
def get_order_detail(order_id):
    """Lấy chi tiết đơn hàng kèm danh sách món đã gọi"""
    order = query_one("""
        SELECT 
            o.id, o.branch_id, b.name AS branch_name, b.address AS branch_address, b.phone AS branch_phone,
            o.table_id, t.table_name,
            o.customer_id, c.full_name AS customer_name, c.phone AS customer_phone, c.loyalty_points,
            o.staff_id, u.full_name AS staff_name,
            o.order_type, o.total_amount, o.discount_amount, o.final_amount, o.payment_method, o.status, o.created_at
        FROM orders o
        JOIN branches b ON o.branch_id = b.id
        LEFT JOIN tables t ON o.table_id = t.id
        LEFT JOIN customers c ON o.customer_id = c.id
        JOIN users u ON o.staff_id = u.id
        WHERE o.id = %s
    """, (order_id,))

    if not order:
        return jsonify({"success": False, "message": "Không tìm thấy đơn hàng"}), 404

    items = query_all("""
        SELECT oi.id, oi.product_id, p.name AS product_name, oi.quantity, oi.unit_price, oi.item_notes,
               (oi.quantity * oi.unit_price) AS subtotal
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = %s
    """, (order_id,))

    order["items"] = items
    return jsonify({"success": True, "order": order}), 200

@order_bp.route("/<int:order_id>/cancel", methods=["PUT"])
@require_auth
def cancel_order(order_id):
    """Hủy đơn hàng"""
    execute_write("UPDATE orders SET status = 'CANCELLED' WHERE id = %s", (order_id,))
    log_audit(g.current_user["id"], "CANCEL_ORDER", f"Hủy đơn hàng #{order_id}", request.remote_addr)
    return jsonify({"success": True, "message": f"Hủy đơn hàng #{order_id} thành công"}), 200
