import React, { useState, useEffect } from 'react';
import { LayoutDashboard, TrendingUp, Save, Check, Moon, Sun, RefreshCw, ChevronRight } from 'lucide-react';
import { fetchLatestNews } from './services/newsService';
import type { Article } from './services/newsService';
import { processNewsWithAI, translateArticles } from './services/aiService';
import TrendChart from './components/TrendChart';
import './App.css';

const App: React.FC = () => {
  const [news, setNews] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('전체');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'trends'>('dashboard');
  const [isKeySaved, setIsKeySaved] = useState(false);

  const categories = ['전체', 'AI', 'AI(의료)', '반도체', '보안', '클라우드', '모바일', '스타트업'];

  const loadNews = async () => {
    setIsLoading(true);
    setActiveCategory('전체');
    try {
      const latestNews = await fetchLatestNews();
      if (latestNews.length > 0) {
        setNews(latestNews);
        
        // Auto-translate titles if API Key is present
        const savedApiKey = localStorage.getItem('gemini_api_key');
        if (savedApiKey) {
          const translated = await translateArticles(
            latestNews.map(n => ({ id: n.id, title: n.title })),
            savedApiKey
          );
          
          if (translated.length > 0) {
            setNews(prev => prev.map(n => {
              const tr = translated.find(t => t.id === n.id);
              return tr ? { ...n, title: tr.translatedTitle } : n;
            }));
          }
        }
      }
    } catch (error) {
      console.error("Failed to load news:", error);
    } finally {
      setIsLoading(false);
    }
  };


  useEffect(() => {
    loadNews();
  }, []);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value);
    setIsKeySaved(false);
  };

  const handleSaveApiKey = () => {
    localStorage.setItem('gemini_api_key', apiKey);
    setIsKeySaved(true);
    setTimeout(() => setIsKeySaved(false), 3000);
  };

  const handleAIProcess = async (id: string) => {
    if (!apiKey) {
      alert("먼저 Gemini API 키를 입력해 주세요.");
      setShowKeyInput(true);
      return;
    }

    const article = news.find(n => n.id === id);
    if (!article || article.summary) return;

    // Update loading state for individual article
    setNews(prev => prev.map(n => n.id === id ? { ...n, isLoadingAI: true, error: undefined } : n));

    try {
      const processed = await processNewsWithAI({ 
        title: article.title, 
        content: article.content 
      }, apiKey);
      
      setNews(prev => prev.map(n => n.id === id ? { 
        ...n, 
        summary: processed.summary, 
        category: processed.category, 
        keywords: processed.keywords,
        isLoadingAI: false 
      } : n));
    } catch (error: any) {
      console.error("AI Processing failed:", error);
      const errorMessage = error.message?.includes('429') ? '요청 한도 초과(잠시 후 시도)' : 'API 호출 실패';
      setNews(prev => prev.map(n => n.id === id ? { 
        ...n, 
        isLoadingAI: false,
        error: errorMessage 
      } : n));
    }
  };

  const filteredNews = activeCategory === '전체' 
    ? news 
    : news.filter(n => n.category === activeCategory);

  return (
    <div className={`app-container ${isDarkMode ? 'dark' : 'light'}`}>
      {/* Sidebar - Neural Curator Style */}
      <aside className="sidebar glass">
        <div className="logo-section">
          <div className="logo-orb"></div>
          <h1 className="logo-text">뉴럴 큐레이터</h1>
        </div>

        <nav className="nav-menu">
          <div 
            className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveView('dashboard')}
          >
            <LayoutDashboard size={20} />
            <span>대시보드</span>
          </div>
          <div 
            className={`nav-item ${activeView === 'trends' ? 'active' : ''}`}
            onClick={() => setActiveView('trends')}
          >
            <TrendingUp size={20} />
            <span>트렌드 분석</span>
          </div>
          <div className="nav-item" onClick={() => setShowKeyInput(!showKeyInput)}>
            <Save size={20} />
            <span>API 설정</span>
          </div>
        </nav>

        {showKeyInput && (
          <div className="api-key-input-container">
            <div className="api-input-wrapper">
              <input 
                type="password" 
                placeholder="Gemini API 키 입력..." 
                value={apiKey}
                onChange={handleApiKeyChange}
                className="api-key-input"
              />
              <button 
                className={`api-save-btn ${isKeySaved ? 'saved' : ''}`}
                onClick={handleSaveApiKey}
                title="API 키 저장"
              >
                {isKeySaved ? <Check size={16} /> : <Save size={16} />}
                <span>{isKeySaved ? '저장됨' : '저장'}</span>
              </button>
            </div>
            <p className="api-hint">입력된 키는 브라우저 로컬 저장소에 저장됩니다.</p>
          </div>
        )}

        <div className="category-section">
          <h3>카테고리</h3>
          {categories.map(cat => (
            <button 
              key={cat} 
              className={`cat-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <button className="theme-toggle" onClick={() => setIsDarkMode(!isDarkMode)}>
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            <span>{isDarkMode ? '라이트 모드' : '다크 모드'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="main-header">
          <div className="header-info">
            <div className="date-badge">{new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}</div>
            <h2>{activeView === 'dashboard' ? '오늘의 IT 하이라이트' : '실시간 IT 트렌드 지표'}</h2>
          </div>
          {activeView === 'dashboard' && (
            <button className="refresh-btn" onClick={loadNews} disabled={isLoading}>
              <RefreshCw size={18} className={isLoading ? 'spinning' : ''} />
              <span>뉴스 새로고침</span>
            </button>
          )}
        </header>

        {activeView === 'dashboard' ? (
          <section className="news-grid">
            {isLoading && [1,2,3,4].map(i => (
              <div key={i} className="news-card skeleton" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="skeleton-title"></div>
                <div className="skeleton-text"></div>
              </div>
            ))}
            
            {!isLoading && filteredNews.length === 0 && (
              <div className="empty-state">
                <p>수집된 뉴스가 없습니다. 잠시 후 다시 시도해 주세요.</p>
              </div>
            )}

            {!isLoading && filteredNews.map((article, idx) => (
              <article 
                key={article.id} 
                className={`news-card ${idx === 0 ? 'hero' : ''}`}
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div className="card-header">
                  <div className="tag-group">
                    <span className="source-tag">{article.creator}</span>
                    {article.category && article.category !== '일반' && (
                      <span className="category-badge mini">{article.category}</span>
                    )}
                  </div>
                  <span className="date-tag">{new Date(article.pubDate).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                
                <h3 className="article-title">{article.title}</h3>
                
                {article.summary ? (
                  <div className="ai-summary">
                    <p>{article.summary}</p>
                    <div className="keywords">
                      {article.keywords?.map(kw => <span key={kw} className="kw-tag">#{kw}</span>)}
                    </div>
                  </div>
                ) : (
                  <div className="excerpt">
                    <p className="excerpt-label">주요 내용 요약...</p>
                    <p>{article.content.substring(0, 150).replace(/<[^>]*>?/gm, '')}...</p>
                    <div className="ai-controls">
                      <button 
                        className={`ai-process-btn ${article.error ? 'has-error' : ''}`}
                        onClick={() => handleAIProcess(article.id)}
                        disabled={article.isLoadingAI}
                      >
                        {article.isLoadingAI ? (
                          <><RefreshCw size={14} className="spinning" /> AI 분석 중...</>
                        ) : article.error ? (
                          <><RefreshCw size={14} /> 다시 시도</>
                        ) : (
                          'Gemini AI로 요약'
                        )}
                      </button>
                      {article.error && (
                        <span className="error-hint">{article.error}</span>
                      )}
                    </div>
                  </div>
                )}

                <footer className="card-footer">
                  <a href={article.link} target="_blank" rel="noopener noreferrer" className="read-more">
                    원문 읽기 <ChevronRight size={16} />
                  </a>
                </footer>
              </article>
            ))}
          </section>
        ) : (
          <section className="trends-section">
            <div className="trends-grid">
              <TrendChart news={news} />
              <div className="trends-insights glass">
                <h3>인사이트</h3>
                <p>AI로 요약된 기사가 풍부할수록 트렌드 분석의 정밀도가 향상됩니다.</p>
                <div className="insight-stat">
                  <span>총 뉴스 수:</span>
                  <strong>{news.length}개</strong>
                </div>
                <div className="insight-stat">
                  <span>AI 분석 완료:</span>
                  <strong>{news.filter(n => n.summary).length}개</strong>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default App;
