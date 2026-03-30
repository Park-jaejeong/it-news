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
    return {
      summary: "Gemini API 키가 설정되지 않았습니다. 사이드바에서 키를 입력해 주세요.",
      category: "알림",
      keywords: ["API_KEY_MISSING"]
    };
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

