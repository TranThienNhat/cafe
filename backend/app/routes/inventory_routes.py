from flask import Blueprint, request, jsonify, g
from app.db import query_all, query_one, execute_write, get_transaction, log_audit
from app.middleware import require_auth, require_roles

inventory_bp = Blueprint("inventory", __name__)

# ==========================================
# 1. TỒN KHO CHI NHÁNH & CẢNH BÁO TỒN KHO
# ==========================================
@inventory_bp.route("", methods=["GET"])
def get_branch_inventory():
    """Lấy danh sách tồn kho theo chi nhánh kèm trạng thái cảnh báo an toàn"""
    branch_id = request.args.get("branch_id", 1)

    sql = """
        SELECT 
            bi.id,
            bi.branch_id,
            b.name AS branch_name,
            bi.ingredient_id,
            i.name AS ingredient_name,
            i.unit,
            i.cost_price,
            bi.stock_quantity,
            bi.safety_stock,
            bi.updated_at,
            CASE 
                WHEN bi.stock_quantity <= bi.safety_stock THEN 'CRITICAL'
                WHEN bi.stock_quantity <= bi.safety_stock * 1.5 THEN 'WARNING'
                ELSE 'SUFFICIENT'
            END AS stock_status
        FROM branch_inventories bi
        JOIN branches b ON bi.branch_id = b.id
        JOIN ingredients i ON bi.ingredient_id = i.id
        WHERE bi.branch_id = %s
        ORDER BY (bi.stock_quantity <= bi.safety_stock) DESC, bi.ingredient_id ASC
    """
    inventory = query_all(sql, (branch_id,))
    return jsonify({"success": True, "inventory": inventory}), 200

@inventory_bp.route("/low-stock-alerts", methods=["GET"])
def get_low_stock_alerts():
    """Lấy danh sách các nguyên vật liệu đang ở dưới ngưỡng an toàn trên toàn chuỗi hoặc theo chi nhánh"""
    branch_id = request.args.get("branch_id")
    where_clause = "WHERE bi.stock_quantity <= bi.safety_stock"
    params = []
    if branch_id:
        where_clause += " AND bi.branch_id = %s"
        params.append(branch_id)

    sql = f"""
        SELECT 
            bi.id,
            bi.branch_id,
            b.name AS branch_name,
            bi.ingredient_id,
            i.name AS ingredient_name,
            i.unit,
            bi.stock_quantity,
            bi.safety_stock,
            (bi.safety_stock - bi.stock_quantity) AS shortage_quantity
        FROM branch_inventories bi
        JOIN branches b ON bi.branch_id = b.id
        JOIN ingredients i ON bi.ingredient_id = i.id
        {where_clause}
        ORDER BY bi.stock_quantity ASC
    """
    alerts = query_all(sql, params)
    return jsonify({"success": True, "count": len(alerts), "alerts": alerts}), 200

@inventory_bp.route("/update-stock", methods=["PUT"])
@require_auth
@require_roles(["SUPER_ADMIN", "BRANCH_MANAGER"])
def update_stock_quantity():
    """Điều chỉnh số lượng tồn kho hoặc ngưỡng an toàn thủ công"""
    data = request.get_json() or {}
    branch_id = data.get("branch_id")
    ingredient_id = data.get("ingredient_id")
    stock_quantity = data.get("stock_quantity")
    safety_stock = data.get("safety_stock")

    if branch_id is None or ingredient_id is None:
        return jsonify({"success": False, "message": "Thiếu thông tin chi nhánh hoặc nguyên liệu"}), 400

    sql = """
        INSERT INTO branch_inventories (branch_id, ingredient_id, stock_quantity, safety_stock)
        VALUES (%s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE 
            stock_quantity = COALESCE(%s, stock_quantity),
            safety_stock = COALESCE(%s, safety_stock)
    """
    execute_write(sql, (branch_id, ingredient_id, stock_quantity, safety_stock, stock_quantity, safety_stock))
    log_audit(g.current_user["id"], "UPDATE_STOCK", f"Điều chỉnh kho CN {branch_id} - NL {ingredient_id}", request.remote_addr)

    return jsonify({"success": True, "message": "Cập nhật tồn kho thành công"}), 200

# ==========================================
# 2. NHÀ CUNG CẤP (SUPPLIERS)
# ==========================================
@inventory_bp.route("/suppliers", methods=["GET"])
def get_suppliers():
    """Lấy danh sách nhà cung cấp"""
    suppliers = query_all("SELECT * FROM suppliers ORDER BY id ASC")
    return jsonify({"success": True, "suppliers": suppliers}), 200

