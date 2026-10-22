from flask import Flask, jsonify
from flask_cors import CORS
from app.config import Config
from app.routes import register_routes

def create_app():
    """Khởi tạo và cấu hình Flask Application"""
    app = Flask(__name__)
    app.config.from_object(Config)

    # Kích hoạt CORS hỗ trợ Frontend ReactJS kết nối an toàn
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Đăng ký Blueprints
    register_routes(app)

    # Health check endpoint
    @app.route("/api/health", methods=["GET"])
    def health_check():
        return jsonify({
            "status": "healthy",
            "service": "Smart Coffee Management API",
            "version": "1.0.0"
        }), 200

    # Global Error Handlers
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"success": False, "message": "Tài nguyên không tồn tại (404)"}), 404

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"success": False, "message": "Lỗi máy chủ nội bộ (500)", "error": str(e)}), 500

    return app
