# ma0.dev

ma0 tools の公式サイト兼リンク集です。

## Files

- `index.html`: トップページ(`en/index.html` は英語版)
- `links/index.html`: リンク集ページ(`en/links/index.html` は英語版)
- `style.css`: 共通スタイル
- `main.js`: プログレッシブエンハンスメント用のバニラJS
- `favicon.svg`: favicon

ビルドなしの静的サイトです。外部ライブラリは使っていません(Webフォントのみ Google Fonts から読み込み)。

## Verification

標準PythonとNode.jsだけで、ローカルリンク、重複ID、画像属性、JA/ENの構造一致、章番号、JavaScript構文を確認できます。

```sh
python3 scripts/verify_site.py
```

Pull Request では上記に加え、`html-validate` によるHTML/ARIA検証をGitHub Actionsで実行します。サイト本体には実行時依存やビルド工程を追加していません。

章ナビゲーション、深いリンク、reduced-motion、コマンドパレット、320〜1440pxの横幅は、CI内でPlaywrightを一時導入して実ブラウザ検証します。

## Design notes

「Small tools. More possibilities.」をテーマにした、小さなOSSのアトリエです。

- チャコールとライムを軸にしたデザイン。生成したガラス彫刻をヒーローに使用し、スマートフォンは800px版のWebPを読み込みます。
- 冒頭のボタンから作品へ直接移動できます。Originは短い3つの原則として読めます。
- 作品は「すべて・ツール・音楽」で絞り込めます。JavaScript無効時には全作品を表示します。
- 日本語・英語・リンク集で共通のスタイルを使います。公開中と準備中の区別を維持します。
- 章インデックス、深いリンク、検索（⌘K / Ctrl+K）、メールコピーは、動きを減らす設定でも使えます。
- 標準カーソルと通常のスクロールを使います。WebGL・Canvasの連続描画は行いません。
- 画像の幅・高さを予約し、主画像を優先読み込み、作品画像を遅延読み込みします。
- 詳しい判断・測定条件・検証結果は [UI/UXレポート](docs/uiux-review.md) を参照してください。
