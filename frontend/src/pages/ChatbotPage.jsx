import { useState, useRef, useEffect } from 'react'
import { useData } from '../context/DataContext'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import {
  Send,
  Bot,
  User,
  AlertCircle,
  Loader2,
  Trash2,
  Hash,
  Calendar,
  Type,
  Database,
  Search,
  Copy,
  Check,
  Terminal,
  Grid,
  Filter,
  Code
} from 'lucide-react'
import toast from 'react-hot-toast'

const SUGGESTIONS = [
  'How many rows does the dataset have?',
  'What are the column names?',
  'Which column has the most missing values?',
  'What is the strongest correlation?',
  'Show me the average values',
  'What are the top 5 values?',
]

const SQL_SUGGESTIONS = [
  'Show top 5 customers',
  'Calculate average values by category',
  'Show top 10 records',
  'Count total records',
  'Average value of primary metrics',
]

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} animate-fade-in`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-brand-600' : ''}`}
        style={isUser ? {} : { background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>
        {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-brand-400" />}
      </div>
      <div className={isUser ? 'chat-bubble-user' : 'chat-bubble-bot'}>
        <span dangerouslySetInnerHTML={{
          __html: msg.content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/`(.*?)`/g, '<code class="bg-indigo-950/60 px-1.5 py-0.5 rounded text-indigo-300 font-mono text-[11px] border border-indigo-500/10">$1</code>')
            .replace(/\n/g, '<br/>')
        }} />
      </div>
    </div>
  )
}

