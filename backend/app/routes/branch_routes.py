from flask import Blueprint, request, jsonify, g
from app.db import query_all, query_one, execute_write, log_audit
from app.middleware import require_auth, require_roles

branch_bp = Blueprint("branches", __name__)

@branch_bp.route("", methods=["GET"])
def get_branches():
    """Lấy danh sách tất cả các chi nhánh"""
    branches = query_all("SELECT * FROM branches ORDER BY id ASC")
    return jsonify({"success": True, "branches": branches}), 200

@branch_bp.route("/<int:branch_id>", methods=["GET"])
def get_branch(branch_id):
    """Lấy thông tin chi tiết một chi nhánh"""
    branch = query_one("SELECT * FROM branches WHERE id = %s", (branch_id,))
    if not branch:
        return jsonify({"success": False, "message": "Không tìm thấy chi nhánh"}), 404
    return jsonify({"success": True, "branch": branch}), 200

@branch_bp.route("", methods=["POST"])
@require_auth
@require_roles(["SUPER_ADMIN"])
def create_branch():
    """Thêm mới chi nhánh (Chỉ dành cho SUPER_ADMIN)"""
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    address = data.get("address", "").strip()
    phone = data.get("phone", "").strip()
    status = data.get("status", "ACTIVE")

    if not name or not address:
        return jsonify({"success": False, "message": "Tên và địa chỉ chi nhánh không được để trống"}), 400

    sql = "INSERT INTO branches (name, address, phone, status) VALUES (%s, %s, %s, %s)"
    result = execute_write(sql, (name, address, phone, status))
    new_id = result["last_id"]

    # Khởi tạo tồn kho mặc định cho chi nhánh mới từ danh sách nguyên liệu
    ingredients = query_all("SELECT id FROM ingredients")
    for ing in ingredients:
        execute_write(
            "INSERT IGNORE INTO branch_inventories (branch_id, ingredient_id, stock_quantity, safety_stock) VALUES (%s, %s, 100, 15)",
            (new_id, ing["id"])
        )

    log_audit(g.current_user["id"], "CREATE_BRANCH", f"Tạo chi nhánh mới: {name} (ID: {new_id})", request.remote_addr)

    return jsonify({"success": True, "message": "Thêm chi nhánh thành công", "branch_id": new_id}), 201

@branch_bp.route("/<int:branch_id>", methods=["PUT"])
@require_auth
@require_roles(["SUPER_ADMIN"])
def update_branch(branch_id):
    """Cập nhật thông tin chi nhánh"""
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    address = data.get("address", "").strip()
    phone = data.get("phone", "").strip()
    status = data.get("status", "ACTIVE")

    if not name or not address:
        return jsonify({"success": False, "message": "Tên và địa chỉ không được để trống"}), 400

    sql = "UPDATE branches SET name = %s, address = %s, phone = %s, status = %s WHERE id = %s"
    execute_write(sql, (name, address, phone, status, branch_id))
    log_audit(g.current_user["id"], "UPDATE_BRANCH", f"Cập nhật chi nhánh ID: {branch_id}", request.remote_addr)

    return jsonify({"success": True, "message": "Cập nhật chi nhánh thành công"}), 200

@branch_bp.route("/<int:branch_id>", methods=["DELETE"])
@require_auth
@require_roles(["SUPER_ADMIN"])
def delete_branch(branch_id):
    """Xóa chi nhánh"""
    execute_write("DELETE FROM branches WHERE id = %s", (branch_id,))
    log_audit(g.current_user["id"], "DELETE_BRANCH", f"Xóa chi nhánh ID: {branch_id}", request.remote_addr)
    return jsonify({"success": True, "message": "Xóa chi nhánh thành công"}), 200
