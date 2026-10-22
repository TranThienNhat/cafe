from flask import Blueprint, request, jsonify, g
from app.db import query_all, query_one
from app.middleware import require_auth

report_bp = Blueprint("reports", __name__)

@report_bp.route("/kpis", methods=["GET"])
@require_auth
def get_kpis():
    """Lấy các chỉ số kinh doanh chính (KPIs) thời gian thực"""
    branch_id = request.args.get("branch_id")
    params = []
    branch_filter_orders = ""
    branch_filter_inv = ""

    if branch_id:
        branch_filter_orders = "AND branch_id = %s"
        branch_filter_inv = "WHERE branch_id = %s"
        params.append(branch_id)

    # 1. Doanh thu hôm nay
    sql_today = f"""
        SELECT 
            COALESCE(SUM(final_amount), 0) AS today_revenue,
            COUNT(id) AS today_orders
        FROM orders
        WHERE status = 'COMPLETED' AND DATE(created_at) = CURRENT_DATE() {branch_filter_orders}
    """
    today_stats = query_one(sql_today, tuple(params))

    # 2. Doanh thu tháng này
    sql_month = f"""
        SELECT 
            COALESCE(SUM(final_amount), 0) AS month_revenue,
            COUNT(id) AS month_orders
        FROM orders
        WHERE status = 'COMPLETED' 
          AND MONTH(created_at) = MONTH(CURRENT_DATE()) 
          AND YEAR(created_at) = YEAR(CURRENT_DATE()) {branch_filter_orders}
    """
    month_stats = query_one(sql_month, tuple(params))

    # 3. Số nguyên liệu cảnh báo tồn kho
    sql_low_stock = f"""
        SELECT COUNT(id) AS low_stock_count
        FROM branch_inventories
        {branch_filter_inv} {"AND" if branch_filter_inv else "WHERE"} stock_quantity <= safety_stock
    """
    low_stock = query_one(sql_low_stock, tuple(params) if branch_id else ())

    # 4. Tổng số chi nhánh & nhân sự
    total_branches = query_one("SELECT COUNT(id) AS count FROM branches WHERE status = 'ACTIVE'")
    total_users = query_one("SELECT COUNT(id) AS count FROM users WHERE status = 'ACTIVE'")

    return jsonify({
        "success": True,
        "kpis": {
            "today_revenue": float(today_stats.get("today_revenue", 0)),
            "today_orders": int(today_stats.get("today_orders", 0)),
            "month_revenue": float(month_stats.get("month_revenue", 0)),
            "month_orders": int(month_stats.get("month_orders", 0)),
            "low_stock_count": int(low_stock.get("low_stock_count", 0)),
            "total_branches": int(total_branches.get("count", 0)),
            "total_users": int(total_users.get("count", 0))
        }
    }), 200

@report_bp.route("/revenue-trends", methods=["GET"])
@require_auth
def get_revenue_trends():
    """Lấy dữ liệu chuỗi thời gian doanh thu theo ngày để vẽ biểu đồ ECharts"""
    branch_id = request.args.get("branch_id")
    days = int(request.args.get("days", 30))

    params = []
    where_branch = ""
    if branch_id:
        where_branch = "AND branch_id = %s"
        params.append(branch_id)

    sql = f"""
        SELECT 
            DATE(created_at) AS date,
            COALESCE(SUM(final_amount), 0) AS revenue,
            COUNT(id) AS order_count
        FROM orders
        WHERE status = 'COMPLETED' 
          AND created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL %s DAY) {where_branch}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
    """
    params.insert(0, days)
    trends = query_all(sql, tuple(params))
    return jsonify({"success": True, "trends": trends}), 200

@report_bp.route("/branch-comparison", methods=["GET"])
@require_auth
def get_branch_comparison():
    """So sánh doanh thu và số lượng đơn giữa các chi nhánh"""
    sql = """
        SELECT 
            b.id AS branch_id,
            b.name AS branch_name,
            COALESCE(SUM(o.final_amount), 0) AS total_revenue,
            COUNT(o.id) AS total_orders
        FROM branches b
        LEFT JOIN orders o ON b.id = o.branch_id AND o.status = 'COMPLETED'
        GROUP BY b.id, b.name
        ORDER BY total_revenue DESC
    """
    comparison = query_all(sql)
    return jsonify({"success": True, "comparison": comparison}), 200

