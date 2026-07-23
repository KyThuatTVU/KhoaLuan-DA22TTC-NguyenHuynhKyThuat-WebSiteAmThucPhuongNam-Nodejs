"""
API endpoint để lấy tất cả các luật Apriori đã train
"""
import os
import pickle
import pandas as pd
import mysql.connector
from dotenv import load_dotenv

# Load env
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

def get_all_apriori_rules():
    """
    Lấy tất cả các luật Apriori từ file đã train
    Returns: List of rules with dish names
    """
    try:
        model_path = os.path.join(os.path.dirname(__file__), 'models', 'apriori_rules.pkl')
        
        if not os.path.exists(model_path):
            return {
                'success': False,
                'message': 'Chưa có model Apriori. Hãy train trước!',
                'data': []
            }
        
        # Load rules
        with open(model_path, 'rb') as f:
            rules_dict = pickle.load(f)
        
        # Connect DB để lấy tên món
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Lấy tất cả món ăn
        cursor.execute("SELECT ma_mon, ten_mon, anh_mon, gia_tien FROM mon_an")
        dishes = {row['ma_mon']: row for row in cursor.fetchall()}
        
        # Format rules cho dễ hiển thị
        formatted_rules = []
        total_rules = 0
        
        for antecedent_id, consequents in rules_dict.items():
            if antecedent_id not in dishes:
                continue
            
            antecedent_dish = dishes[antecedent_id]
            
            for consequent in consequents:
                consequent_id = consequent['item_id']
                
                if consequent_id not in dishes:
                    continue
                
                consequent_dish = dishes[consequent_id]
                
                formatted_rules.append({
                    'antecedent': {
                        'id': antecedent_id,
                        'name': antecedent_dish['ten_mon'],
                        'image': antecedent_dish['anh_mon'],
                        'price': antecedent_dish['gia_tien']
                    },
                    'consequent': {
                        'id': consequent_id,
                        'name': consequent_dish['ten_mon'],
                        'image': consequent_dish['anh_mon'],
                        'price': consequent_dish['gia_tien']
                    },
                    'confidence': consequent['confidence'],
                    'lift': consequent['lift'],
                    'rule': f"{antecedent_dish['ten_mon']} → {consequent_dish['ten_mon']}"
                })
                total_rules += 1
        
        # Sắp xếp theo confidence giảm dần
        formatted_rules.sort(key=lambda x: x['confidence'], reverse=True)
        
        conn.close()
        
        return {
            'success': True,
            'data': formatted_rules,
            'meta': {
                'total_rules': total_rules,
                'total_antecedents': len(rules_dict),
                'avg_confidence': sum(r['confidence'] for r in formatted_rules) / len(formatted_rules) if formatted_rules else 0
            }
        }
        
    except Exception as e:
        return {
            'success': False,
            'message': f'Lỗi: {str(e)}',
            'data': []
        }

if __name__ == "__main__":
    result = get_all_apriori_rules()
    print(f"Success: {result['success']}")
    if result['success']:
        print(f"Total rules: {result['meta']['total_rules']}")
        print(f"\nTop 10 rules:")
        for i, rule in enumerate(result['data'][:10], 1):
            print(f"{i}. {rule['rule']} (Confidence: {rule['confidence']:.2%}, Lift: {rule['lift']:.2f})")
