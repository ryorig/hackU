import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Shirt, AlertCircle } from 'lucide-react';
import { supabase, ClothingItem } from '../lib/supabase';

interface OutfitSuggestion {
  outfit: string[];
  reason: string;
}

export function CoordinationPage() {
  const [clothingItems, setClothingItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [outfitSuggestion, setOutfitSuggestion] = useState<OutfitSuggestion | null>(null);
  const [selectedOccasion, setSelectedOccasion] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const occasions = [
    { value: 'casual', label: 'カジュアル' },
    { value: 'work', label: 'ビジネス' },
    { value: 'formal', label: 'フォーマル' },
    { value: 'date', label: 'デート' },
    { value: 'party', label: 'パーティー' },
    { value: 'sports', label: 'スポーツ' },
  ];

  const seasons = [
    { value: 'spring', label: '春' },
    { value: 'summer', label: '夏' },
    { value: 'autumn', label: '秋' },
    { value: 'winter', label: '冬' },
  ];

  useEffect(() => {
    fetchClothingItems();
  }, []);

  const fetchClothingItems = async () => {
    try {
      const { data, error } = await supabase
        .from('clothing_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClothingItems(data || []);
    } catch (error) {
      console.error('Error fetching clothing items:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateBasicOutfit = (occasion: string, season: string) => {
    const tops = clothingItems.filter(item => item.category === 'tops');
    const bottoms = clothingItems.filter(item => item.category === 'bottoms');
    const outerwear = clothingItems.filter(item => item.category === 'outerwear');
    const shoes = clothingItems.filter(item => item.category === 'shoes');

    const outfit: string[] = [];
    
    if (tops.length > 0) {
      const randomTop = tops[Math.floor(Math.random() * tops.length)];
      outfit.push(randomTop.name);
    }

    if (bottoms.length > 0) {
      const randomBottom = bottoms[Math.floor(Math.random() * bottoms.length)];
      outfit.push(randomBottom.name);
    }

    if ((season === 'winter' || season === 'autumn' || occasion === 'formal') && outerwear.length > 0) {
      const randomOuterwear = outerwear[Math.floor(Math.random() * outerwear.length)];
      outfit.push(randomOuterwear.name);
    }

    if (shoes.length > 0) {
      const randomShoes = shoes[Math.floor(Math.random() * shoes.length)];
      outfit.push(randomShoes.name);
    }

    const occasionText = occasions.find(o => o.value === occasion)?.label || '';
    const seasonText = seasons.find(s => s.value === season)?.label || '';

    return {
      outfit,
      reason: `${seasonText}の${occasionText}に適した基本的なコーディネートを提案しました。色の組み合わせとバランスを考慮して選択しています。`
    };
  };

  const generateOutfit = async () => {
    if (clothingItems.length === 0) return;

    setGenerating(true);
    setError(null);
    
    try {
      const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      if (!geminiApiKey) {
        const basicOutfit = generateBasicOutfit(selectedOccasion, selectedSeason);
        setOutfitSuggestion(basicOutfit);
        return;
      }

      const occasionText = occasions.find(o => o.value === selectedOccasion)?.label || '';
      const seasonText = seasons.find(s => s.value === selectedSeason)?.label || '';

      const prompt = `
以下の服アイテムから、${seasonText}の${occasionText}に適したコーディネートを提案してください。

服のリスト:
${clothingItems.map(item => `- ${item.name} (${item.category}, ${item.color}): ${item.description}`).join('\n')}

以下の条件で提案してください：
1. 季節: ${seasonText}
2. 場面: ${occasionText}
3. 色の組み合わせを考慮
4. バランスの良いコーディネート

回答は以下のJSON形式でお願いします:
{
  "outfit": ["アイテム名1", "アイテム名2", "アイテム名3"],
  "reason": "このコーディネートを選んだ理由を150文字程度で説明"
}
`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const generatedText = data.candidates[0].content.parts[0].text;
      
      // JSONを抽出
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const suggestion = JSON.parse(jsonMatch[0]);
        setOutfitSuggestion(suggestion);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error generating outfit:', error);
      // Show error message if it's an API-related error
      if (error instanceof Error && error.message.includes('404')) {
        setError(`基本的なコーディネートを提案します。`);
      }
      
      
      // フォールバック提案
      const basicOutfit = generateBasicOutfit(selectedOccasion, selectedSeason);
      setOutfitSuggestion(basicOutfit);
    } finally {
      setGenerating(false);
    }
  };

  const getItemsByName = (names: string[]) => {
    return names.map(name => 
      clothingItems.find(item => item.name === name)
    ).filter(Boolean) as ClothingItem[];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-600">読み込み中...</div>
      </div>
    );
  }

  if (clothingItems.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <Shirt className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">コーディネートを作成するには服が必要です</h3>
          <p className="text-slate-600 mb-4">まずはワードローブページで服を追加してください</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20 md:pb-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">AIコーディネート</h1>
        <p className="text-slate-600">AIがあなたのワードローブから最適なコーディネートを提案します</p>
      </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <p className="text-yellow-800 text-sm">{error}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
        <h2 className="text-lg font-medium text-slate-900 mb-4">コーディネート条件</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label htmlFor="occasion" className="block text-sm font-medium text-slate-700 mb-2">
              場面
            </label>
            <select
              id="occasion"
              value={selectedOccasion}
              onChange={(e) => setSelectedOccasion(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">場面を選択</option>
              {occasions.map((occasion) => (
                <option key={occasion.value} value={occasion.value}>
                  {occasion.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="season" className="block text-sm font-medium text-slate-700 mb-2">
              季節
            </label>
            <select
              id="season"
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">季節を選択</option>
              {seasons.map((season) => (
                <option key={season.value} value={season.value}>
                  {season.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={generateOutfit}
          disabled={generating || !selectedOccasion || !selectedSeason}
          className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
        >
          {generating ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <Sparkles className="w-5 h-5" />
          )}
          <span>{generating ? 'コーディネート作成中...' : 'コーディネートを作成'}</span>
        </button>
      </div>

      {outfitSuggestion && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-medium text-slate-900 mb-4">提案されたコーディネート</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {getItemsByName(outfitSuggestion.outfit).map((item) => (
              <div key={item.id} className="bg-slate-50 rounded-lg p-4">
                <div className="aspect-square mb-3">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover rounded-md"
                  />
                </div>
                <h3 className="font-medium text-slate-900">{item.name}</h3>
                <p className="text-sm text-slate-600">{item.color}</p>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">コーディネートの理由</h3>
            <p className="text-blue-800">{outfitSuggestion.reason}</p>
          </div>

          <button
            onClick={generateOutfit}
            disabled={generating}
            className="mt-4 flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            <span>別のコーディネートを作成</span>
          </button>
        </div>
      )}
    </div>
  );
}