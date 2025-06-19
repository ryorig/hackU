import React, { useState, useEffect } from 'react';
import { Plus, X, Shirt, AlertCircle} from 'lucide-react';
import { supabase, ClothingItem } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const categories = [
  { value: 'tops', label: 'トップス' },
  { value: 'bottoms', label: 'ボトムス' },
  { value: 'outerwear', label: 'アウター' },
  { value: 'shoes', label: 'シューズ' },
  { value: 'accessories', label: 'アクセサリー' },
] as const;

const colors = [
  '白', '黒', 'グレー', 'ネイビー', 'ブルー', 'ライトブルー',
  'レッド', 'ピンク', 'イエロー', 'グリーン', 'ブラウン', 'ベージュ'
];

export function WardrobePage() {
  const { user } = useAuth();
  const [clothingItems, setClothingItems] = useState<ClothingItem[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bucketExists, setBucketExists] = useState<boolean | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'tops' as const,
    color: '',
    description: '',
  });
  const [imageUrl, setImageUrl] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    fetchClothingItems();
  }, []);

  useEffect(() => {
    if (selectedFile) {
      (async () => {
        try {
          const url = await uploadImage(selectedFile);
          setImageUrl(url);
        } catch {
          setError('画像のアップロードに失敗しました');
        }
      })();
    }
  }, [selectedFile]);


  const createStorageBucket = async () => {
    try {
      const { error } = await supabase.storage.createBucket('clothing-images', { 
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        fileSizeLimit: 5242880 // 5MB
      });
      
      if (error) {
        if (error.message.includes('already exists')) {
          setBucketExists(true);
          setError(null);
          return true;
        }
        throw error;
      }
      
      setBucketExists(true);
      setError(null);
      return true;
    } catch (error) {
      console.error('Error creating storage bucket:', error);
      setError('ストレージバケットの作成に失敗しました。Supabaseの管理画面から手動で作成してください。');
      return false;
    }
  };

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (5MB limit)
      if (file.size > 5242880) {
        setError('ファイルサイズが大きすぎます。5MB以下のファイルを選択してください。');
        return;
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        setError('画像ファイルを選択してください。');
        return;
      }
      
      setSelectedFile(file);
      setError(null);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    // Check if bucket exists, create if it doesn't
    if (bucketExists === false) {
      const created = await createStorageBucket();
      if (!created) {
        throw new Error('ストレージバケットが利用できません。');
      }
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${user?.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('clothing-images')
      .upload(fileName, file);

    if (uploadError) {
      if (uploadError.message.includes('Bucket not found')) {
        // Try to create bucket one more time
        const created = await createStorageBucket();
        if (created) {
          // Retry upload
          const { error: retryError } = await supabase.storage
            .from('clothing-images')
            .upload(fileName, file);
          if (retryError) throw retryError;
        } else {
          throw new Error('ストレージバケットが見つかりません。');
        }
      } else {
        throw uploadError;
      }
    }

    const { data } = supabase.storage
      .from('clothing-images')
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl || !user) return;

    setSubmitting(true);
    setError(null);
    
    try {
      const { error } = await supabase
        .from('clothing_items')
        .insert([
          {
            ...formData,
            user_id: user.id,
            image_url: imageUrl,
          },
        ]);

      if (error) throw error;

      await fetchClothingItems();
      setShowAddForm(false);
      setFormData({ name: '', category: 'tops', color: '', description: '' });
      setImageUrl('');
    } catch (error) {
      console.error('Error adding clothing item:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('服の追加中にエラーが発生しました。もう一度お試しください。');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('clothing_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchClothingItems();
    } catch (error) {
      console.error('Error deleting clothing item:', error);
    }
  };

  const getCategoryLabel = (category: string) => {
    return categories.find(c => c.value === category)?.label || category;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-600">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20 md:pb-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-slate-900">ワードローブ</h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>服を追加</span>
        </button>
      </div>
      {clothingItems.length === 0 ? (
        <div className="text-center py-12">
          <Shirt className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">服がまだありません</h3>
          <p className="text-slate-600 mb-4">お持ちの服を追加してワードローブを作成しましょう</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            最初の服を追加
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {clothingItems.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-square">
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <h3 className="font-medium text-slate-900 mb-1">{item.name}</h3>
                <p className="text-sm text-slate-600 mb-2">
                  {getCategoryLabel(item.category)} • {item.color}
                </p>
                {item.description && (
                  <p className="text-sm text-slate-500 mb-3">{item.description}</p>
                )}
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <h2 className="text-lg font-medium text-slate-900">服を追加</h2>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setError(null);
                  setImageUrl('');
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="image-url" className="block text-sm font-medium text-slate-700 mb-2">
                  画像URL
                </label>
                <input
                  id="image-url"
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="mt-2"
                />  
                {imageUrl && (
                  <div className="mt-3">
                    <img
                      src={imageUrl}
                      alt="プレビュー"
                      className="w-32 h-32 object-cover rounded-md border border-slate-200"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                      onLoad={(e) => {
                        e.currentTarget.style.display = 'block';
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                  名前
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-slate-700 mb-2">
                  カテゴリー
                </label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as typeof formData.category })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  {categories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="color" className="block text-sm font-medium text-slate-700 mb-2">
                  色
                </label>
                <select
                  id="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">色を選択</option>
                  {colors.map((color) => (
                    <option key={color} value={color}>
                      {color}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-2">
                  説明（任意）
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setError(null);
                    setImageUrl('');
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={submitting || !imageUrl}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
                >
                  {submitting ? '追加中...' : '追加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
