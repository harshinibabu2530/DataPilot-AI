import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Flask
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    DEBUG = os.getenv("FLASK_DEBUG", "True").lower() == "true"
    
    # Supabase
    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    
    # OpenAI
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    
    # Groq
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    
    # LLM Provider selection
    LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai")  # "openai" or "groq"
    
    # File Upload
    MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "50"))
    ALLOWED_EXTENSIONS = set(os.getenv("ALLOWED_EXTENSIONS", "csv,xlsx,xls,json,pdf,docx").split(","))
    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
    REPORT_OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "reports")
    
    # CORS
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

    @staticmethod
    def has_llm():
        cfg = Config
        if cfg.LLM_PROVIDER == "openai":
            return bool(cfg.OPENAI_API_KEY and cfg.OPENAI_API_KEY != "sk-your-openai-api-key")
        elif cfg.LLM_PROVIDER == "groq":
            return bool(cfg.GROQ_API_KEY and cfg.GROQ_API_KEY != "gsk_your-groq-api-key")
        return False

    @staticmethod
    def has_supabase():
        cfg = Config
        return bool(cfg.SUPABASE_URL and "your-project-id" not in cfg.SUPABASE_URL)
