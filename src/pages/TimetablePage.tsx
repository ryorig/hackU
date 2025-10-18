import React, { useState } from 'react';
import { pdfToText } from 'pdf-ts';
import { GoogleGenAI } from '@google/genai';

interface TimetableDay {
  day: string;
  periods: string[];
}

export function TimetablePage() {
  const [pdfUrl, setPdfUrl] = useState('');
  const [timetable, setTimetable] = useState<TimetableDay[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;

  const handleExtract = async () => {
    setLoading(true);
    setError('');
    setTimetable(null);

    try {
      const res = await fetch(pdfUrl);
      if (!res.ok) throw new Error('PDFのダウンロードに失敗しました');
      const pdfBuffer = await res.arrayBuffer();
      const pdfUint8 = new Uint8Array(pdfBuffer);

      const text = await pdfToText(pdfUint8);

      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const prompt = `
次のテキストは学校の時間割表です。曜日ごとに各時限の授業科目をJSON形式で抽出してください。
例:
[
  {"day": "月", "periods": ["国語", "数学", "英語", "理科", "社会", "体育"]},
  ...
]
テキスト:
${text}
      `;

      const result = await model.generateContent([prompt]);
      const responseText = await result.response.text();

      const jsonMatch = responseText.match(/\[.*\]/s);
      if (jsonMatch) {
        setTimetable(JSON.parse(jsonMatch[0]));
      } else {
        setError('時間割の抽出に失敗しました。');
      }
    } catch (e) {
      setError('PDFの解析または抽出に失敗しました。' + (e?.message ? ` (${e.message})` : ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">時間割PDF自動抽出</h1>
      <div className="mb-4">
        <label className="block mb-2 font-medium">時間割PDFのURL</label>
        <input
          type="url"
          value={pdfUrl}
          onChange={e => setPdfUrl(e.target.value)}
          placeholder="https://example.com/timetable.pdf"
          className="w-full px-3 py-2 border rounded"
        />
      </div>
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        onClick={handleExtract}
        disabled={loading || !pdfUrl}
      >
        {loading ? '抽出中...' : '時間割を抽出'}
      </button>
      {error && <div className="text-red-600 mt-4">{error}</div>}
      {timetable && (
        <div className="mt-8">
          <h2 className="font-bold mb-2">抽出結果</h2>
          <table className="w-full border">
            <thead>
              <tr>
                <th className="border px-2 py-1">曜日</th>
                <th className="border px-2 py-1">時限</th>
              </tr>
            </thead>
            <tbody>
              {timetable.map(day => (
                <tr key={day.day}>
                  <td className="border px-2 py-1">{day.day}</td>
                  <td className="border px-2 py-1">
                    {day.periods.join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
