export default async function handler(req, res) {
    // POSTリクエスト以外は弾く
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const { foodText } = req.body;

    if (!foodText) {
        return res.status(400).json({ error: '入力がありません' });
    }

    // AI管理栄養士への強力なプロンプト（指示書）
    const prompt = `あなたは最新の臨床栄養学と生化学に精通したプロフェッショナルな管理栄養士です。
ユーザーが食べた以下の食事内容を分析し、HTML形式で出力してください。

食事内容: ${foodText}

出力のルール:
1. 以下のHTMLタグのみを出力し、マークダウンの \`\`\`html などの記号や余計な挨拶は絶対に含めないでください。
2. 具体的なマクロ栄養素・ミクロ栄養素を推測して挙げてください。
3. 食べ合わせの生化学的シナジーや、GI値コントロール、不足している栄養素のアドバイスをプロ視点で行ってください。

出力テンプレート:
<div class="nutrition-card" style="background:#F8FDFF; border-left:4px solid #1565C0; padding:15px; border-radius:4px; margin-bottom:15px;">
    <h3 style="margin-top:0; color:#0D47A1;">🍽️ AI 栄養解析結果</h3>
    <p style="color:#333;"><strong>推定される主要栄養素:</strong> （ここに列挙）</p>
</div>
<div class="advice-box" style="background:#FFF8E1; border:1px solid #FFE082; padding:15px; border-radius:4px;">
    <h3 style="margin-top:0; color:#F57F17;">👨‍⚕️ 管理栄養士の総合所見</h3>
    <ul style="color:#444; padding-left:20px; margin-bottom:0;">
        <li style="margin-bottom:8px;">（専門的アドバイス1）</li>
        <li style="margin-bottom:8px;">（専門的アドバイス2）</li>
        <li>（次に追加すべき食材の提案）</li>
    </ul>
</div>`;

    try {
        // Gemini APIを叩く
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        
        // AIの回答テキストを抽出
        let analysisHtml = data.candidates[0].content.parts[0].text;
        
        // AIが勝手に ```html などを付けた場合のお掃除
        analysisHtml = analysisHtml.replace(/```html/g, '').replace(/```/g, '');

        res.status(200).json({ html: analysisHtml });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '解析に失敗しました。' });
    }
}
