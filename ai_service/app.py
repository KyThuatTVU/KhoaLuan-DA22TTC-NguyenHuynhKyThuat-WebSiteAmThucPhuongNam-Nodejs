import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from model import get_svd_recommendations, train_collaborative_model
from apriori_service import train_apriori_model, get_apriori_recommendations
from admin_bot_service import ask_business_bot

app = Flask(__name__)
CORS(app)  # Allow Node.js calling this API

@app.route('/api/ml/recommend/collaborative', methods=['GET'])
def get_recommendations():
    """ Trả về List Item Id gợi ý bằng Collaborative Filtering SVD """
    user_id = request.args.get('user_id')
    limit = int(request.args.get('limit', 5))
    
    if not user_id:
        return jsonify({"success": False, "message": "Thiếu user_id"}), 400
        
    try:
        items = get_svd_recommendations(int(user_id), limit)
        
        if not items:
            return jsonify({
                "success": True, 
                "data": [],
                "message": "Không đủ data (Cold-start), fallback vào Node.js."
            }), 200
            
        return jsonify({
            "success": True,
            "data": items,
            "message": "Gợi ý cá nhân hóa từ mô hình Collaborative Filtering."
        }), 200
        
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/ml/recommend/apriori', methods=['GET'])
def get_apriori():
    """ Trả về List Item Id gợi ý bằng Apriori dựa vào giỏ hàng """
    try:
        cart_ids = request.args.get('cart', '')
        limit = int(request.args.get('limit', 4))
        
        if not cart_ids:
            return jsonify({"success": False, "message": "Thiếu cart items"}), 400
            
        # Parse list of item ids (comma-separated string)
        ids_list = [int(i.strip()) for i in cart_ids.split(',')]
        
        items = get_apriori_recommendations(ids_list, limit)
        
        if not items:
            return jsonify({
                "success": True, 
                "data": [],
                "message": "Không có quy tắc kết hợp cho các món này."
            }), 200
            
        return jsonify({
            "success": True,
            "data": items,
            "message": "Gợi ý món ăn kèm từ Apriori."
        }), 200
        
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/ml/admin/chat', methods=['POST'])
def admin_chat():
    """ Trả lời câu hỏi phân tích kinh doanh của Admin thông qua LangChain SQL Agent """
    try:
        data = request.json
        question = data.get('question', '')
        
        if not question:
            return jsonify({"success": False, "message": "Câu hỏi rỗng."}), 400
            
        answer = ask_business_bot(question)
        
        return jsonify({
            "success": True,
            "answer": answer
        }), 200
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/ml/train', methods=['POST'])
def trigger_training():
    """ Đánh thức thủ công tiến trình Train Model """
    result_svd = train_collaborative_model()
    result_apriori = train_apriori_model()
    
    if result_svd or result_apriori:
        return jsonify({"success": True, "message": "Huấn luyện mô hình thành công!"})
    return jsonify({"success": False, "message": "Không thể huấn luyện mô hình. Hãy kiểm tra Logs."})

if __name__ == '__main__':
    # Train the model once at startup to ensure the file exists.
    train_collaborative_model()
    train_apriori_model()
    print("🚀 AI Microservice is running on port 5000!")
    app.run(host='0.0.0.0', port=5000, debug=True)
