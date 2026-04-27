import os
from langchain_community.utilities import SQLDatabase
from langchain_groq import ChatGroq
from langchain_classic.chains import create_sql_query_chain
from langchain_community.tools.sql_database.tool import QuerySQLDataBaseTool
from langchain_core.prompts import PromptTemplate
from langchain_community.agent_toolkits import create_sql_agent
import urllib.parse
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '../backend/.env'))

# MySQL connection string format for SQLAlchemy
DB_USER = os.getenv("DB_USER", "root")
DB_PASS = os.getenv("DB_PASSWORD", "TVU@842004")
# URL-encode password in case it contains special characters like @
DB_PASS_ENCODED = urllib.parse.quote_plus(DB_PASS)
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_NAME = os.getenv("DB_NAME", "amthuc_phuongnam")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# Create SQLAlchemy connection string
db_uri = f"mysql+mysqlconnector://{DB_USER}:{DB_PASS_ENCODED}@{DB_HOST}/{DB_NAME}"

try:
    db = SQLDatabase.from_uri(db_uri)
    llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0, groq_api_key=GROQ_API_KEY)
    
    # Create the SQL Agent
    # This agent can see the table schemas, generate queries, execute them, and answer.
    agent_executor = create_sql_agent(llm, db=db, agent_type="openai-tools", verbose=True)
except Exception as e:
    print(f"Error initializing Langchain DB Agent: {e}")
    agent_executor = None

def ask_business_bot(question: str) -> str:
    if not agent_executor:
        return "Xin lỗi, Hệ thống AI phân tích dữ liệu DB không khởi tạo được. Vui lòng kiểm tra lại cấu hình DB."
        
    system_prefix = """
Bạn là "Phương Nam" - trợ lý AI cực kỳ thông minh của nhà hàng "Ẩm Thực Phương Nam".
Người dùng gọi bạn là "Phương Nam", bạn xưng là "em", gọi chủ là "chị Linh". 
NHIỆM VỤ: Quan sát trong Database, viết truy vấn MySQL. Khi có kết quả MySQL, bạn hãy suy nghĩ và đưa ra lời phân tích về chiến lược, đề xuất sản phẩm mới, và tối ưu hóa lợi nhuận. Trả lời luôn bằng tiếng Việt. Suy nghĩ như một nhà kinh tế và đưa ra lời khuyên thực tiễn.
"""
    
    try:
        response = agent_executor.invoke({"input": f"{system_prefix}\n\nCâu hỏi của chị Linh: {question}"})
        return response.get("output", "Không nhận được phản hồi.")
    except Exception as e:
        print(f"Error in ask_business_bot: {e}")
        return f"Em đang gặp chút vấn đề khi lấy dữ liệu: {str(e)}"
