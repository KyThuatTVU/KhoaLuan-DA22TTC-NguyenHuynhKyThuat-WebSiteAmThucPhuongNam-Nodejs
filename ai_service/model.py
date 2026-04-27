import os
import pandas as pd
import numpy as np
import mysql.connector
from sklearn.decomposition import TruncatedSVD
import pickle
from dotenv import load_dotenv

# Load biến môi trường từ thư mục backend
load_dotenv(os.path.join(os.path.dirname(__file__), '../backend/.env'))

# Lấy config db từ env
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "root")
DB_PASS = os.getenv("DB_PASSWORD", "TVU@842004") # Note: backend uses DB_PASSWORD
DB_NAME = os.getenv("DB_NAME", "amthuc_phuongnam")

def get_db_connection():
    return mysql.connector.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASS,
        database=DB_NAME
    )

def train_collaborative_model():
    print("🚀 Bắt đầu huấn luyện mô hình Collaborative Filtering (SVD)...")
    try:
        conn = get_db_connection()
        
        # Lấy dữ liệu: Cột user, cột item, cột rating (được tính bằng số lượng mua + số sao nếu có)
        query = """
            SELECT 
                dh.ma_nguoi_dung as user_id,
                ct.ma_mon as item_id,
                -- Trọng số: Mua là 3 điểm, mỗi đánh giá + số sao
                MAX(COALESCE(dg.so_sao, 3)) as rating
            FROM chi_tiet_don_hang ct
            JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang
            LEFT JOIN danh_gia_san_pham dg ON ct.ma_mon = dg.ma_mon AND dh.ma_nguoi_dung = dg.ma_nguoi_dung
            WHERE dh.ma_nguoi_dung IS NOT NULL
            GROUP BY dh.ma_nguoi_dung, ct.ma_mon
        """
        
        df = pd.read_sql(query, conn)
        conn.close()

        if df.empty or len(df['user_id'].unique()) < 2:
            print("⚠️ Dữ liệu quá rỗng để train mô hình. Thử lại sau khi có đơn hàng.")
            return False

        # Build User-Item Matrix
        matrix = df.pivot(index='user_id', columns='item_id', values='rating').fillna(0)
        
        # Chạy SVD (Singular Value Decomposition) giảm chiều dữ liệu
        n_components = min(20, matrix.shape[1] - 1) # Tối đa n_components chiều
        n_components = max(2, n_components) # Ít nhất 2 thành phần
        
        svd = TruncatedSVD(n_components=n_components, random_state=42)
        matrix_svd = svd.fit_transform(matrix) # User Matrix M x k
        
        # Mảng danh sách các users và items
        user_ids = matrix.index.tolist()
        item_ids = matrix.columns.tolist()

        # Lưu ma trận V transpose (Item Matrix k x N)
        item_matrix = svd.components_
        
        # Lưu vào file pkl
        os.makedirs('models', exist_ok=True)
        with open('models/svd_model.pkl', 'wb') as f:
            pickle.dump({
                'user_matrix': matrix_svd,
                'item_matrix': item_matrix,
                'user_ids': user_ids,
                'item_ids': item_ids,
                'svd_obj': svd # Chứa thông tin biến đổi
            }, f)
            
        print(f"✅ Hoàn tất huấn luyện SVD! Đã lưu model tại models/svd_model.pkl")
        print(f"Tham số: {len(user_ids)} users x {len(item_ids)} items.")
        return True

    except Exception as e:
        print(f"❌ Lỗi nội bộ khi huấn luyện (Train): {str(e)}")
        return False

def get_svd_recommendations(target_user_id, top_n=5):
    try:
        model_path = 'models/svd_model.pkl'
        if not os.path.exists(model_path):
            return [] # Chưa train -> Fallback Nodejs

        with open(model_path, 'rb') as f:
            model_data = pickle.load(f)
            
        user_ids = model_data['user_ids']
        item_ids = model_data['item_ids']
        user_matrix = model_data['user_matrix']
        item_matrix = model_data['item_matrix']

        if target_user_id not in user_ids:
            return [] # User mới hoàn toàn (Cold start) -> Trả rỗng để Node.js dùng Trending

        # Lấy Index của user
        user_idx = user_ids.index(target_user_id)
        
        # Dự đoán User's rating cho tất cả các items: Dot product Vector(user_idx) x matrix_svd.components_
        user_vector = user_matrix[user_idx]
        predicted_ratings = np.dot(user_vector, item_matrix)
        
        # Tìm những items người dùng ĐÃ MUA để loại trừ khỏi gợi ý (Không bắt khách mua lại nếu ko cần)
        conn = get_db_connection()
        purchased_query = f"SELECT DISTINCT ct.ma_mon FROM chi_tiet_don_hang ct JOIN don_hang dh ON ct.ma_don_hang = dh.ma_don_hang WHERE dh.ma_nguoi_dung = {target_user_id}"
        purchased_df = pd.read_sql(purchased_query, conn)
        conn.close()
        
        purchased_items = set(purchased_df['ma_mon'].tolist())

        # Đánh giá và sắp xếp
        recommendations = []
        for i, item_id in enumerate(item_ids):
            if item_id not in purchased_items:
                recommendations.append({
                    "item_id": item_id,
                    "score": float(predicted_ratings[i])
                })

        # Sắp xếp theo score từ cao xuống thấp
        recommendations = sorted(recommendations, key=lambda x: x['score'], reverse=True)
        return recommendations[:top_n]
        
    except Exception as e:
        print(f"❌ Lỗi Inference: {str(e)}")
        return []

if __name__ == "__main__":
    train_collaborative_model()