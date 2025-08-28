// netlify/functions/gemini.js
exports.handler = async function (event) {
    // POST 요청만 허용
    if (event.httpMethod !== 'POST') {
         return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const { base64ImageData } = JSON.parse(event.body);
        // Netlify 환경 변수에서 API 키를 가져옴
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error("GEMINI_API_KEY is not set in Netlify environment variables.");
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "서버 설정에 오류가 있습니다. 관리자에게 문의하세요." })
            };
        }
        if (!base64ImageData) {
            return { statusCode: 400, body: JSON.stringify({ error: "이미지 데이터가 전송되지 않았습니다." }) };
        }

       // 10초 타임아웃 문제를 해결하기 위해 스트리밍 엔드포인트 사용
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:streamGenerateContent?key=${apiKey}`;
        const systemPrompt = `너는 수학 문제 풀이 전문가야. 이미지 속 문제를 읽고, 다음 마크다운 형식에 맞춰서 답변해 줘:\n\n**문제 번호:** (문제 번호)\n\n**문제 분석:** (어떤 단원의 어떤 개념을 사용하는지, 핵심 조건은 무엇인지 요약)\n\n**풀이 과정:** (단계별로 상세하고 논리적인 풀이 과정을 서술)\n\n**정답:** (최종 정답)\n\n**추가 코멘트:** (유사 문제 유형, 학생들이 자주 하는 실수, 추가적으로 학습하면 좋은 개념 등을 제안)`;
        
        const payload = {
            contents: [{
                parts: [
                    { text: systemPrompt },
                    { inlineData: { mimeType: "image/png", data: base64ImageData } }
                ]
            }]
        };

         const geminiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        // Gemini API 요청 자체에 실패했는지 확인
        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            console.error("Gemini API Error:", errorText);
            return {
                statusCode: geminiResponse.status,
                body: JSON.stringify({ error: `Gemini API 오류: ${errorText}` })
            };
        }
        
       // Gemini API의 응답 스트림을 클라이언트로 바로 전달
        return new Response(geminiResponse.body, {
            status: 200,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });

    } catch (error) {
        console.error("Server function error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message || "서버에서 처리 중 오류가 발생했습니다." })
        };
    }
};
