import Parser from 'rss-parser';

const parser = new Parser();
const isLocal = window.location.hostname === 'localhost';

const PROXIES = isLocal 
  ? [
      'https://corsproxy.io/?url=',
      'https://api.codetabs.com/v1/proxy?quest=',
    ]
  : [
      '/api/news-proxy?url=',
      'https://corsproxy.io/?url=',
    ];

export interface Article {
  id: string;
  title: string;
  link: string;
  content: string;
  pubDate: string;
  creator: string;
  summary?: string;
  category?: string;
  keywords?: string[];
  isScrapped: boolean;
  isLoadingAI?: boolean;
  error?: string;
}

const SOURCES = [
  // AI(의료) - Google News
  { name: '의료 AI 소식(국내)', url: 'https://news.google.com/rss/search?q=의료+AI+OR+AI+진단+OR+디지털헬스케어&hl=ko&gl=KR&ceid=KR:ko', defaultCategory: 'AI(의료)' },
  { name: 'Medical AI News(EN)', url: 'https://news.google.com/rss/search?q=medical+AI+korea+OR+healthcare+AI&hl=en-KR&gl=KR&ceid=KR:en', defaultCategory: 'AI(의료)' },
  
  // AI - Google News
  { name: 'AI 최신 소식(국내)', url: 'https://news.google.com/rss/search?q=인공지능+OR+ChatGPT+OR+LLM&hl=ko&gl=KR&ceid=KR:ko', defaultCategory: 'AI' },
  { name: 'AI World News(EN)', url: 'https://news.google.com/rss/search?q=artificial+intelligence+OR+generative+AI&hl=en-US&gl=US&ceid=US:en', defaultCategory: 'AI' },

  // IT 전문지 및 뉴스
  { name: 'The AI', url: 'https://www.theai.kr/rss/all.xml', defaultCategory: 'AI' },
  { name: '청년의사 헬스IT', url: 'https://www.docdocdoc.co.kr/rss/S1N44.xml', defaultCategory: 'AI(의료)' },
  { name: 'Healthcare IT News', url: 'https://www.healthcareitnews.com/rss', defaultCategory: 'AI(의료)' },
  { name: 'MIT Tech Review AI', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed/', defaultCategory: 'AI' },
  
  // 일반 IT 및 스타트업
  { name: '지디넷코리아', url: 'http://feeds.feedburner.com/zdkorea', defaultCategory: '일반' }
];

const classifyArticle = (title: string, content: string, sourceDefault?: string): string => {
  const text = (title + ' ' + content).toLowerCase();
  
  const medicalKeywords = [
    '의료', '병원', '헬스케어', '진단', '수술', '환자', '의사', '치료', '신약', '제약', '임상', '바이오', '식약처',
    'medical', 'health', 'hospital', 'doctor', 'clinical', 'disease', 'diagnosis', 'therapy', 'biotech'
  ];
  
  const aiKeywords = [
    'ai', '인공지능', 'intelligence', 'chatgpt', 'gemini', 'llm', '학습', '딥러닝', '머신러닝', '알고리즘', '모델',
    'openai', 'anthropic', 'nvidia', 'hbm', 'robot', 'agent', 'gpu', '반도체'
  ];

  const hasMedical = medicalKeywords.some(kw => text.includes(kw));
  const hasAI = aiKeywords.some(kw => text.includes(kw));

  if (sourceDefault === 'AI(의료)' && (hasAI || hasMedical)) return 'AI(의료)';
  if (hasMedical && hasAI) return 'AI(의료)';
  if (hasAI || sourceDefault === 'AI') return 'AI';
  
  if (text.includes('정부') || text.includes('정책')) return '정책';
  if (text.includes('스타트업') || text.includes('startup')) return '스타트업';
  
  return sourceDefault || '일반';
};

const fetchWithRetry = async (url: string) => {
  for (const proxy of PROXIES) {
    try {
      const targetUrl = proxy + encodeURIComponent(url);
      const response = await parser.parseURL(targetUrl);
      if (response && response.items) return response;
    } catch (e) {
      console.warn(`Proxy ${proxy} failed, trying next...`);
      continue;
    }
  }
  
  // All origins fallback (Special handling for JSON response)
  try {
    const allOriginsUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const res = await fetch(allOriginsUrl);
    const data = await res.json();
    if (data && data.contents) {
      return await parser.parseString(data.contents);
    }
  } catch (e) {
    console.error('All fallback proxies failed for:', url);
  }
  
  return null;
};

export const fetchLatestNews = async (): Promise<Article[]> => {
  const fetchPromises = SOURCES.map(async (source) => {
    try {
      const response = await fetchWithRetry(source.url);
      if (!response || !response.items) return [];

      return response.items.slice(0, 30).map(item => {
        const title = item.title || 'Untitled';
        const content = (item.contentSnippet || item.content || '').substring(0, 1000);
        return {
          id: item.guid || item.link || Math.random().toString(),
          title: title,
          link: item.link || '#',
          content: content,
          pubDate: item.pubDate || new Date().toISOString(),
          creator: source.name,
          category: classifyArticle(title, content, source.defaultCategory),
          isScrapped: false
        } as Article;
      });
    } catch (error) {
      console.warn(`Error processing ${source.name}:`, error);
      return [];
    }
  });

  const results = await Promise.all(fetchPromises);
  const allArticles = results.flat();

  if (allArticles.length === 0) return [];

  const uniqueArticles = Array.from(new Map(allArticles.map(a => [a.link, a])).values());
  const aiMedical = uniqueArticles.filter(a => a.category === 'AI(의료)');
  const aiGeneral = uniqueArticles.filter(a => a.category === 'AI');
  const others = uniqueArticles.filter(a => a.category !== 'AI' && a.category !== 'AI(의료)');

  const minCountEach = 12;
  const targetPerCategory = Math.max(minCountEach, Math.min(aiMedical.length, aiGeneral.length, 30));
  
  const balancedAI = aiGeneral.slice(0, targetPerCategory);
  const balancedMedical = aiMedical.slice(0, targetPerCategory);
  const interestingNews = [...balancedMedical, ...balancedAI];

  const maxOthers = Math.floor((interestingNews.length / 0.8) * 0.2);
  const filteredOthers = others.slice(0, Math.max(maxOthers, 2)); 

  const finalResult = [...interestingNews, ...filteredOthers];

  return finalResult.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
};

