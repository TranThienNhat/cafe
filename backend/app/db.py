import pymysql
from pymysql.cursors import DictCursor
from contextlib import contextmanager
from decimal import Decimal
from datetime import date, datetime
from app.config import Config

def get_connection():
    """Tạo kết nối tới cơ sở dữ liệu MySQL"""
    return pymysql.connect(
        host=Config.DB_HOST,
        port=Config.DB_PORT,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        database=Config.DB_NAME,
        charset=Config.DB_CHARSET,
        cursorclass=DictCursor,
        autocommit=True
    )

def sanitize_result(data):
    """Chuyển đổi các kiểu dữ liệu đặc biệt như Decimal, Date, Datetime sang kiểu JSON-serializable"""
    if isinstance(data, list):
        return [sanitize_result(item) for item in data]
    elif isinstance(data, dict):
        sanitized = {}
        for k, v in data.items():
            if isinstance(v, Decimal):
                sanitized[k] = float(v)
            elif isinstance(v, (datetime, date)):
                sanitized[k] = v.isoformat()
            else:
                sanitized[k] = v
        return sanitized
    elif isinstance(data, Decimal):
        return float(data)
    elif isinstance(data, (datetime, date)):
        return data.isoformat()
    return data

def query_all(sql, params=None):
    """Thực thi câu truy vấn Raw SQL SELECT trả về danh sách bản ghi (Dictionary)"""
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql, params or ())
            results = cursor.fetchall()
            return sanitize_result(results)
    finally:
        conn.close()

def query_one(sql, params=None):
    """Thực thi câu truy vấn Raw SQL SELECT trả về 1 bản ghi duy nhất"""
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql, params or ())
            result = cursor.fetchone()
            return sanitize_result(result) if result else None
    finally:
        conn.close()

def execute_write(sql, params=None):
    """Thực thi câu lệnh INSERT, UPDATE, DELETE đơn lẻ"""
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql, params or ())
            last_id = cursor.lastrowid
            affected = cursor.rowcount
            return {"last_id": last_id, "affected_rows": affected}
    finally:
        conn.close()

@contextmanager
def get_transaction():
    """Context manager phục vụ xử lý transaction nhiều bước an toàn với Rollback khi xảy ra lỗi"""
    conn = pymysql.connect(
        host=Config.DB_HOST,
        port=Config.DB_PORT,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        database=Config.DB_NAME,
        charset=Config.DB_CHARSET,
        cursorclass=DictCursor,
        autocommit=False
    )
    try:
        with conn.cursor() as cursor:
            yield cursor
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def log_audit(user_id, action, detail, ip_address=None):
    """Ghi nhật ký hệ thống vào bảng audit_logs qua Raw SQL"""
    try:
        sql = """
            INSERT INTO audit_logs (user_id, action, detail, ip_address, created_at)
            VALUES (%s, %s, %s, %s, NOW())
        """
        execute_write(sql, (user_id, action, detail, ip_address))
    except Exception as e:
        print(f"[AUDIT LOG ERROR]: {e}")
