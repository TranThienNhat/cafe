from flask import Blueprint, request, jsonify, g
from app.db import query_all, query_one, execute_write, log_audit
from app.middleware import require_auth, require_roles, hash_password

user_bp = Blueprint("users", __name__)

@user_bp.route("", methods=["GET"])
@require_auth
def get_users():
    """Lấy danh sách người dùng, hỗ trợ lọc theo chi nhánh và role"""
    current_role = g.current_user["role"]
    branch_id = request.args.get("branch_id")

    sql = """
        SELECT u.id, u.branch_id, u.full_name, u.username, u.phone, u.role, u.status, u.created_at,
               b.name AS branch_name
        FROM users u
        LEFT JOIN branches b ON u.branch_id = b.id
        WHERE 1=1
    """
    params = []

    # Quản lý chi nhánh chỉ xem được nhân sự chi nhánh mình
    if current_role == "BRANCH_MANAGER":
        sql += " AND u.branch_id = %s"
        params.append(g.current_user["branch_id"])
    elif branch_id:
        sql += " AND u.branch_id = %s"
        params.append(branch_id)

    sql += " ORDER BY u.id ASC"
    users = query_all(sql, params)
    return jsonify({"success": True, "users": users}), 200

@user_bp.route("", methods=["POST"])
@require_auth
@require_roles(["SUPER_ADMIN", "BRANCH_MANAGER"])
def create_user():
    """Tạo người dùng mới"""
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    password = data.get("password", "123456").strip()
    full_name = data.get("full_name", "").strip()
    phone = data.get("phone", "").strip()
    role = data.get("role", "STAFF")
    branch_id = data.get("branch_id")
    status = data.get("status", "ACTIVE")

    if not username or not full_name:
        return jsonify({"success": False, "message": "Tên đăng nhập và họ tên không được để trống"}), 400

    # Kiểm tra trùng username
    existing = query_one("SELECT id FROM users WHERE username = %s", (username,))
    if existing:
        return jsonify({"success": False, "message": "Tên đăng nhập này đã được sử dụng"}), 400

    # Kiểm tra phân quyền tạo
    if g.current_user["role"] == "BRANCH_MANAGER":
        branch_id = g.current_user["branch_id"]
        if role == "SUPER_ADMIN":
            return jsonify({"success": False, "message": "Quản lý chi nhánh không thể tạo tài khoản SUPER_ADMIN"}), 403

    password_hash = hash_password(password)
    sql = """
        INSERT INTO users (branch_id, full_name, username, password_hash, phone, role, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """
    result = execute_write(sql, (branch_id, full_name, username, password_hash, phone, role, status))
    log_audit(g.current_user["id"], "CREATE_USER", f"Tạo người dùng mới: {username} ({role})", request.remote_addr)

    return jsonify({"success": True, "message": "Tạo tài khoản thành công", "user_id": result["last_id"]}), 201

@user_bp.route("/<int:user_id>", methods=["PUT"])
@require_auth
@require_roles(["SUPER_ADMIN", "BRANCH_MANAGER"])
def update_user(user_id):
    """Cập nhật thông tin nhân viên"""
    data = request.get_json() or {}
    full_name = data.get("full_name", "").strip()
    phone = data.get("phone", "").strip()
    role = data.get("role")
    branch_id = data.get("branch_id")
    status = data.get("status")

    sql = "UPDATE users SET full_name = %s, phone = %s, role = %s, branch_id = %s, status = %s WHERE id = %s"
    execute_write(sql, (full_name, phone, role, branch_id, status, user_id))
    log_audit(g.current_user["id"], "UPDATE_USER", f"Cập nhật thông tin người dùng ID: {user_id}", request.remote_addr)

    return jsonify({"success": True, "message": "Cập nhật tài khoản thành công"}), 200

@user_bp.route("/<int:user_id>/reset-password", methods=["POST"])
@require_auth
@require_roles(["SUPER_ADMIN", "BRANCH_MANAGER"])
def reset_password(user_id):
    """Đặt lại mật khẩu cho nhân viên"""
    data = request.get_json() or {}
    new_password = data.get("new_password", "123456")

    new_hash = hash_password(new_password)
    execute_write("UPDATE users SET password_hash = %s WHERE id = %s", (new_hash, user_id))
    log_audit(g.current_user["id"], "RESET_PASSWORD", f"Đặt lại mật khẩu cho người dùng ID: {user_id}", request.remote_addr)

    return jsonify({"success": True, "message": f"Đặt lại mật khẩu thành công (Mật khẩu mới: {new_password})"}), 200

@user_bp.route("/<int:user_id>", methods=["DELETE"])
@require_auth
@require_roles(["SUPER_ADMIN"])
def delete_user(user_id):
    """Xóa tài khoản người dùng"""
    execute_write("DELETE FROM users WHERE id = %s", (user_id,))
    log_audit(g.current_user["id"], "DELETE_USER", f"Xóa tài khoản ID: {user_id}", request.remote_addr)
    return jsonify({"success": True, "message": "Xóa tài khoản thành công"}), 200