function SQLQueryCard({ sql, explanation }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sql)
      setCopied(true)
      toast.success('SQL query copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error('Failed to copy to clipboard')
    }
  }

  // Very unique client-side syntax highlighter for premium feeling
  const highlightSQL = (code) => {
    if (!code) return ''
    return code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\b(SELECT|FROM|WHERE|JOIN|ON|GROUP BY|ORDER BY|LIMIT|SUM|AVG|COUNT|MAX|MIN|AS|DESC|ASC|LEFT|RIGHT|INNER|AND|OR|HAVING|IN)\b/g, '<span class="text-indigo-400 font-semibold">$1</span>')
      .replace(/\b(\d+)\b/g, '<span class="text-amber-400">$1</span>')
      .replace(/(["'])(.*?)\1/g, '<span class="text-emerald-400">\'$2\'</span>')
  }

  return (
    <div className="w-full rounded-xl overflow-hidden border border-slate-800/80 shadow-2xl bg-slate-950/90 backdrop-blur-md my-4 animate-fade-in">
      {/* Editor Mockup Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/60 border-b border-slate-800/50 select-none">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 mr-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
          </div>
          <span className="text-[10px] font-semibold text-slate-400 tracking-wider font-mono flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            query.sql
          </span>
          <span className="text-[9px] bg-indigo-950/60 border border-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-mono">
            ANSI SQL
          </span>
        </div>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium font-mono transition-all duration-300 ${
            copied
              ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
              : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span>COPIED</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>COPY</span>
            </>
          )}
        </button>
      </div>

      {/* Editor Code Area */}
      <pre className="p-4 font-mono text-[11px] text-indigo-100 overflow-x-auto whitespace-pre-wrap leading-relaxed select-text bg-[#090d16]/95">
        <code dangerouslySetInnerHTML={{ __html: highlightSQL(sql) }} />
      </pre>

      {/* Strategic AI Explanation Drawer */}
      <div className="px-4 py-3 bg-indigo-950/10 border-t border-indigo-500/10 flex gap-3 items-start">
        <div className="w-7 h-7 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
          <Bot className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="space-y-0.5">
          <div className="text-[9px] font-bold text-indigo-400 tracking-wider uppercase">Strategic Brief</div>
          <p className="text-[11px] text-slate-300 leading-relaxed font-sans">{explanation}</p>
        </div>
      </div>
    </div>
  )
}

function getDatasetSemanticSummary(filename, columns = [], domain = 'generic') {
  const cleanName = filename
    ? filename.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ")
    : "Active Dataset";
  
  const colsLower = columns.map(c => c.toLowerCase());
  const subjects = [];
  const metrics = [];
  const demographics = [];
  const temporals = [];
  
  columns.forEach(col => {
    const c = col.toLowerCase();
    if (c.includes('age') || c.includes('gender') || c.includes('sex') || c.includes('demographic') || c.includes('country') || c.includes('city') || c.includes('education')) {
      demographics.push(`\`${col}\``);
    } else if (c.includes('date') || c.includes('time') || c.includes('year') || c.includes('month') || c.includes('day') || c.includes('timestamp')) {
      temporals.push(`\`${col}\``);
    } else if (c.includes('id') || c.includes('name') || c.includes('email') || c.includes('phone') || c.includes('key')) {
      subjects.push(`\`${col}\``);
    } else {
      metrics.push(`\`${col}\``);
    }
  });

  let summary = `This dataset, titled **"${cleanName}"**, is structured around analyzing `;
  
  if (subjects.length > 0) {
    summary += `records identified by ${subjects.slice(0, 2).join(' or ')} `;
  } else {
    summary += `data entries `;
  }

  if (demographics.length > 0) {
    summary += `across demographic segments like ${demographics.join(', ')} `;
  }
  
  if (temporals.length > 0) {
    summary += `tracked over time fields (${temporals.join(', ')}) `;
  }

  if (metrics.length > 0) {
    summary += `to measure key metrics including ${metrics.slice(0, 4).join(', ')}${metrics.length > 4 ? `, and ${metrics.length - 4} others` : ''}.`;
  } else {
    summary += `to evaluate various attributes.`;
  }

  const isSleep = colsLower.some(c => c.includes('sleep') || c.includes('disrupt') || c.includes('wake') || c.includes('insomnia') || c.includes('hour'));
  const isFinance = colsLower.some(c => c.includes('revenue') || c.includes('profit') || c.includes('sales') || c.includes('cost') || c.includes('price'));
  const isHR = colsLower.some(c => c.includes('employee') || c.includes('salary') || c.includes('attrition') || c.includes('hire') || c.includes('department'));
  
  let additionalContext = "";
  if (isSleep || cleanName.toLowerCase().includes('sleep') || cleanName.toLowerCase().includes('disrupt')) {
    additionalContext = `\n\n**🔍 Sleep & Well-being Insights:** By studying the relationship between lifestyle indicators (${demographics.slice(0, 2).join(', ') || 'personal attributes'}) and sleep characteristics (like disruption scores, quality indices, or duration metrics), we can uncover patterns in sleep hygiene, identify primary disruption triggers, and suggest corrective pathways.`;
  } else if (isFinance || domain === 'finance' || domain === 'retail') {
    additionalContext = `\n\n**📈 Financial & Commercial Insights:** By examining operational variables against key commercial outcomes (like revenue, price structures, or profit metrics), we can map customer demand elasticity, pinpoint high-yielding business sectors, and forecast future revenue growth.`;
  } else if (isHR || domain === 'hr') {
    additionalContext = `\n\n**👥 Organizational & HR Insights:** By modeling employee characteristics against salary structures, departmental groups, and performance reviews, we can identify key attrition risk factors, analyze pay equity, and track talent utilization.`;
  } else if (domain === 'healthcare') {
    additionalContext = `\n\n**🏥 Healthcare & Clinical Insights:** By correlating patient attributes with clinical test results and wellness scores, we can identify high-risk diagnostic groups, evaluate treatment efficacy, and isolate primary health-influencing determinants.`;
  } else {
    additionalContext = `\n\n**📊 General Analytical Focus:** We can explore statistical correlations between your tracking fields and outcomes to uncover hidden segments, identify anomalies, and model predictive trend lines.`;
  }

  return summary + additionalContext;
}

export default function ChatbotPage() {
  const { sessionId, filename, domain, rowCount, columnCount, columns, dtypes, chatHistory } = useData()
  const navigate = useNavigate()
  
  // Dual-mode Workspace State
  const [activeMode, setActiveMode] = useState('chat') // 'chat' | 'sql'
  const [messages, setMessages] = useState([])
  const [sqlMessages, setSqlMessages] = useState([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  
  // Schema search filtering
  const [schemaSearch, setSchemaSearch] = useState('')
  
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  // Initialize Chat (AI Analyst Chat) Welcome Message
  useEffect(() => {
    if (!filename) return

    const semanticSummary = getDatasetSemanticSummary(filename, columns, domain)
    const customWelcome = `Hi! I've loaded your dataset **${filename}** (${rowCount ? rowCount.toLocaleString() : 0} rows, ${columnCount || 0} columns) 📊\n\n${semanticSummary}\n\nI am fully context-aware and ready to answer your queries about correlations, statistics, trends, or outliers. What would you like to know?`
    const welcomeMsg = { role: 'assistant', content: customWelcome }

    if (chatHistory && chatHistory.length > 0) {
      setMessages([welcomeMsg, ...chatHistory])
    } else {
      setMessages([welcomeMsg])
    }
  }, [filename, sessionId, chatHistory, rowCount, columnCount, columns, domain])

  // Initialize SQL Generator Welcome Message
  useEffect(() => {
    if (!filename) return

    const customSqlWelcome = `Welcome to the **SQL Query Generator**! 💻\n\nI have parsed your dataset schema for **"${filename}"** and created a dynamic SQL translation model.\n\nAsk me any natural language question (e.g., *"Show top 5 customers"* or *"Average revenue by category"*) and I will generate optimized, syntactically clean ANSI SQL queries, complete with strategic performance insights.`
    const welcomeMsg = { role: 'assistant', content: customSqlWelcome, isSql: true }
    setSqlMessages([welcomeMsg])
  }, [filename])

  // Scroll to bottom when messages or mode changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sqlMessages, activeMode])

  const getGuessedTableName = () => {
    const dom = (domain || 'generic').toLowerCase()
    if (['finance', 'retail', 'sales'].includes(dom)) return 'sales'
    if (['hr', 'workforce'].includes(dom)) return 'workforce'
    if (['wellness', 'health', 'healthcare'].includes(dom)) return 'healthcare'
    return 'data'
  }

  const getColIconAndType = (colName) => {
    const rawType = (dtypes?.[colName] || 'any').toLowerCase()
    if (rawType.includes('int') || rawType.includes('float') || rawType.includes('double') || rawType.includes('num')) {
      return {
        icon: <Hash className="w-3.5 h-3.5 text-purple-400" />,
        label: 'numeric',
        badgeClass: 'bg-purple-950/60 text-purple-300 border-purple-500/20'
      }
    }
    if (rawType.includes('date') || rawType.includes('time') || rawType.includes('timestamp')) {
      return {
        icon: <Calendar className="w-3.5 h-3.5 text-blue-400" />,
        label: 'datetime',
        badgeClass: 'bg-blue-950/60 text-blue-300 border-blue-500/20'
      }
    }
    if (rawType.includes('obj') || rawType.includes('str') || rawType.includes('char')) {
      return {
        icon: <Type className="w-3.5 h-3.5 text-emerald-400" />,
        label: 'text',
        badgeClass: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/20'
      }
    }
    
    // Heuristic fallbacks based on name if raw dtypes are missing or simple objects
    const lowerName = colName.toLowerCase()
    if (
      lowerName.includes('revenue') ||
      lowerName.includes('sales') ||
      lowerName.includes('amount') ||
      lowerName.includes('profit') ||
      lowerName.includes('price') ||
      lowerName.includes('id') ||
      lowerName.includes('score') ||
      lowerName.includes('duration') ||
      lowerName.includes('level') ||
      lowerName.includes('count') ||
      lowerName.includes('index')
    ) {
      return {
        icon: <Hash className="w-3.5 h-3.5 text-purple-400" />,
        label: 'numeric',
        badgeClass: 'bg-purple-950/60 text-purple-300 border-purple-500/20'
      }
    }
    if (lowerName.includes('date') || lowerName.includes('time') || lowerName.includes('year') || lowerName.includes('month') || lowerName.includes('timestamp')) {
      return {
        icon: <Calendar className="w-3.5 h-3.5 text-blue-400" />,
        label: 'datetime',
        badgeClass: 'bg-blue-950/60 text-blue-300 border-blue-500/20'
      }
    }
    if (
      lowerName.includes('name') ||
      lowerName.includes('region') ||
      lowerName.includes('gender') ||
      lowerName.includes('sex') ||
      lowerName.includes('category') ||
      lowerName.includes('email') ||
      lowerName.includes('city') ||
      lowerName.includes('country') ||
      lowerName.includes('group') ||
      lowerName.includes('type')
    ) {
      return {
        icon: <Type className="w-3.5 h-3.5 text-emerald-400" />,
        label: 'text',
        badgeClass: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/20'
      }
    }
    return {
      icon: <Database className="w-3.5 h-3.5 text-slate-400" />,
      label: rawType || 'any',
      badgeClass: 'bg-slate-900/60 text-slate-300 border-slate-700/20'
    }
  }

  const sendMessage = async (text) => {
    const msg = (text || input).trim()
    if (!msg || !sessionId) return

    setInput('')
    
    if (activeMode === 'chat') {
      setMessages(prev => [...prev, { role: 'user', content: msg }])
      setIsTyping(true)

      try {
        const { data } = await api.chat(sessionId, msg)
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      } catch (err) {
        toast.error(err.message)
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: "Sorry, I couldn't process that. Please try again."
        }])
      } finally {
        setIsTyping(false)
        inputRef.current?.focus()
      }
    } else {
      setSqlMessages(prev => [...prev, { role: 'user', content: msg }])
      setIsTyping(true)

      try {
        const { data } = await api.generateSql(sessionId, msg)
        setSqlMessages(prev => [...prev, {
          role: 'assistant',
          content: data.explanation,
          sql: data.sql,
          explanation: data.explanation,
          isSql: true
        }])
      } catch (err) {
        toast.error(err.message)
        setSqlMessages(prev => [...prev, {
          role: 'assistant',
          content: "Sorry, I couldn't compile that into SQL. Try something like 'Show top 5 customers' or check your schema names.",
          isSql: true
        }])
      } finally {
        setIsTyping(false)
        inputRef.current?.focus()
      }
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const activeMessages = activeMode === 'chat' ? messages : sqlMessages

  const filteredColumns = columns.filter(col => {
    if (!schemaSearch) return true
    return col.toLowerCase().includes(schemaSearch.toLowerCase())
  })

  if (!filename) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <AlertCircle className="w-12 h-12 text-slate-600" />
      <p className="text-slate-500">No dataset loaded. <button onClick={() => navigate('/upload')} className="text-brand-400 hover:underline">Upload first</button></p>
    </div>
  )

  return (
    <div className={`flex flex-col h-[calc(100vh-140px)] w-full mx-auto transition-all duration-500 ${
      activeMode === 'sql' ? 'max-w-6xl' : 'max-w-3xl'
    }`}>
      
      {/* Workspace Level Mode Switcher */}
      <div className="flex justify-center mb-5 shrink-0">
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 p-1 rounded-full flex items-center gap-1 shadow-lg relative select-none">
          <button
            id="mode-toggle-chat"
            onClick={() => setActiveMode('chat')}
            className={`px-5 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 relative z-10 ${
              activeMode === 'chat' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            AI Analyst Chat
          </button>
          <button
            id="mode-toggle-sql"
            onClick={() => setActiveMode('sql')}
            className={`px-5 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 relative z-10 ${
              activeMode === 'sql' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            SQL Query Generator
          </button>
          {/* Slider Highlight */}
          <div
            className="absolute top-1 bottom-1 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 shadow-[0_0_12px_rgba(99,102,241,0.35)] transition-all duration-300 ease-out"
            style={{
              left: activeMode === 'chat' ? '4px' : 'calc(50% + 1px)',
              width: 'calc(50% - 5px)',
            }}
          />
        </div>
      </div>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden">
        
        {/* Left Side: Schema Inspector Sidebar (SQL Mode only) */}
        {activeMode === 'sql' && (
          <div className="w-full lg:w-72 flex flex-col glass-card border-indigo-500/10 p-4 shrink-0 overflow-hidden max-h-[40vh] lg:max-h-full animate-slide-in select-none">
            <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-slate-800/60">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
                <Code className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest leading-none">Table Reference</div>
                <div className="text-xs text-white font-mono font-bold truncate mt-0.5">{getGuessedTableName()}</div>
              </div>
              <span className="ml-auto text-[9px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono">
                {columns.length} columns
              </span>
            </div>

            {/* Column Search Bar */}
            <div className="relative mb-3 shrink-0">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Filter fields..."
                value={schemaSearch}
                onChange={e => setSchemaSearch(e.target.value)}
                className="w-full bg-slate-950/40 border border-slate-800 rounded-lg py-2 pl-9 pr-3 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/40 transition-all font-mono"
              />
            </div>

            {/* Column List */}
            <div className="space-y-1.5 overflow-y-auto pr-1 flex-1 min-h-0">
              {filteredColumns.map(col => {
                const typeInfo = getColIconAndType(col)
                return (
                  <div
                    key={col}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-900/15 border border-slate-850 hover:bg-slate-900/30 hover:border-slate-800 transition-all group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {typeInfo.icon}
                      <span className="text-[11px] font-mono text-slate-300 font-semibold truncate group-hover:text-white transition-all">
                        {col}
                      </span>
                    </div>
                    <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border tracking-wider uppercase shrink-0 font-medium ${typeInfo.badgeClass}`}>
                      {typeInfo.label}
                    </span>
                  </div>
                )
              })}
              {filteredColumns.length === 0 && (
                <div className="text-center py-6 text-xs text-slate-500">No columns match filter</div>
              )}
            </div>
          </div>
        )}

        {/* Right Side: Chat Window Workspace */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Chat header */}
          <div className="glass-card p-4 mb-4 flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-white font-semibold text-sm">
                  {activeMode === 'chat' ? 'InsightForge Analyst' : 'DataPilot SQL Translator'}
                </div>
                <div className="text-xs text-emerald-400 flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Context active · {filename}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                if (activeMode === 'chat') {
                  setMessages([messages[0]])
                } else {
                  setSqlMessages([sqlMessages[0]])
                }
              }}
              className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear History
            </button>
          </div>

          {/* Messages Scroller */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 px-1 pr-2 min-h-0">
            {activeMessages.map((msg, i) => {
              if (msg.sql) {
                return <SQLQueryCard key={i} sql={msg.sql} explanation={msg.explanation} />
              }
              return <Message key={i} msg={msg} />
            })}
            {isTyping && (
              <div className="flex gap-3 animate-fade-in select-none">
                <div className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>
                  <Bot className="w-4 h-4 text-brand-400" />
                </div>
                <div className="chat-bubble-bot flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
                  <span className="text-slate-400 text-xs font-semibold">
                    {activeMode === 'chat' ? 'Analyzing dataset correlations...' : 'Compiling ANSI SQL dialect...'}
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions Tray */}
          {activeMessages.length <= 2 && (
            <div className="flex flex-wrap gap-2 mb-3 shrink-0 select-none">
              {(activeMode === 'chat' ? SUGGESTIONS : SQL_SUGGESTIONS).map(s => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-[11px] px-3 py-1.5 rounded-lg text-slate-400 hover:text-white transition-all text-left bg-slate-900/30 border border-slate-800/80 hover:border-indigo-500/30"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input field area */}
          <div className="flex gap-3 items-end shrink-0">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={
                  activeMode === 'chat'
                    ? 'Ask about correlations, metrics, and trends...'
                    : `Ask for a query (e.g. "Show top 5 customers") or type here...`
                }
                rows={1}
                className="input-field resize-none pr-12 text-sm"
                style={{ minHeight: 48, maxHeight: 120, overflowY: 'auto' }}
              />
            </div>
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isTyping}
              className="w-12 h-12 rounded-xl flex items-center justify-center transition-all disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
            >
              <Send className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
