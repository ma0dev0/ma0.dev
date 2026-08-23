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

- ダーク専用(`color-scheme: dark`)
- カラートークンは OKLCH、ボーダーは `color-mix()` ベース
- トップページは Chapter 00〜05 の縦スクロール物語として構成。各章は「進捗カウンタ+ヘアラインの spine+巨大なゴースト語」のデバイダで区切られ、本文は3カラムのエディトリアル組(左=モノスペースのメタ、中=見出し+リード、右=本文)。章の識別子は `data-chapter-no` / `data-chapter-name` として HTML に持たせ、JS 側に章リストを持たない
- 右端に固定の章インデックスレール(`nav` + `aria-current`)。ビューポート幅 1180px 未満ではヘッダナビが代替になるため非表示。Story 章の下にはシーン進行を示すサブ目盛りが4本並ぶ
- 章デバイダのカウンタは章ごとの通過量を 000〜999 で表示(`aria-hidden`。スクロール停止時は最終値で静止)
- スクロール連動アニメーション(`animation-timeline`)、View Transitions、Anchor Positioning、`@starting-style`、scroll-state コンテナクエリなどの最新CSSはすべてプログレッシブエンハンスメントとして実装(非対応ブラウザでは静的に劣化)
- `main.js` の演出(パーティクル、3Dチルト、マグネティックボタン、スポットライト)は `prefers-reduced-motion` / データセーバー時には起動しません
- 「Story」セクションはスクロール量でCanvasパーティクルをスクラブ再生するシネマティック演出(sticky ステージ+決定論的タイムライン。スクロールを戻すと巻き戻る)。JSなし・reduced-motion 時はテキストのみの静的表示に劣化
- Aurora シェーダーはスクロール位置に連動してパレットがシアン系→マゼンタ系へ遷移し、ヒーローはスクロールで退場(`animation-timeline: view()`)
- コマンドパレット(⌘K / Ctrl+K):ネイティブ `<dialog>` + `@starting-style` 開閉トランジション。ページ内アンカー・別ページ・外部リンク・メールコピーを検索して実行できる。機能系なので reduced-motion 時も有効
- カスタムカーソル(ドット+遅延追従リング):`hover: hover` かつ `pointer: fine` のみ。インタラクティブ要素上でリングが拡大
- 章見出しは viewport 進入時に一度だけ文字化け→確定の「デコード」演出(スクランブル中は `aria-label` で本来の見出しを保持)
- Story と Projects の間に JetBrains Mono の無限マーキーベルト(CSSアニメーションのみ、2連トラックの `-50%` ループ)
- スクロール速度に応じてカードグリッドが僅かに `skewY` する慣性演出(`--scroll-skew`、静止時は 0deg に復帰)
- フッターに SYS.ONLINE ステータス+JST ライブ時計の HUD(JSで挿入、`aria-hidden`)
