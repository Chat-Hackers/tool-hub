import { z } from "zod";

const { summariser_url } = process.env;

export async function generateSummary(events: string) {
    return fetch(`${summariser_url}`, {
        method: "POST",
        body: JSON.stringify({
            model: "llm_auto-big",
            messages: [
                {
                    role: "user",
                    content: `I'm going to send a set of stripped down Matrix events 
            which I need you to summarise for an email digest. 
            Please return just the summary in simple html format (no styles) without a title or a markdown wrapper, 
            as this is going to go straight in an email. Put distinct events in different sections. 
            Use a netural tone. 
            ${events} `
                }
            ]
        }),
        headers: {
            "Content-Type": "application/json"
        }
    })
}

const ThemesSchema = z.object({
    themes: z.array(
        z.object({
            title: z.string(),
            summary: z.string(),
            prominence: z.enum(["major", "moderate", "minor"]),
        }),
    ),
});

const THEMES_PROMPT = `You summarise the main themes of a month of messages in a community group chat, for the group's organisers.

Describe topics, never people. Don't name, identify or characterise any participant, don't say who raised or cared about what, and don't quote messages. Speakers are labelled "Person N" only so you can tell conversations apart; don't mention those labels.

Give 3 to 6 themes, most prominent first. Each has a short title (at most six words), a one or two sentence summary of what was discussed or decided, and how prominent it was in the month. If the month was mostly logistics or small talk, say so as a theme rather than inventing substance. Write in plain British English. Respond with only a JSON object of the form {"themes":[{"title":string,"summary":string,"prominence":"major"|"moderate"|"minor"}]}. No markdown, no extra text.`;

export async function generateThemes(month: string, lines: string[]) {
    const response = await fetch(`${summariser_url}`, {
        method: "POST",
        body: JSON.stringify({
            model: "llm_auto-big",
            max_tokens: 16000,
            messages: [
                { role: "system", content: THEMES_PROMPT },
                {
                    role: "user",
                    content: `Messages from ${month}:\n\n${lines.join("\n")}`,
                },
            ],
        }),
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        throw new Error(
            `LLM request failed: ${response.status} ${await response.text()}`,
        );
    }

    const data = await response.json();
    const choice = data.choices[0];
    if (choice.finish_reason === "length") throw new Error("Output truncated");

    return ThemesSchema.parse(JSON.parse(choice.message.content ?? ""));
}
