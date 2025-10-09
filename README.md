# Hackathon
## solver
yaku_solver  
**夜ぐらいしか動かないgit**  
 <?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/css" href="style.css"?>
<document>
  <title>パズルソルバー - アルゴリズムと使用方法</title>
  
  <section name="アルゴリズム">
    
    <subsection name="ビームサーチ">
      <item>幅優先探索の変種で、各深度で最良の60個の状態のみを保持</item>
      <item>f値（実コスト + ヒューリスティック）が小さい順に優先探索</item>
    </subsection>
    
    <subsection name="ヒューリスティック関数">
      <item>各値の2つの出現位置のマンハッタン距離を計算</item>
      <item>距離が1（隣接）を超える場合、その超過分をペナルティとして累積</item>
      <item>h = 0 で解発見</item>
    </subsection>
    
    <subsection name="最適化技術">
      <optimization order="1">
        <name>Zobristハッシュ</name>
        <description>状態の重複検出を高速化（O(1)比較）</description>
      </optimization>
      <optimization order="2">
        <name>差分更新</name>
        <description>変更部分のみ処理してヒューリスティック計算を高速化</description>
      </optimization>
      <optimization order="3">
        <name>並列処理</name>
        <description>8スレッドで状態展開を並列実行</description>
      </optimization>
    </subsection>
    
    <subsection name="操作">
      <description>グリッド上の正方形領域（2×2〜6×6）を時計回りに90度回転</description>
    </subsection>
    
  </section>
  
  <section name="使用方法">
    
    <step number="1">
      <title>入力ファイル準備（grid.json）</title>
      <code><![CDATA[{
  "problem": {
    "field": {
      "entities": [
        [1, 2, 3, ...],
        [4, 5, 6, ...],
        ...
      ]
    }
  }
}]]></code>
    </step>
    
    <step number="2">
      <title>実行</title>
      <command>python puzzle_solver.py</command>
    </step>
    
    <step number="3">
      <title>出力（rotation_log_fast.json）</title>
      <code><![CDATA[{
  "ops": [
    {"x": 列, "y": 行, "n": サイズ},
    ...
  ]
}]]></code>
      <note>各操作は左上座標(x,y)と正方形サイズnで指定された領域を回転します。</note>
    </step>
    
  </section>
  
</document>
