from flask import Blueprint, request, jsonify
from app.middleware import require_auth
from app.ai_engine import RevenueForecaster, InventoryForecaster, MarketBasketAnalyzer

ai_bp = Blueprint("ai", __name__)

@ai_bp.route("/revenue-forecast", methods=["GET"])
@require_auth
def get_revenue_forecast():
    """Endpoint dự báo doanh thu chuỗi cà phê qua Random Forest Regressor & Lag Features"""
    branch_id = request.args.get("branch_id", type=int)
    days = request.args.get("days", default=30, type=int)
    
    result = RevenueForecaster.train_and_forecast(branch_id=branch_id, forecast_days=days)
    return jsonify(result), 200

@ai_bp.route("/inventory-forecast", methods=["GET"])
@require_auth
def get_inventory_forecast():
    """Endpoint dự báo nhu cầu nhập nguyên vật liệu theo định lượng BOM kết hợp Random Forest"""
    branch_id = request.args.get("branch_id", default=1, type=int)
    period_days = request.args.get("period", default=7, type=int)

    result = InventoryForecaster.forecast_ingredient_demand(branch_id=branch_id, forecast_period_days=period_days)
    return jsonify(result), 200

@ai_bp.route("/association-rules", methods=["GET"])
@require_auth
def get_association_rules():
    """Endpoint khai phá luật kết hợp giỏ hàng Apriori & đề xuất Combo"""
    min_support = request.args.get("min_support", default=0.01, type=float)
    min_confidence = request.args.get("min_confidence", default=0.5, type=float)

    result = MarketBasketAnalyzer.mine_rules(min_support=min_support, min_confidence=min_confidence)
    return jsonify(result), 200

@ai_bp.route("/pos-cross-sell", methods=["POST"])
@require_auth
def get_pos_cross_sell():
    """Endpoint gợi ý bán chéo món mua kèm tức thì tại màn hình POS"""
    data = request.get_json() or {}
    current_items = data.get("current_items", []) # List tên các món đang chọn trong giỏ

    recommendations = MarketBasketAnalyzer.get_pos_cross_sell_recommendations(current_items)
    return jsonify({
        "success": True,
        "recommendations": recommendations
    }), 200
