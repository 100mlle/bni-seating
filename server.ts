import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// API Endpoint for AI-powered KPI & Slide Analysis
app.post("/api/analyze-kpi", async (req, res) => {
  try {
    const {
      weekTitle,
      stage,
      committeeText,
      goals,
      members,
      summary,
    } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      return res.status(200).json({
        success: false,
        api_key_missing: true,
        message: "Gemini API key is missing. Please add your GEMINI_API_KEY in the Settings > Secrets panel to unlock the full AI Diagnostic and custom Speaking notes!",
      });
    }

    // Lazy load the GoogleGenAI instance to prevent crash on startup if key is bad
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const userPrompt = `
You are an expert BNI Vice President and executive Chapter Growth Coach. 
Analyze the following BNI Chapter stats and produce a structured advisory report.

CHAPTER DECK CONTEXT:
- Week Title: ${weekTitle}
- Management Stage: ${stage} (Stage Guidelines: stage1=Only reveal overall progress, do not name individuals. stage2=Celebrate winners publicly, keep underperformers private. stage3=Continuous underperformance gets private 1-on-1 membership committee help.)
- Committee Assignment: 
${committeeText}

- Chapter Core Targets:
  * Member Count: ${goals.memberTarget}
  * Weekly Visitors: ${goals.visitorTarget}
  * Submission of Applications: ${goals.applicationTarget}
  * 1-to-1 Meetings (121) Total: ${goals.oneToOneTarget}
  * Referral Slips Total: ${goals.referralTarget}
  * Absence Warning Threshold: ${goals.absenceWarningRate}%

- Chapter Actual This Week:
  * Total Members: ${summary.memberCount}
  * Actual Visitors: ${summary.visitors}
  * Total 1-to-1s (121) completed: ${summary.oneToOne}
  * Total Referrals submitted: ${summary.referrals}
  * Absent Members count: ${summary.absentCount}
  * Members on Leave count: ${summary.leaveCount}
  * Chapter Absence Rate: ${summary.absenceRate}%

- Detailed Member Lists:
${JSON.stringify(members, null, 2)}

TASK:
1. Evaluate Chapter Health Score (0-100) based on target vs. actual achievement.
2. Formulate a professional chapter Executive Summary analyzing this week's business activity, focusing on members' achievements and area for collaboration.
3. For members in the "RED" light (low 121 and low referrals) or who are Absent, provide constructive, positive mentoring recommendations (private action blueprint, no public shaming) grouped by their industry categories to see if power teams can help.
4. Analyze the Chapter's Power Team synergies (e.g. construction, marketing, wellness) and give strategic tips.
5. Generate speaking outlines or talking points (講稿) for each of the 12 slides. Make the scripts sound highly professional, encouraging, authoritative, and exactly in the language of a BNI chapter Vice President (using energetic, positive BNI culture terms such as "Givers Gain" 樂施者得, "coaching" 輔導, "referrals" 引薦, "support" 協助, "not blaming" 協助看見問題).
Each of the 12 slide scripts MUST speak specifically to the stats relevant to that slide:
   - Slide 1 (封面): Welcoming tone, setting the stage.
   - Slide 2 (本週總覽): High-level overview of membership, visitors, 121s, and referrals.
   - Slide 3 (目標達成率): Focus on overall goals, highlight success ratios.
   - Slide 4 (121/引薦單行動榜): Publicly congratulate the green members who solved KPIs.
   - Slide 5 (紅黃綠燈狀態分佈): Explain the distribution. Highlight that "Red is just a indicator that someone needs help, and our committee will private-massage them with training resources".
   - Slide 6 (出席率追蹤): Highlight stability and business presence.
   - Slide 7 (來賓到申請轉換漏斗): Talk about high-quality visitors, inviting visitors with intent.
   - Slide 8 (續約與關懷名單): Gentle upcoming renewal tracking, stressing support.
   - Slide 9 (會員委員會分工): Action assignments to the specialists (attendance, visitors, renewal, referrals).
   - Slide 10 (副主席建言): Wise, cultural advisory words. "Data is not blame, it's visibility".
   - Slide 11 (下週三件行動): List three vital tasks to boost production.
   - Slide 12 (結尾共識): Highly motivational call-to-action to leave a lasting impact.

Ensure that the response is returned in raw JSON conforming exactly to the responseSchema provided.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            chapterHealthScore: { 
              type: Type.INTEGER, 
              description: "A score from 0 to 100 representing Chapter health" 
            },
            executiveSummary: { 
              type: Type.STRING, 
              description: "Detailed analysis of chapter's metrics, highlights, and culture this week." 
            },
            coachingAdvice: {
              type: Type.ARRAY,
              description: "Mentor suggestions for members categorized as red or absent",
              items: {
                type: Type.OBJECT,
                properties: {
                   memberName: { type: Type.STRING },
                   category: { type: Type.STRING },
                   issue: { type: Type.STRING },
                   actionPlan: { type: Type.STRING, description: "A highly supportive private 1-to-1 action step, focused on connection and help." }
                },
                required: ["memberName", "category", "issue", "actionPlan"]
              }
            },
            powerTeamTraction: { 
              type: Type.STRING, 
              description: "Practical suggestions for building power teams in the chapter based on member categories." 
            },
            slideSpeakingNotes: {
              type: Type.ARRAY,
              description: "Array of exactly 12 strings, where element 0 is slide 1 script, element 1 is slide 2 script... up to slide 12.",
              items: {
                type: Type.STRING
              }
            },
            actionItems: {
              type: Type.ARRAY,
              description: "Array of exactly 3 crisp action points for next week",
              items: { type: Type.STRING }
            }
          },
          required: [
            "chapterHealthScore", 
            "executiveSummary", 
            "coachingAdvice", 
            "powerTeamTraction", 
            "slideSpeakingNotes", 
            "actionItems"
          ]
        }
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    return res.json({
      success: true,
      api_key_missing: false,
      data: parsedData
    });

  } catch (error: any) {
    console.error("Gemini API Error in server.ts:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error analyzing KPI data"
    });
  }
});

// Configure Vite or Static Assets serving based on environment
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
