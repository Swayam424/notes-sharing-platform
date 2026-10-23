import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Bot, Sparkles, Send, RefreshCw, Compass,
  ArrowRight, ShieldCheck, CheckCircle2, Lightbulb
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api, type ChatAction, type ChatResponseData } from '../services/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  guardrailTriggered?: boolean;
  suggestions?: string[];
  actions?: ChatAction[];
}

const INITIAL_PROMPTS = [
  {
    category: 'Academic Doubts',
    icon: Lightbulb,
    items: [
      'Explain LRU Page Replacement in Operating Systems',
      'Explain Database Normalization (1NF, 2NF, 3NF, BCNF)',
      'What is the difference between TCP and UDP with examples?',
    ]
  },
  {
    category: 'Atelier Discovery',
    icon: Compass,
    items: [
      'Which notes cover Operating Systems Unit 3?',
      'Where can I find past year exam question papers (PYQs)?',
      'Show me how to save and download notes for offline study',
    ]
  }
];

export default function StudyAssistant() {
  const { user } = useApp();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const historyPayload = messages.slice(-6).map(m => ({
        role: m.role,
        content: m.content
      }));

      const res: ChatResponseData = await api.sendChatMessage(query, historyPayload);

      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        guardrailTriggered: res.guardrailTriggered,
        suggestions: res.suggestions,
        actions: res.actions
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err: any) {
      const errorMessage: Message = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: "I encountered a problem connecting to the study assistant. Please check that the server is running and try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: ['Retry query', 'Browse Notes Library'],
        actions: [{ label: 'Go to Notes', to: '/notes' }]
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    inputRef.current?.focus();
  };

  // Helper to render markdown text with internal links and formatting
  const renderFormattedContent = (content: string) => {
    // Split into paragraphs / lines
    const lines = content.split('\n');

    return (
      <div className="assistant-rendered-body">
        {lines.map((line, idx) => {
          // Check for headers
          if (line.startsWith('### ')) {
            return <h4 key={idx} className="assistant-h3">{line.replace('### ', '')}</h4>;
          }
          if (line.startsWith('## ')) {
            return <h3 key={idx} className="assistant-h2">{line.replace('## ', '')}</h3>;
          }
          if (line.startsWith('# ')) {
            return <h2 key={idx} className="assistant-h1">{line.replace('# ', '')}</h2>;
          }

          // Bullet points
          if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
            const bulletText = line.trim().substring(2);
            return (
              <div key={idx} className="assistant-bullet-row">
                <span className="assistant-bullet-dot">•</span>
                <span>{renderInlineTokens(bulletText)}</span>
              </div>
            );
          }

          // Empty line
          if (!line.trim()) {
            return <div key={idx} style={{ height: '8px' }} />;
          }

          return <p key={idx} className="assistant-paragraph">{renderInlineTokens(line)}</p>;
        })}
      </div>
    );
  };

  // Helper to render bold text, inline code, and markdown links
  const renderInlineTokens = (text: string) => {
    // Regex matches [Link Text](url) OR **bold** OR `code`
    const parts = [];
    let remaining = text;
    let keyIdx = 0;

    // Simple parser for standard markdown tokens
    const tokenRegex = /(\[.*?\]\(.*?\)|\*\*.*?\*\*|`.*?`)/;

    while (remaining.length > 0) {
      const match = remaining.match(tokenRegex);
      if (!match || match.index === undefined) {
        parts.push(<span key={keyIdx++}>{remaining}</span>);
        break;
      }

      if (match.index > 0) {
        parts.push(<span key={keyIdx++}>{remaining.substring(0, match.index)}</span>);
      }

      const matchText = match[0];

      // Case 1: Markdown Link [Label](url)
      if (matchText.startsWith('[') && matchText.includes('](')) {
        const label = matchText.substring(1, matchText.indexOf(']('));
        const url = matchText.substring(matchText.indexOf('](') + 2, matchText.length - 1);

        if (url.startsWith('/')) {
          parts.push(
            <button
              key={keyIdx++}
              type="button"
              className="assistant-inline-link"
              onClick={() => navigate(url)}
            >
              {label} <ArrowRight size={11} style={{ display: 'inline', marginLeft: 2 }} />
            </button>
          );
        } else {
          parts.push(
            <a key={keyIdx++} href={url} target="_blank" rel="noopener noreferrer" className="assistant-inline-link">
              {label}
            </a>
          );
        }
      }
      // Case 2: Bold **text**
      else if (matchText.startsWith('**') && matchText.endsWith('**')) {
        parts.push(<strong key={keyIdx++}>{matchText.slice(2, -2)}</strong>);
      }
      // Case 3: Code `code`
      else if (matchText.startsWith('`') && matchText.endsWith('`')) {
        parts.push(<code key={keyIdx++} className="assistant-inline-code">{matchText.slice(1, -1)}</code>);
      } else {
        parts.push(<span key={keyIdx++}>{matchText}</span>);
      }

      remaining = remaining.substring(match.index + matchText.length);
    }

    return parts;
  };

  return (
    <div className="assistant-workspace">
      {/* Top Banner / Studio Header */}
      <header className="assistant-header">
        <div className="assistant-header-left">
          <div className="assistant-avatar-glow">
            <Bot size={22} strokeWidth={1.8} />
          </div>
          <div>
            <div className="assistant-title-row">
              <h1 className="assistant-title">Study Assistant</h1>
              <span className="assistant-badge-gemini">
                <Sparkles size={12} /> Gemini Powered
              </span>
              <span className="assistant-badge-guardrail">
                <ShieldCheck size={12} /> Guardrails Active
              </span>
            </div>
            <p className="assistant-subtitle">
              Syllabus-grounded tutor for doubts, lecture notes discovery, and exam preparation.
            </p>
          </div>
        </div>

        <div className="assistant-header-actions">
          {messages.length > 0 && (
            <button
              type="button"
              className="assistant-btn-secondary"
              onClick={handleClearChat}
              title="Start a new chat session"
            >
              <RefreshCw size={14} />
              <span>New Session</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Conversation Stream */}
      <div className="assistant-messages-container">
        {messages.length === 0 ? (
          <div className="assistant-welcome-view">
            <div className="assistant-welcome-card">
              <div className="assistant-welcome-icon">
                <Sparkles size={32} />
              </div>
              <h2 className="assistant-welcome-heading">
                Welcome back, {user?.name || 'Scholar'}!
              </h2>
              <p className="assistant-welcome-subtext">
                Ask me any academic doubt from your semester syllabus, request lecture notes,
                or get step-by-step concept explanations with real-world analogies.
              </p>

              {/* Guardrail badge */}
              <div className="assistant-guardrail-banner">
                <ShieldCheck size={15} style={{ color: 'var(--color-secondary)' }} />
                <span>
                  <strong>Strict Academic Scope:</strong> Configured to solve academic coursework,
                  curriculum questions, and guide your studies on Atelier.
                </span>
              </div>
            </div>

            {/* Quick-Starter Prompt Cards */}
            <div className="assistant-prompt-grid">
              {INITIAL_PROMPTS.map((group, gIdx) => (
                <div key={gIdx} className="assistant-prompt-column">
                  <div className="assistant-prompt-cat">
                    <group.icon size={15} />
                    <span>{group.category}</span>
                  </div>
                  <div className="assistant-prompt-list">
                    {group.items.map((prompt, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        className="assistant-prompt-chip"
                        onClick={() => handleSend(prompt)}
                      >
                        <span>{prompt}</span>
                        <ArrowRight size={13} className="assistant-prompt-arrow" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="assistant-message-list">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`assistant-message-row ${msg.role === 'user' ? 'user-row' : 'bot-row'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="assistant-avatar-pill">
                    <Bot size={17} />
                  </div>
                )}

                <div className={`assistant-bubble ${msg.role === 'user' ? 'user-bubble' : 'bot-bubble'}`}>
                  {/* Guardrail Warning Banner */}
                  {msg.guardrailTriggered && (
                    <div className="assistant-guardrail-notice">
                      <ShieldCheck size={14} />
                      <span>Academic Guardrail Triggered</span>
                    </div>
                  )}

                  {/* Body Content */}
                  {renderFormattedContent(msg.content)}

                  {/* Action Direct Buttons */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="assistant-actions-bar">
                      <div className="assistant-actions-label">
                        <CheckCircle2 size={12} /> Suggested Action:
                      </div>
                      <div className="assistant-actions-list">
                        {msg.actions.map((action, aIdx) => (
                          <button
                            key={aIdx}
                            type="button"
                            className="assistant-action-btn"
                            onClick={() => navigate(action.to)}
                          >
                            <span>{action.label}</span>
                            <ArrowRight size={12} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Followup Suggestions */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="assistant-suggestions-bar">
                      <span className="assistant-suggestions-title">Follow-up:</span>
                      {msg.suggestions.map((sug, sIdx) => (
                        <button
                          key={sIdx}
                          type="button"
                          className="assistant-suggestion-pill"
                          onClick={() => handleSend(sug)}
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="assistant-message-time">{msg.timestamp}</div>
                </div>

                {msg.role === 'user' && (
                  <div className="assistant-user-avatar">
                    {user?.initials || 'ME'}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="assistant-message-row bot-row">
                <div className="assistant-avatar-pill">
                  <Bot size={17} />
                </div>
                <div className="assistant-bubble bot-bubble loading-bubble">
                  <div className="assistant-thinking-indicator">
                    <span className="dot dot-1" />
                    <span className="dot dot-2" />
                    <span className="dot dot-3" />
                  </div>
                  <span className="assistant-thinking-text">
                    Consulting syllabus & generating academic explanation…
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Bar & Controls */}
      <footer className="assistant-input-footer">
        <div className="assistant-input-wrapper">
          <textarea
            ref={inputRef}
            className="assistant-textarea"
            placeholder="Ask an academic doubt, concept question, or ask for notes..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            maxLength={3000}
            disabled={loading}
          />
          <button
            type="button"
            className="assistant-send-btn"
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            aria-label="Send query"
          >
            <Send size={16} />
          </button>
        </div>

        <div className="assistant-footer-meta">
          <span>Press <strong>Enter</strong> to send, <strong>Shift + Enter</strong> for new line</span>
          <span>Syllabus-aware AI • Atelier Academic Guardrails</span>
        </div>
      </footer>
    </div>
  );
}
