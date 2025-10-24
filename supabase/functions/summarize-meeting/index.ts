import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface MeetingData {
  date: string;
  sections: Record<string, string>;
  issues: Array<{
    issue: string;
    priority: string;
    owner: string;
    status: string;
  }>;
  rocks?: Array<{
    title: string;
    owner: string;
    status: string;
  }>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { meetingData }: { meetingData: MeetingData } = await req.json();

    let meetingContent = `Meeting Date: ${meetingData.date}\n\n`;

    const sectionTitles: Record<string, string> = {
      segue: "Segue (Good News)",
      scorecard: "Scorecard Review",
      rockReview: "Rock Review",
      customerEmployee: "Customer/Employee Headlines",
      todo: "To-Do List",
      ids: "Issues Discussion (IDS)",
      conclude: "Conclusion",
    };

    Object.entries(meetingData.sections).forEach(([key, notes]) => {
      if (notes && notes.trim()) {
        const title = sectionTitles[key] || key;
        meetingContent += `${title}:\n${notes}\n\n`;
      }
    });

    if (meetingData.issues && meetingData.issues.length > 0) {
      meetingContent += "Issues Tracked:\n";
      meetingData.issues.forEach((issue) => {
        meetingContent += `- [${issue.priority.toUpperCase()}] ${issue.issue} (Owner: ${issue.owner}, Status: ${issue.status})\n`;
      });
      meetingContent += "\n";
    }

    if (meetingData.rocks && meetingData.rocks.length > 0) {
      meetingContent += "Rocks Status:\n";
      meetingData.rocks.forEach((rock) => {
        meetingContent += `- ${rock.title} (Owner: ${rock.owner}, Status: ${rock.status})\n`;
      });
      meetingContent += "\n";
    }

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({
          summary: generateBasicSummary(meetingData),
          isAiGenerated: false,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a professional meeting assistant. Summarize the L10 (Level 10) EOS meeting notes into a concise, actionable executive summary. Focus on key decisions, action items, priorities, and outcomes. Use clear, professional language. Format the summary with clear sections and bullet points where appropriate.",
          },
          {
            role: "user",
            content: `Please summarize this L10 meeting:\n\n${meetingContent}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      console.error("OpenAI API error:", await response.text());
      return new Response(
        JSON.stringify({
          summary: generateBasicSummary(meetingData),
          isAiGenerated: false,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const data = await response.json();
    const aiSummary = data.choices[0].message.content;

    return new Response(
      JSON.stringify({
        summary: aiSummary,
        isAiGenerated: true,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error generating summary:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to generate summary",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

function generateBasicSummary(meetingData: MeetingData): string {
  let summary = `L10 Meeting Summary - ${meetingData.date}\n\n`;

  const sectionTitles: Record<string, string> = {
    segue: "Segue (Good News)",
    scorecard: "Scorecard Review",
    rockReview: "Rock Review",
    customerEmployee: "Customer/Employee Headlines",
    todo: "To-Do List",
    ids: "Issues Discussion",
    conclude: "Conclusion",
  };

  Object.entries(meetingData.sections).forEach(([key, notes]) => {
    if (notes && notes.trim()) {
      const title = sectionTitles[key] || key;
      summary += `${title}:\n${notes}\n\n`;
    }
  });

  if (meetingData.issues && meetingData.issues.length > 0) {
    summary += "Issues:\n";
    meetingData.issues.forEach((issue) => {
      summary += `- [${issue.priority.toUpperCase()}] ${issue.issue} (${issue.owner}) - ${issue.status}\n`;
    });
    summary += "\n";
  }

  if (meetingData.rocks && meetingData.rocks.length > 0) {
    summary += "Rocks:\n";
    meetingData.rocks.forEach((rock) => {
      summary += `- ${rock.title} (${rock.owner}) - ${rock.status}\n`;
    });
  }

  return summary;
}
