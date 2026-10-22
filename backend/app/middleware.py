import jwt
from functools import wraps
from flask import request, jsonify, g
from datetime import datetime, timezone, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
from app.config import Config
from app.db import query_one

def hash_password(password: str) -> str:
    """Tạo chuỗi băm mật khẩu an toàn"""
    return generate_password_hash(password)

def verify_password(password: str, password_hash: str) -> bool:
    """Xác thực mật khẩu với chuỗi băm"""
    return check_password_hash(password_hash, password)

def generate_token(user_data: dict) -> str:
    """Tạo JWT token có thời hạn với thông tin người dùng"""
    payload = {
        "user_id": user_data["id"],
        "username": user_data["username"],
        "full_name": user_data["full_name"],
        "role": user_data["role"],
        "branch_id": user_data.get("branch_id"),
        "exp": datetime.now(timezone.utc) + timedelta(hours=Config.JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm="HS256")

def decode_token(token: str):
    """Giải mã và kiểm tra tính hợp lệ của JWT token"""
    try:
        payload = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def require_auth(f):
    """Decorator yêu cầu đăng nhập và xác thực JWT token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"success": False, "message": "Yêu cầu cung cấp Authentication Token hợp lệ"}), 401
        
        token = auth_header.split(" ")[1]
        payload = decode_token(token)
        if not payload:
            return jsonify({"success": False, "message": "Token không hợp lệ hoặc đã hết hạn"}), 401
        
        # Lấy thông tin user mới nhất từ DB qua Raw SQL
        user = query_one(
            "SELECT id, branch_id, full_name, username, role, status FROM users WHERE id = %s",
            (payload["user_id"],)
        )
        if not user or user["status"] != "ACTIVE":
            return jsonify({"success": False, "message": "Tài khoản không tồn tại hoặc đã bị khóa"}), 403
        
        g.current_user = user
        return f(*args, **kwargs)
    return decorated

def require_roles(allowed_roles: list):
    """Decorator kiểm tra phân quyền người dùng (RBAC)"""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not hasattr(g, "current_user"):
                return jsonify({"success": False, "message": "Chưa xác thực người dùng"}), 401
            
            user_role = g.current_user.get("role")
            if user_role not in allowed_roles:
                return jsonify({"success": False, "message": f"Bạn không có quyền thực hiện chức năng này. Quyền yêu cầu: {', '.join(allowed_roles)}"}), 403
            
            return f(*args, **kwargs)
        return decorated
    return decorator
