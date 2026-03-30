import { GoogleGenerativeAI } from "@google/generative-ai";

export interface AIAnalysis {
  summary: string;
  category: string;
  keywords: string[];
}

export const processNewsWithAI = async (
  article: { title: string; content: string }, 
  userApiKey?: string
): Promise<AIAnalysis> => {
  const apiKey = userApiKey || import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    console.log("Using Local Analysis Fallback...");
    return localAnalyzeNews(article);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    console.log("Generating summary for:", article.title);

    const prompt = `
      너는 IT 및 의료 기술(HealthTech) 전문 기자이자 요약가야. 다음 뉴스 기사를 깊이 있게 분석해서 다음 JSON 구조로 응답해줘.
      JSON 응답 예시:
      {
        "summary": "핵심 내용 3문장 요약 (전문 용어는 한국어로 자연스럽게 번역)",
        "category": "AI | AI(의료) | 반도체 | 보안 | 클라우드 | 모바일 | 스타트업 중 하나",
        "keywords": ["키워드1", "키워드2", "키워드3"]
      }

      *분류 지침*:
      1. 기사가 AI 기술을 다루면서 동시에 병원, 진단, 신약, 수술 로봇, 헬스케어 기기 등 '의료'와 연관되면 반드시 "AI(의료)"로 분류해.
      2. 그 외의 일반적인 인공지능 기술은 "AI"로 분류해.
      3. 전문 지식이 필요한 의료 IT 용어는 독자가 이해하기 쉽게 풀어서 설명하거나 표준 한국어 의학 용어를 사용해줘.

      기사 제목: ${article.title}
      기사 내용: ${article.content}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log("AI Response:", text);
    
    // JSON parsing with robust regex
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error("JSON pattern not found in AI response");
    } catch (e) {
      console.error("JSON Parsing failed, attempting fallback:", e);
      // Fallback: try to extract summary if JSON parsing fails completely
      return {
        summary: text.substring(0, 300).replace(/[#*`{}]/g, '').trim(),
        category: "일반",
        keywords: ["AI_분석"]
      };
    }
  } catch (error) {
    console.error("AI Analysis error:", error);
    throw error;
  }
};

export const translateArticles = async (
  articles: { id: string; title: string }[],
  userApiKey: string
): Promise<{ id: string; translatedTitle: string }[]> => {
  if (!userApiKey || articles.length === 0) return [];

  try {
    const genAI = new GoogleGenerativeAI(userApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const titlesList = articles.map((a, i) => `${i + 1}. ${a.title}`).join('\n');
    const prompt = `
      다음 IT 뉴스 제목들을 자연스러운 한국어로 번역해줘. 
      원문의 전문적인 용어는 적절히 유지하되 한국인 IT 종사자가 읽기에 편한 문체로 번역해.
      결과는 반드시 JSON 배열 형태 ["번역1", "번역2", ...]로만 출력해.

      제목 목록:
      ${titlesList}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().replace(/```json|```/g, '').trim();
    
    try {
      const translatedList: string[] = JSON.parse(text);
      return articles.map((a, i) => ({
        id: a.id,
        translatedTitle: translatedList[i] || a.title
      }));
    } catch (e) {
      console.error("Translation JSON parse failed:", e);
      return [];
    }
  } catch (error) {
    console.error("Translation error:", error);
    return [];
  }
};

/**
 * 로컬 규칙 기반 뉴스 분석 (No-API Fallback)
 */
const localAnalyzeNews = (article: { title: string; content: string }): AIAnalysis => {
  const { title, content } = article;
  const fullText = `${title} ${content}`;

  // 1. 카테고리 결정 (newsService와 유사한 로직)
  let category = "일반";
  const categoryKeywords = {
    "AI(의료)": ["의료", "병원", "진단", "신약", "수술", "헬스케어", "HealthTech", "정밀의료"],
    "AI": ["AI", "인공지능", "LLM", "Deep Learning", "머신러닝", "ChatGPT", "Claude", "Gemini", "OpenAI"],
    "반도체": ["반도체", "칩", "NVIDIA", "삼성전자", "SK하이닉스", "TSMC", "Intel", "GPU", "HBM"],
    "보안": ["보안", "해킹", "사이버", "취약점", "랜섬웨어", "제로트러스트", "보안관제"],
    "클라우드": ["클라우드", "AWS", "Azure", "GCP", "서버", "인프라", "SaaS", "PaaS"],
    "모바일": ["스마트폰", "아이폰", "갤럭시", "안드로이드", "iOS", "통신", "5G", "6G"],
    "스타트업": ["스타트업", "투자", "유니콘", "시리즈", "VC", "창업", "투자유치"]
  };

  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(k => fullText.toLowerCase().includes(k.toLowerCase()))) {
      category = cat;
      break;
    }
  }

  // 2. 요약 생성 (첫 2~3문장 추출)
  const sentences = content.split(/[.!?]\s/).filter(s => s.trim().length > 10);
  let summary = sentences.slice(0, 3).join(". ") + (sentences.length > 3 ? "..." : ".");
  
  if (summary.length < 20) {
    summary = title;
  }

  // 3. 키워드 추출 (제목 및 본문에서 빈도수 높은 단어)
  const commonKeywords = ["기능", "출시", "개발", "강화", "지원", "시스템", "기술", "서비스", "기업", "내년", "올해"];
  const allWords = fullText.split(/\s+/);
  const detectedKeywords = new Set<string>();
  
  // 카테고리 관련 키워드 우선 추가
  if (categoryKeywords[category as keyof typeof categoryKeywords]) {
    categoryKeywords[category as keyof typeof categoryKeywords].slice(0, 2).forEach(k => detectedKeywords.add(k));
  }

  // 일반 명사 추출 (간단히)
  allWords.forEach(word => {
    if (word.length >= 2 && !commonKeywords.includes(word)) {
      if (detectedKeywords.size < 5 && Math.random() > 0.8) {
        detectedKeywords.add(word.replace(/[.,!?]/g, ''));
      }
    }
  });

  return {
    summary,
    category,
    keywords: Array.from(detectedKeywords).slice(0, 5)
  };
};