@report_bp.route("/top-products", methods=["GET"])
@require_auth
def get_top_products():
    """Danh sách món bán chạy nhất (Top Sellers)"""
    branch_id = request.args.get("branch_id")
    limit = int(request.args.get("limit", 10))

    params = []
    where_branch = ""
    if branch_id:
        where_branch = "WHERE o.branch_id = %s"
        params.append(branch_id)

    sql = f"""
        SELECT 
            p.id,
            p.name,
            c.name AS category_name,
            SUM(oi.quantity) AS total_sold,
            SUM(oi.quantity * oi.unit_price) AS total_sales
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        JOIN categories c ON p.category_id = c.id
        JOIN orders o ON oi.order_id = o.id
        {where_branch}
        GROUP BY p.id, p.name, c.name
        ORDER BY total_sold DESC
        LIMIT %s
    """
    params.append(limit)
    top_items = query_all(sql, tuple(params))
    return jsonify({"success": True, "top_products": top_items}), 200

@report_bp.route("/hourly-peak", methods=["GET"])
@require_auth
def get_hourly_peak():
    """Phân tích khung giờ cao điểm trong ngày (Peak Hours)"""
    branch_id = request.args.get("branch_id")
    params = []
    where_branch = ""
    if branch_id:
        where_branch = "WHERE branch_id = %s"
        params.append(branch_id)

    sql = f"""
        SELECT 
            HOUR(created_at) AS hour_num,
            COUNT(id) AS total_orders,
            COALESCE(SUM(final_amount), 0) AS total_revenue
        FROM orders
        {where_branch}
        GROUP BY HOUR(created_at)
        ORDER BY hour_num ASC
    """
    records = query_all(sql, tuple(params))
    
    # Tạo danh sách đầy đủ các khung giờ từ 7h đến 22h
    hour_map = {r["hour_num"]: r for r in records}
    formatted = []
    for h in range(7, 23):
        item = hour_map.get(h, {"hour_num": h, "total_orders": 0, "total_revenue": 0})
        formatted.append({
            "hour_label": f"{h:02d}:00",
            "hour": h,
            "orders": int(item.get("total_orders", 0)),
            "revenue": float(item.get("total_revenue", 0))
        })

    return jsonify({"success": True, "hourly_data": formatted}), 200

@report_bp.route("/payment-breakdown", methods=["GET"])
@require_auth
def get_payment_breakdown():
    """Tỷ trọng phương thức thanh toán và hình thức phục vụ"""
    branch_id = request.args.get("branch_id")
    params = []
    where_branch = ""
    if branch_id:
        where_branch = "WHERE branch_id = %s"
        params.append(branch_id)

    sql_pay = f"""
        SELECT 
            payment_method,
            COUNT(id) AS count,
            COALESCE(SUM(final_amount), 0) AS total_amount
        FROM orders
        {where_branch}
        GROUP BY payment_method
    """
    payments = query_all(sql_pay, tuple(params))

    sql_type = f"""
        SELECT 
            order_type,
            COUNT(id) AS count,
            COALESCE(SUM(final_amount), 0) AS total_amount
        FROM orders
        {where_branch}
        GROUP BY order_type
    """
    types = query_all(sql_type, tuple(params))

    return jsonify({
        "success": True,
        "payments": payments,
        "order_types": types
    }), 200

@report_bp.route("/audit-logs", methods=["GET"])
@require_auth
def get_audit_logs():
    """Lấy danh sách nhật ký hoạt động hệ thống"""
    limit = int(request.args.get("limit", 100))
    sql = """
        SELECT 
            al.id, al.user_id, u.full_name AS user_name, u.username,
            al.action, al.detail, al.ip_address, al.created_at
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ORDER BY al.id DESC
        LIMIT %s
    """
    logs = query_all(sql, (limit,))
    return jsonify({"success": True, "logs": logs}), 200
