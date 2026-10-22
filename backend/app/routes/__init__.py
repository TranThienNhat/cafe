from app.routes.auth_routes import auth_bp
from app.routes.branch_routes import branch_bp
from app.routes.user_routes import user_bp
from app.routes.table_routes import table_bp
from app.routes.menu_routes import menu_bp
from app.routes.inventory_routes import inventory_bp
from app.routes.order_routes import order_bp
from app.routes.report_routes import report_bp
from app.routes.ai_routes import ai_bp

def register_routes(app):
    """Đăng ký tất cả các Blueprints vào Flask Application"""
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(branch_bp, url_prefix="/api/branches")
    app.register_blueprint(user_bp, url_prefix="/api/users")
    app.register_blueprint(table_bp, url_prefix="/api/tables")
    app.register_blueprint(menu_bp, url_prefix="/api/menu")
    app.register_blueprint(inventory_bp, url_prefix="/api/inventory")
    app.register_blueprint(order_bp, url_prefix="/api/orders")
    app.register_blueprint(report_bp, url_prefix="/api/reports")
    app.register_blueprint(ai_bp, url_prefix="/api/ai")
