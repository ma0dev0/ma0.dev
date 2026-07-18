# ma0.dev

ma0 tools の公式サイト兼リンク集です。

## Files

- `index.html`: トップページ(`en/index.html` は英語版)
- `links/index.html`: リンク集ページ(`en/links/index.html` は英語版)
- `style.css`: 共通スタイル
- `main.js`: プログレッシブエンハンスメント用のバニラJS
- `favicon.svg`: favicon

ビルドなしの静的サイトです。外部ライブラリは使っていません(Webフォントのみ Google Fonts から読み込み)。

## Design notes

- ダーク専用(`color-scheme: dark`)
- カラートークンは OKLCH、ボーダーは `color-mix()` ベース
- スクロール連動アニメーション(`animation-timeline`)、View Transitions、Anchor Positioning、`@starting-style`、scroll-state コンテナクエリなどの最新CSSはすべてプログレッシブエンハンスメントとして実装(非対応ブラウザでは静的に劣化)
- `main.js` の演出(パーティクル、3Dチルト、マグネティックボタン、スポットライト)は `prefers-reduced-motion` / データセーバー時には起動しません
- 「Story」セクションはスクロール量でCanvasパーティクルをスクラブ再生するシネマティック演出(sticky ステージ+決定論的タイムライン。スクロールを戻すと巻き戻る)。JSなし・reduced-motion 時はテキストのみの静的表示に劣化
- Aurora シェーダーはスクロール位置に連動してパレットがシアン系→マゼンタ系へ遷移し、ヒーローはスクロールで退場(`animation-timeline: view()`)
- コマンドパレット(⌘K / Ctrl+K):ネイティブ `<dialog>` + `@starting-style` 開閉トランジション。ページ内アンカー・別ページ・外部リンク・メールコピーを検索して実行できる。機能系なので reduced-motion 時も有効
- カスタムカーソル(ドット+遅延追従リング):`hover: hover` かつ `pointer: fine` のみ。インタラクティブ要素上でリングが拡大
- セクション見出しは viewport 進入時に一度だけ文字化け→確定の「デコード」演出(スクランブル中は `aria-label` で本来の見出しを保持)
- Story と Projects の間に JetBrains Mono の無限マーキーベルト(CSSアニメーションのみ、2連トラックの `-50%` ループ)
- スクロール速度に応じてカードグリッドが僅かに `skewY` する慣性演出(`--scroll-skew`、静止時は 0deg に復帰)
- フッターに SYS.ONLINE ステータス+JST ライブ時計の HUD(JSで挿入、`aria-hidden`)
