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

大きなタイポグラフィ、奥行きのあるツール画面、スクロールで変形する粒子を組み合わせたプロダクトストーリーです。

- `cinematic.css`: トップページの日英共通デザイン。暗いヒーローから明るい作品ギャラリーへ切り替わります。
- `motion.js`: 立体的な粒子リングと、`ma0 → 猫の手 → OSS` のスクロール連動モーフィング。
- ヒーローは上限30fps、画面外や非表示タブでは停止。ストーリーはスクロール・サイズ変更時のみ描画します。
- 「動きを止める」で全シーンを普通の文章として表示。reduced-motion / Save-Data / JavaScript無効でも本文と作品への導線を維持します。
- 作品カードは製品のメリットを大きく示し、メーターとリンク集を拡大しても鮮明なHTML/CSSで描いています。
- ツール画面はHTML/CSSによる使用イメージです。実際のアプリ画面や利用者のデータではありません。
- 作品の絞り込み、日本語キーワード検索（⌘K / Ctrl+K）、章ナビ、メールコピーも利用できます。
- 詳しい判断・測定条件・検証結果は [UI/UXレポート](docs/uiux-review.md) を参照してください。
