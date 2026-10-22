from flask import Blueprint, request, jsonify, g
from app.db import query_one, query_all, execute_write, log_audit
from app.middleware import hash_password, verify_password, generate_token, require_auth

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/login", methods=["POST"])
def login():
    """Đăng nhập hệ thống & cấp phát JWT token"""
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()

    if not username or not password:
        return jsonify({"success": False, "message": "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu"}), 400

    # Lấy thông tin user từ CSDL qua Raw SQL
    sql = """
        SELECT u.id, u.branch_id, u.full_name, u.username, u.password_hash, u.phone, u.role, u.status,
               b.name AS branch_name
        FROM users u
        LEFT JOIN branches b ON u.branch_id = b.id
        WHERE u.username = %s
    """
    user = query_one(sql, (username,))

    if not user:
        return jsonify({"success": False, "message": "Tài khoản hoặc mật khẩu không chính xác"}), 401

    if user["status"] == "LOCKED":
        return jsonify({"success": False, "message": "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên"}), 403

    # Kiểm tra mật khẩu (Hỗ trợ chuỗi băm werkzeug hoặc mật khẩu khởi tạo)
    is_valid = False
    try:
        is_valid = verify_password(password, user["password_hash"])
    except Exception:
        # Hỗ trợ mật khẩu plain text nếu trong quá trình dev/setup ban đầu
        is_valid = (password == user["password_hash"])

    if not is_valid:
        return jsonify({"success": False, "message": "Tài khoản hoặc mật khẩu không chính xác"}), 401

    token = generate_token(user)
    log_audit(user["id"], "LOGIN", f"Người dùng {user['username']} đăng nhập thành công", request.remote_addr)

    user_info = {
        "id": user["id"],
        "branch_id": user["branch_id"],
        "branch_name": user["branch_name"],
        "full_name": user["full_name"],
        "username": user["username"],
        "phone": user["phone"],
        "role": user["role"]
    }

    return jsonify({
        "success": True,
        "message": "Đăng nhập thành công",
        "token": token,
        "user": user_info
    }), 200

@auth_bp.route("/me", methods=["GET"])
@require_auth
def get_current_user_profile():
    """Lấy thông tin tài khoản hiện tại"""
    user_id = g.current_user["id"]
    sql = """
        SELECT u.id, u.branch_id, u.full_name, u.username, u.phone, u.role, u.status, u.created_at,
               b.name AS branch_name, b.address AS branch_address
        FROM users u
        LEFT JOIN branches b ON u.branch_id = b.id
        WHERE u.id = %s
    """
    user = query_one(sql, (user_id,))
    return jsonify({"success": True, "user": user}), 200

@auth_bp.route("/change-password", methods=["POST"])
@require_auth
def change_password():
    """Đổi mật khẩu người dùng"""
    data = request.get_json() or {}
    old_password = data.get("old_password", "")
    new_password = data.get("new_password", "")

    if not old_password or not new_password:
        return jsonify({"success": False, "message": "Vui lòng nhập mật khẩu cũ và mật khẩu mới"}), 400

    user_id = g.current_user["id"]
    user = query_one("SELECT password_hash FROM users WHERE id = %s", (user_id,))

    if not verify_password(old_password, user["password_hash"]):
        return jsonify({"success": False, "message": "Mật khẩu cũ không chính xác"}), 400

    new_hash = hash_password(new_password)
    execute_write("UPDATE users SET password_hash = %s WHERE id = %s", (new_hash, user_id))
    log_audit(user_id, "CHANGE_PASSWORD", "Người dùng đổi mật khẩu", request.remote_addr)

    return jsonify({"success": True, "message": "Đổi mật khẩu thành công"}), 200