@inventory_bp.route("/suppliers", methods=["POST"])
@require_auth
@require_roles(["SUPER_ADMIN", "BRANCH_MANAGER"])
def create_supplier():
    """Thêm mới nhà cung cấp"""
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    phone = data.get("phone", "").strip()
    address = data.get("address", "").strip()

    if not name:
        return jsonify({"success": False, "message": "Tên nhà cung cấp không được để trống"}), 400

    sql = "INSERT INTO suppliers (name, phone, address) VALUES (%s, %s, %s)"
    result = execute_write(sql, (name, phone, address))
    return jsonify({"success": True, "message": "Thêm nhà cung cấp thành công", "supplier_id": result["last_id"]}), 201

# ==========================================
# 3. PHIẾU NHẬP KHO (PURCHASE ORDERS)
# ==========================================
@inventory_bp.route("/purchase-orders", methods=["GET"])
@require_auth
def get_purchase_orders():
    """Lấy lịch sử các phiếu nhập kho kèm chi tiết nguyên liệu"""
    branch_id = request.args.get("branch_id")
    where_clause = ""
    params = []
    if branch_id:
        where_clause = "WHERE po.branch_id = %s"
        params.append(branch_id)

    sql = f"""
        SELECT 
            po.id,
            po.branch_id,
            b.name AS branch_name,
            po.supplier_id,
            s.name AS supplier_name,
            po.created_by_user_id,
            u.full_name AS created_by_name,
            po.total_cost,
            po.status,
            po.created_at
        FROM purchase_orders po
        JOIN branches b ON po.branch_id = b.id
        JOIN suppliers s ON po.supplier_id = s.id
        JOIN users u ON po.created_by_user_id = u.id
        {where_clause}
        ORDER BY po.id DESC
    """
    orders = query_all(sql, params)
    return jsonify({"success": True, "purchase_orders": orders}), 200

@inventory_bp.route("/purchase-orders", methods=["POST"])
@require_auth
@require_roles(["SUPER_ADMIN", "BRANCH_MANAGER"])
def create_purchase_order():
    """Tạo phiếu nhập kho và tự động cộng dồn số lượng vào kho chi nhánh qua Transaction"""
    data = request.get_json() or {}
    branch_id = data.get("branch_id") or g.current_user.get("branch_id", 1)
    supplier_id = data.get("supplier_id")
    items = data.get("items", [])  # List of {ingredient_id, quantity, unit_price}

    if not supplier_id or not items:
        return jsonify({"success": False, "message": "Vui lòng chọn nhà cung cấp và ít nhất 1 nguyên liệu nhập"}), 400

    total_cost = sum(float(it["quantity"]) * float(it["unit_price"]) for it in items)

    with get_transaction() as cursor:
        # 1. Tạo bản ghi purchase_orders
        cursor.execute(
            """
            INSERT INTO purchase_orders (branch_id, supplier_id, created_by_user_id, total_cost, status)
            VALUES (%s, %s, %s, %s, 'COMPLETED')
            """,
            (branch_id, supplier_id, g.current_user["id"], total_cost)
        )
        po_id = cursor.lastrowid

        # 2. Tạo chi tiết purchase_order_items & Cập nhật tồn kho branch_inventories
        for it in items:
            ing_id = it["ingredient_id"]
            qty = float(it["quantity"])
            price = float(it["unit_price"])

            cursor.execute(
                """
                INSERT INTO purchase_order_items (purchase_order_id, ingredient_id, quantity, unit_price)
                VALUES (%s, %s, %s, %s)
                """,
                (po_id, ing_id, qty, price)
            )

            # Cộng dồn tồn kho
            cursor.execute(
                """
                INSERT INTO branch_inventories (branch_id, ingredient_id, stock_quantity, safety_stock)
                VALUES (%s, %s, %s, 10)
                ON DUPLICATE KEY UPDATE stock_quantity = stock_quantity + %s
                """,
                (branch_id, ing_id, qty, qty)
            )

    log_audit(g.current_user["id"], "CREATE_PURCHASE_ORDER", f"Tạo phiếu nhập kho PO #{po_id} tổng {total_cost:,.0f} VNĐ", request.remote_addr)

    return jsonify({
        "success": True,
        "message": f"Tạo phiếu nhập kho #{po_id} và cập nhật tồn kho thành công",
        "purchase_order_id": po_id,
        "total_cost": total_cost
    }), 201
