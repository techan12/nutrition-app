export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const apiKey = process.env.GEMINI_API_KEY;
    const { foodText, portionSize, historyContext, imageData, isSummary } = req.body;

    // AIへの指示（プロンプト）の構築
    let systemPrompt = `あなたは臨床栄養学に基づいたプロの管理栄養士です。
    ユーザーの食事を分析し、HTML形式でアドバイスを返してください。
    
    【ルール】
    1. HTMLタグのみを出力し、挨拶や \`\`\`html 等の記号は含めないでください。
    2. 画像がある場合は、画像内の料理名と分量を推測して解析してください。
    3. ポーションサイズ（${portionSize || 'ふつう'}）を考慮してカロリーを推定してください。
    4. 過去の履歴（${historyContext || 'なし'}）を読み取り、1日のトータルバランスを踏まえたアドバイスをしてください。
    5. 過剰摂取気味な場合は、ユーモアを交えて「半分残す」「◯km走る」などの具体的な回避策を提案してください。`;

    if (isSummary) {
        systemPrompt += `\n今回は「1日の総評」です。今日の全履歴を振り返り、100点満点でのスコア、良かった点、改善点を熱く語ってください。`;
    }

    // Gemini APIに送るコンテンツの構築
    const contents = [{
        parts: [{ text: `${systemPrompt}\n入力内容: ${foodText || '料理を見て分析してください'}` }]
    }];

    // 画像データがある場合は追加
    if (imageData) {
        contents[0].parts.push({
            inline_data: {
                mime_type: "image/jpeg",
                data: imageData // Base64文字列
            }
        });
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents })
        });

        const data = await response.json();
        let html = data.candidates[0].content.parts[0].text;
        html = html.replace(/```html/g, '').replace(/```/g, '');

        res.status(200).json({ html });
    } catch (error) {
        res.status(500).json({ error: '解析失敗' });
    }
}
