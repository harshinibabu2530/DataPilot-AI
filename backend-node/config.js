import dotenv from 'dotenv';
dotenv.config();

const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Python microservice
  pythonServiceUrl: process.env.PYTHON_SERVICE_URL || 'http://localhost:5001',

  // Supabase
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // OpenAI
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',

  // Groq
  groqApiKey: process.env.GROQ_API_KEY || '',
  groqModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',

  // LLM Provider
  llmProvider: process.env.LLM_PROVIDER || 'openai',

  // File Upload
  maxUploadSizeMb: parseInt(process.env.MAX_UPLOAD_SIZE_MB || '50', 10),
  allowedExtensions: new Set(
    (process.env.ALLOWED_EXTENSIONS || 'csv,xlsx,xls,json,pdf,docx').split(',')
  ),

  // CORS
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Helpers
  hasLlm() {
    if (this.llmProvider === 'openai') {
      return Boolean(this.openaiApiKey && !this.openaiApiKey.startsWith('sk-your'));
    }
    if (this.llmProvider === 'groq') {
      return Boolean(this.groqApiKey && !this.groqApiKey.startsWith('gsk_your'));
    }
    return false;
  },

  hasSupabase() {
    return Boolean(this.supabaseUrl && !this.supabaseUrl.includes('your-project-id'));
  },
};

export default config;
