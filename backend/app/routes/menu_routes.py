from flask import Blueprint, request, jsonify, g
from app.db import query_all, query_one, execute_write, get_transaction, log_audit
from app.middleware import require_auth, require_roles

menu_bp = Blueprint("menu", __name__)

# ==========================================
# 1. DANH MỤC SẢN PHẨM (CATEGORIES)
# ==========================================
@menu_bp.route("/categories", methods=["GET"])
def get_categories():
    """Lấy danh sách tất cả danh mục món"""
    categories = query_all("SELECT * FROM categories ORDER BY id ASC")
    return jsonify({"success": True, "categories": categories}), 200

@menu_bp.route("/categories", methods=["POST"])
@require_auth
@require_roles(["SUPER_ADMIN", "BRANCH_MANAGER"])
def create_category():
    """Thêm mới danh mục"""
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    description = data.get("description", "").strip()

    if not name:
        return jsonify({"success": False, "message": "Tên danh mục không được để trống"}), 400

    sql = "INSERT INTO categories (name, description) VALUES (%s, %s)"
    result = execute_write(sql, (name, description))
    return jsonify({"success": True, "message": "Thêm danh mục thành công", "category_id": result["last_id"]}), 201

# ==========================================
# 2. SẢN PHẨM (PRODUCTS)
# ==========================================
@menu_bp.route("/products", methods=["GET"])
def get_products():
    """Lấy danh sách sản phẩm kèm thông tin danh mục và định lượng BOM"""
    category_id = request.args.get("category_id")
    status = request.args.get("status")

    sql = """
        SELECT p.id, p.category_id, p.name, p.base_price, p.status, p.created_at,
               c.name AS category_name
        FROM products p
        JOIN categories c ON p.category_id = c.id
        WHERE 1=1
    """
    params = []
    if category_id:
        sql += " AND p.category_id = %s"
        params.append(category_id)
    if status:
        sql += " AND p.status = %s"
        params.append(status)

    sql += " ORDER BY p.category_id ASC, p.id ASC"
    products = query_all(sql, params)

    # Đính kèm công thức BOM cho từng sản phẩm
    recipes = query_all("""
        SELECT pr.product_id, pr.ingredient_id, pr.amount_needed,
               i.name AS ingredient_name, i.unit, i.cost_price
        FROM product_recipes pr
        JOIN ingredients i ON pr.ingredient_id = i.id
    """)

    recipes_by_product = {}
    for r in recipes:
        pid = r["product_id"]
        if pid not in recipes_by_product:
            recipes_by_product[pid] = []
        recipes_by_product[pid].append(r)

    for p in products:
        p["recipes"] = recipes_by_product.get(p["id"], [])

    return jsonify({"success": True, "products": products}), 200

@menu_bp.route("/products", methods=["POST"])
@require_auth
@require_roles(["SUPER_ADMIN", "BRANCH_MANAGER"])
def create_product():
    """Thêm mới sản phẩm kèm cấu hình định lượng BOM"""
    data = request.get_json() or {}
    category_id = data.get("category_id")
    name = data.get("name", "").strip()
    base_price = data.get("base_price", 0)
    status = data.get("status", "AVAILABLE")
    recipes = data.get("recipes", [])  # List of {ingredient_id, amount_needed}

    if not name or not category_id:
        return jsonify({"success": False, "message": "Vui lòng nhập tên món và danh mục"}), 400

    with get_transaction() as cursor:
        cursor.execute(
            "INSERT INTO products (category_id, name, base_price, status) VALUES (%s, %s, %s, %s)",
            (category_id, name, base_price, status)
        )
        product_id = cursor.lastrowid

        for r in recipes:
            cursor.execute(
                "INSERT INTO product_recipes (product_id, ingredient_id, amount_needed) VALUES (%s, %s, %s)",
                (product_id, r["ingredient_id"], r["amount_needed"])
            )

    log_audit(g.current_user["id"], "CREATE_PRODUCT", f"Thêm món mới: {name} (ID: {product_id})", request.remote_addr)
    return jsonify({"success": True, "message": "Tạo sản phẩm thành công", "product_id": product_id}), 201

@menu_bp.route("/products/<int:product_id>", methods=["PUT"])
@require_auth
@require_roles(["SUPER_ADMIN", "BRANCH_MANAGER"])
def update_product(product_id):
    """Cập nhật thông tin món & định lượng công thức BOM"""
    data = request.get_json() or {}
    category_id = data.get("category_id")
    name = data.get("name", "").strip()
    base_price = data.get("base_price")
    status = data.get("status")
    recipes = data.get("recipes")

    with get_transaction() as cursor:
        cursor.execute(
            "UPDATE products SET category_id = %s, name = %s, base_price = %s, status = %s WHERE id = %s",
            (category_id, name, base_price, status, product_id)
        )

        if recipes is not None:
            cursor.execute("DELETE FROM product_recipes WHERE product_id = %s", (product_id,))
            for r in recipes:
                cursor.execute(
                    "INSERT INTO product_recipes (product_id, ingredient_id, amount_needed) VALUES (%s, %s, %s)",
                    (product_id, r["ingredient_id"], r["amount_needed"])
                )

    log_audit(g.current_user["id"], "UPDATE_PRODUCT", f"Cập nhật món ID: {product_id}", request.remote_addr)
    return jsonify({"success": True, "message": "Cập nhật sản phẩm thành công"}), 200

@menu_bp.route("/products/<int:product_id>", methods=["DELETE"])
@require_auth
@require_roles(["SUPER_ADMIN"])
def delete_product(product_id):
    """Xóa sản phẩm"""
    execute_write("DELETE FROM products WHERE id = %s", (product_id,))
    return jsonify({"success": True, "message": "Xóa món thành công"}), 200

# ==========================================
# 3. NGUYÊN LIỆU THÔ (INGREDIENTS)
# ==========================================
@menu_bp.route("/ingredients", methods=["GET"])
def get_ingredients():
    """Lấy danh sách nguyên vật liệu thô"""
    ingredients = query_all("SELECT * FROM ingredients ORDER BY id ASC")
    return jsonify({"success": True, "ingredients": ingredients}), 200

@menu_bp.route("/ingredients", methods=["POST"])
@require_auth
@require_roles(["SUPER_ADMIN", "BRANCH_MANAGER"])
def create_ingredient():
    """Thêm mới nguyên liệu thô"""
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    unit = data.get("unit", "").strip()
    cost_price = data.get("cost_price", 0)

    if not name or not unit:
        return jsonify({"success": False, "message": "Tên nguyên liệu và đơn vị tính không được để trống"}), 400

    sql = "INSERT INTO ingredients (name, unit, cost_price) VALUES (%s, %s, %s)"
    result = execute_write(sql, (name, unit, cost_price))
    new_id = result["last_id"]

    # Tự động map vào tất cả các chi nhánh hiện có với số lượng mặc định
    branches = query_all("SELECT id FROM branches")
    for b in branches:
        execute_write(
            "INSERT IGNORE INTO branch_inventories (branch_id, ingredient_id, stock_quantity, safety_stock) VALUES (%s, %s, 50, 10)",
            (b["id"], new_id)
        )

    return jsonify({"success": True, "message": "Thêm nguyên liệu thành công", "ingredient_id": new_id}), 201
