# ma0.dev

ma0 tools の公式サイト兼リンク集です。

## Files

- `index.html`: トップページ(`en/index.html` は英語版)
- `links/index.html`: リンク集ページ(`en/links/index.html` は英語版)
- `style.css`: 共通スタイル
- `main.js`: プログレッシブエンハンスメント用のバニラJS
- `favicon.svg`: favicon

ビルドなしの静的サイトです。外部ライブラリ・CDN・Webフォントは使っていません。

## Design notes

- ダーク基調(OSのライト設定にも `light-dark()` で追従)
- カラートークンは OKLCH、ボーダーは `color-mix()` ベース
- スクロール連動アニメーション(`animation-timeline`)、View Transitions、Anchor Positioning、`@starting-style`、scroll-state コンテナクエリなどの最新CSSはすべてプログレッシブエンハンスメントとして実装(非対応ブラウザでは静的に劣化)
- `main.js` の演出(パーティクル、3Dチルト、マグネティックボタン、スポットライト)は `prefers-reduced-motion` / データセーバー時には起動しません
- 「Story」セクションはスクロール量でCanvasパーティクルをスクラブ再生するシネマティック演出(sticky ステージ+決定論的タイムライン。スクロールを戻すと巻き戻る)。JSなし・reduced-motion 時はテキストのみの静的表示に劣化
- Aurora シェーダーはスクロール位置に連動してパレットがシアン系→マゼンタ系へ遷移し、ヒーローはスクロールで退場(`animation-timeline: view()`)
