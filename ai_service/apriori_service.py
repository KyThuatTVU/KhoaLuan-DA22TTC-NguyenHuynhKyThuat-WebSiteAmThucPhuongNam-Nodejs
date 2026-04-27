import os
import pandas as pd
from mlxtend.frequent_patterns import apriori, association_rules
from mlxtend.preprocessing import TransactionEncoder
import mysql.connector
import pickle
from dotenv import load_dotenv

# Load env variables (same as model.py)
load_dotenv(os.path.join(os.path.dirname(__file__), '../backend/.env'))

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "root")
DB_PASS = os.getenv("DB_PASSWORD", "TVU@842004")
DB_NAME = os.getenv("DB_NAME", "amthuc_phuongnam")

def get_db_connection():
    return mysql.connector.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASS,
        database=DB_NAME
    )

def train_apriori_model(min_support=0.01, min_confidence=0.1):
    print("🚀 Bắt đầu huấn luyện mô hình Apriori (Association Rules)...")
    try:
        conn = get_db_connection()
        
        # Get orders and items
        query = """
            SELECT ma_don_hang, ma_mon
            FROM chi_tiet_don_hang
        """
        df = pd.read_sql(query, conn)
        conn.close()

        if df.empty or len(df['ma_don_hang'].unique()) < 5:
            print("⚠️ Dữ liệu quá rỗng để chạy Apriori (cần ít nhất 5 đơn hàng).")
            return False

        # Group by order to create a list of transactions
        transactions = df.groupby('ma_don_hang')['ma_mon'].apply(list).tolist()

        # One-hot encoding
        te = TransactionEncoder()
        te_ary = te.fit(transactions).transform(transactions)
        df_encoded = pd.DataFrame(te_ary, columns=te.columns_)

        # Apriori frequent itemsets
        frequent_itemsets = apriori(df_encoded, min_support=min_support, use_colnames=True)
        
        if frequent_itemsets.empty:
            print("⚠️ Không tìm thấy tập phổ biến nào với min_support hiện tại.")
            return False

        # Generate Association Rules
        rules = association_rules(frequent_itemsets, metric="confidence", min_threshold=min_confidence)
        
        # Filter rules to simpler dict for fast lookup
        # mapping { item_id: [(consequent_item, confidence, lift), ...] }
        rules_dict = {}
        for idx, row in rules.iterrows():
            antecedents = list(row['antecedents'])
            consequents = list(row['consequents'])
            confidence = float(row['confidence'])
            lift = float(row['lift'])
            
            # For simplicity, we only index rules with a single item in antecedent
            if len(antecedents) == 1:
                ant = antecedents[0]
                if ant not in rules_dict:
                    rules_dict[ant] = []
                for cons in consequents:
                    rules_dict[ant].append({
                        "item_id": cons,
                        "confidence": confidence,
                        "lift": lift
                    })
        
        # Sort consequents by lift for each antecedent
        for key in rules_dict:
            # Remove duplicates and sort
            unique_items = {}
            for item in rules_dict[key]:
                if item["item_id"] not in unique_items or item["lift"] > unique_items[item["item_id"]]["lift"]:
                    unique_items[item["item_id"]] = item
            
            rules_dict[key] = sorted(unique_items.values(), key=lambda x: x['lift'], reverse=True)

        os.makedirs('models', exist_ok=True)
        with open('models/apriori_rules.pkl', 'wb') as f:
            pickle.dump(rules_dict, f)
            
        print("✅ Hoàn tất huấn luyện Apriori!")
        print(f"Tìm thấy quy tắc cho {len(rules_dict)} món ăn.")
        return True

    except Exception as e:
        print(f"❌ Lỗi nội bộ khi huấn luyện Apriori: {str(e)}")
        return False

def get_apriori_recommendations(cart_item_ids, limit=4):
    """
    Get recommendations based on items currently in cart
    """
    try:
        model_path = 'models/apriori_rules.pkl'
        if not os.path.exists(model_path):
            return []

        with open(model_path, 'rb') as f:
            rules_dict = pickle.load(f)
            
        recommended = {}
        
        # Aggregate recommendations for all items in cart
        for item_id in cart_item_ids:
            # item_id should be int to match the keys in rules_dict where we mapped them from DataFrame
            item_id = int(item_id) if str(item_id).isdigit() else item_id
            
            if item_id in rules_dict:
                for rule in rules_dict[item_id]:
                    rec_item = rule["item_id"]
                    # Skip items already in cart
                    if rec_item in cart_item_ids:
                        continue
                        
                    if rec_item not in recommended:
                        recommended[rec_item] = 0
                    
                    # Score based on lift and confidence
                    recommended[rec_item] += rule["lift"] * rule["confidence"]
                    
        # Sort and format
        sorted_recs = sorted([{"item_id": k, "score": v} for k, v in recommended.items()], 
                             key=lambda x: x["score"], reverse=True)
                             
        return sorted_recs[:limit]
        
    except Exception as e:
        print(f"❌ Lỗi Inference Apriori: {str(e)}")
        return []

if __name__ == "__main__":
    train_apriori_model()