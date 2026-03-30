import Parser from 'rss-parser';

const parser = new Parser();
const CORS_PROXY = 'https://corsproxy.io/?url='; // More reliable and origin-agnostic CORS proxy

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
  // AI(의료) - Google News (강력 추천)
  { name: '의료 AI 소식(국내)', url: 'https://news.google.com/rss/search?q=의료+AI+OR+AI+진단+OR+디지털헬스케어&hl=ko&gl=KR&ceid=KR:ko', defaultCategory: 'AI(의료)' },
  { name: 'Medical AI News(EN)', url: 'https://news.google.com/rss/search?q=medical+AI+korea+OR+healthcare+AI&hl=en-KR&gl=KR&ceid=KR:en', defaultCategory: 'AI(의료)' },
  
  // AI - Google News
  { name: 'AI 최신 소식(국내)', url: 'https://news.google.com/rss/search?q=인공지능+OR+ChatGPT+OR+LLM&hl=ko&gl=KR&ceid=KR:ko', defaultCategory: 'AI' },
  { name: 'AI World News(EN)', url: 'https://news.google.com/rss/search?q=artificial+intelligence+OR+generative+AI&hl=en-US&gl=US&ceid=US:en', defaultCategory: 'AI' },

  // 기존 전문지 중 안정적인 피드 유지
  { name: '청년의사 헬스IT', url: 'https://www.docdocdoc.co.kr/rss/S1N44.xml', defaultCategory: 'AI(의료)' },
  { name: '메디게이트', url: 'https://www.medigatenews.com/rss/news/all', defaultCategory: 'AI(의료)' },
  { name: 'Healthcare IT News', url: 'https://www.healthcareitnews.com/rss', defaultCategory: 'AI(의료)' },
  { name: 'MIT Tech Review AI', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed/', defaultCategory: 'AI' },
  
  // 일반 IT 및 스타트업
  { name: '전자신문(IT)', url: 'https://www.etnews.com/news/rss/it', defaultCategory: '일반' },
  { name: '지디넷코리아', url: 'http://feeds.feedburner.com/zdkorea', defaultCategory: '일반' }
];

const classifyArticle = (title: string, content: string, sourceDefault?: string): string => {
  const text = (title + ' ' + content).toLowerCase();
  
  const medicalKeywords = [
    '의료', '병원', '헬스케어', '진단', '수술', '환자', '의사', '치료', '신약', '제약', '임상', '바이오',
    'medical', 'health', 'hospital', 'doctor', 'clinical', 'disease', 'diagnosis', 'therapy', 'biotech'
  ];
  
  const aiKeywords = [
    'ai', '인공지능', 'intelligence', 'chatgpt', 'gemini', 'llm', '학습', '딥러닝', '머신러닝', '알고리즘', '모델',
    'openai', 'anthropic', 'nvidia', 'hbm', 'robot', 'agent'
  ];

  const hasMedical = medicalKeywords.some(kw => text.includes(kw));
  const hasAI = aiKeywords.some(kw => text.includes(kw));

  // 1. 소스 자체가 AI(의료) 전문이면 우선적으로 AI(의료)
  if (sourceDefault === 'AI(의료)' && (hasAI || hasMedical)) return 'AI(의료)';
  
  // 2. 내용상 의료와 AI가 결합되면 AI(의료)
  if (hasMedical && hasAI) return 'AI(의료)';
  
  // 3. AI 관련 소스이거나 AI 내용이면 AI
  if (hasAI || sourceDefault === 'AI') return 'AI';
  
  // 4. 기타 카테고리
  if (text.includes('반도체') || text.includes('hbm') || text.includes('nvidia') || text.includes('samsung')) return '반도체';
  if (text.includes('보안') || text.includes('security')) return '보안';
  if (text.includes('스타트업') || text.includes('startup')) return '스타트업';
  
  return sourceDefault || '일반';
};

export const fetchLatestNews = async (): Promise<Article[]> => {
  let allArticles: Article[] = [];

  const fetchPromises = SOURCES.map(async (source) => {
    try {
      // CORS 프록시 대체 시도 로직
      let response;
      try {
        response = await parser.parseURL(CORS_PROXY + encodeURIComponent(source.url));
      } catch (e) {
        // 백업 프록시 사용 (Allorigins)
        const BACKUP_PROXY = 'https://api.allorigins.win/get?url=';
        const proxyResponse = await fetch(BACKUP_PROXY + encodeURIComponent(source.url));
        const data = await proxyResponse.json();
        response = await parser.parseString(data.contents);
      }

      return response.items.slice(0, 50).map(item => {
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
      console.warn(`Error fetching from ${source.name}:`, error);
      return [];
    }
  });

  const results = await Promise.all(fetchPromises);
  allArticles = results.flat();

  // 중복 제거 및 관심 주제 필터링
  const uniqueArticles = Array.from(new Map(allArticles.map(a => [a.link, a])).values());
  const aiMedical = uniqueArticles.filter(a => a.category === 'AI(의료)');
  const aiGeneral = uniqueArticles.filter(a => a.category === 'AI');
  const others = uniqueArticles.filter(a => a.category !== 'AI' && a.category !== 'AI(의료)');

  // 1. 최소 10건 확보 및 50:50 비율 유지 로직
  // 충분한 데이터가 확보될 수 있도록 대상 수량을 15~20건으로 상향 조정
  const minCountEach = 12;
  const targetPerCategory = Math.max(minCountEach, Math.min(aiMedical.length, aiGeneral.length, 30));
  
  const balancedAI = aiGeneral.slice(0, targetPerCategory);
  const balancedMedical = aiMedical.slice(0, targetPerCategory);
  const interestingNews = [...balancedMedical, ...balancedAI];

  // 2. 전체 뉴스 대비 80% 비중 강제 (기타 기사 수 제한)
  // (관심 주제 수 / 0.8) * 0.2 = 기타 기사 허용 수
  const maxOthers = Math.floor((interestingNews.length / 0.8) * 0.2);
  const filteredOthers = others.slice(0, Math.max(maxOthers, 2)); // 최소 수량 2건 보장

  const finalResult = [...interestingNews, ...filteredOthers];

  // 최신순 정렬
  return finalResult.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
};

