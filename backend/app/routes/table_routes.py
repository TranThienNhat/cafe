from flask import Blueprint, request, jsonify, g
from app.db import query_all, query_one, execute_write, log_audit
from app.middleware import require_auth, require_roles

table_bp = Blueprint("tables", __name__)

@table_bp.route("", methods=["GET"])
def get_tables():
    """Lấy danh sách bàn theo chi nhánh và khu vực"""
    branch_id = request.args.get("branch_id")
    area = request.args.get("area")

    sql = """
        SELECT t.id, t.branch_id, t.table_name, t.area, t.status, t.created_at,
               b.name AS branch_name
        FROM tables t
        JOIN branches b ON t.branch_id = b.id
        WHERE 1=1
    """
    params = []
    if branch_id:
        sql += " AND t.branch_id = %s"
        params.append(branch_id)
    if area:
        sql += " AND t.area = %s"
        params.append(area)

    sql += " ORDER BY t.area ASC, t.table_name ASC"
    tables = query_all(sql, params)
    return jsonify({"success": True, "tables": tables}), 200

@table_bp.route("/<int:table_id>/status", methods=["PUT"])
@require_auth
def update_table_status(table_id):
    """Cập nhật trạng thái bàn (AVAILABLE / OCCUPIED / RESERVED)"""
    data = request.get_json() or {}
    status = data.get("status")

    if status not in ["AVAILABLE", "OCCUPIED", "RESERVED"]:
        return jsonify({"success": False, "message": "Trạng thái bàn không hợp lệ"}), 400

    table = query_one("SELECT * FROM tables WHERE id = %s", (table_id,))
    if not table:
        return jsonify({"success": False, "message": "Bàn không tồn tại"}), 404

    execute_write("UPDATE tables SET status = %s WHERE id = %s", (status, table_id))
    log_audit(
        getattr(g, 'current_user', {}).get('id', 1),
        "UPDATE_TABLE_STATUS",
        f"Cập nhật trạng thái bàn {table.get('table_name')} thành {status}",
        request.remote_addr
    )
    return jsonify({"success": True, "message": f"Cập nhật trạng thái bàn thành {status}"}), 200

@table_bp.route("", methods=["POST"])
@require_auth
@require_roles(["SUPER_ADMIN", "BRANCH_MANAGER"])
def create_table():
    """Thêm bàn mới cho chi nhánh"""
    data = request.get_json() or {}
    branch_id = data.get("branch_id")
    table_name = data.get("table_name", "").strip()
    area = data.get("area", "Tầng 1").strip()

    if not branch_id or not table_name:
        return jsonify({"success": False, "message": "Chi nhánh và tên bàn không được để trống"}), 400

    sql = "INSERT INTO tables (branch_id, table_name, area, status) VALUES (%s, %s, %s, 'AVAILABLE')"
    result = execute_write(sql, (branch_id, table_name, area))
    table_id = result["last_id"] if result else None
    log_audit(
        getattr(g, 'current_user', {}).get('id', 1),
        "CREATE_TABLE",
        f"Thêm bàn mới {table_name} (Khu vực: {area})",
        request.remote_addr
    )
    return jsonify({"success": True, "message": "Thêm bàn thành công", "table_id": table_id}), 201

@table_bp.route("/<int:table_id>", methods=["PUT"])
@require_auth
@require_roles(["SUPER_ADMIN", "BRANCH_MANAGER"])
def update_table(table_id):
    """Cập nhật thông tin bàn (tên, khu vực, trạng thái)"""
    table = query_one("SELECT * FROM tables WHERE id = %s", (table_id,))
    if not table:
        return jsonify({"success": False, "message": "Bàn không tồn tại"}), 404

    data = request.get_json() or {}
    table_name = data.get("table_name", table["table_name"]).strip()
    area = data.get("area", table["area"]).strip()
    status = data.get("status", table["status"])

    if not table_name:
        return jsonify({"success": False, "message": "Tên bàn không được để trống"}), 400

    if status not in ["AVAILABLE", "OCCUPIED", "RESERVED"]:
        return jsonify({"success": False, "message": "Trạng thái bàn không hợp lệ"}), 400

    sql = "UPDATE tables SET table_name = %s, area = %s, status = %s WHERE id = %s"
    execute_write(sql, (table_name, area, status, table_id))
    log_audit(
        getattr(g, 'current_user', {}).get('id', 1),
        "UPDATE_TABLE",
        f"Cập nhật bàn {table_name} (Khu vực: {area}, Trạng thái: {status})",
        request.remote_addr
    )
    return jsonify({
        "success": True,
        "message": "Cập nhật thông tin bàn thành công",
        "table": {
            "id": table_id,
            "branch_id": table["branch_id"],
            "table_name": table_name,
            "area": area,
            "status": status
        }
    }), 200

@table_bp.route("/<int:table_id>", methods=["DELETE"])
@require_auth
@require_roles(["SUPER_ADMIN", "BRANCH_MANAGER"])
def delete_table(table_id):
    """Xóa bàn"""
    table = query_one("SELECT * FROM tables WHERE id = %s", (table_id,))
    if not table:
        return jsonify({"success": False, "message": "Bàn không tồn tại"}), 404

    if table.get("status") == "OCCUPIED":
        return jsonify({"success": False, "message": "Không thể xóa bàn đang có khách phục vụ"}), 400

    execute_write("DELETE FROM tables WHERE id = %s", (table_id,))
    log_audit(
        getattr(g, 'current_user', {}).get('id', 1),
        "DELETE_TABLE",
        f"Xóa bàn {table.get('table_name')} (ID: {table_id})",
        request.remote_addr
    )
    return jsonify({"success": True, "message": "Xóa bàn thành công"}), 200
