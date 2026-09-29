# AGENTS.md

「糞取山酷会（くそとりさんこくかい）」の公式サイト https://sankoku.club/ 。仲間内の登山・ハイキングチームのサイト。
静的サイトジェネレーター [VSS](https://github.com/veltiosoft/vss) でビルドし、GitHub Pages で公開している。

このリポジトリは **AI エージェントが操作すること**を前提にしている。作業前にこのファイルを読み、下の「やりたいこと別レシピ」に沿って進めること。

## 基本ルール

- **返答・コミットメッセージ・PR は日本語**で書く（既存の git 履歴も日本語）。
- 日付に関わる作業（イベント日付、山行ログのフォルダ名など）の前に、必ず `date "+%Y-%m-%d (%a) %H:%M"` で現在日時を確認する。
- **`main` への push は即座に本番公開される**（GitHub Actions → GitHub Pages）。ユーザーが明示的に頼んだときだけ push する。commit / push を頼まれていなければ、変更をワーキングツリーに残して報告するだけにする。
- `dist/`、`vss.exe`、`vss` はビルド生成物（`.gitignore` 済み）。編集もコミットもしない。
- 生成 JSON（後述）は**手で編集しない**。元データを編集して `make generate` を実行する。
- 色の値は `static/css/theme-vars.css` 以外に書かない（後述）。

## コマンド

Windows / Linux・macOS でターゲット名が違う。OS に合わせて選ぶ（Windows は `-win` 付き）。

| 目的 | Windows | Linux / macOS |
|---|---|---|
| VSS 取得（初回のみ） | `make setup-win` | `make setup`（Intel Mac は `setup-mac-intel`、Apple Silicon は `setup-mac`） |
| 生成 JSON の更新のみ | `make generate` | `make generate` |
| ビルド（`generate` → `vss build`、出力は `dist/`） | `make build-win` | `make build` |
| 開発サーバー（http://localhost:8080） | `make serve-win` | `make serve` |
| スライド画像のリサイズ | `make resize-images-win` | `make resize-images` |

- 必要なもの: `make`、Node.js（`generate-*.js` 用）、Python 3 + Pillow（`resize-images` のときだけ。`py -3 -m pip install Pillow`）。
- `generate` は `make build` / `make serve` の起動時に**1回だけ**走る。`serve` 中に元データを編集したら、別途 `make generate` を実行する。
- CI（`.github/workflows/pages.yml`）は Linux で `make setup && make build` を実行して `dist/` を公開する。
- このリポジトリにテストはない。変更の検証は「ビルドが通る」「生成 JSON が意図どおり更新される」「開発サーバーで表示を確認する」で行う。
  - プレビュー用に `.claude/launch.json` の `sankoku-serve`（`make serve-win`、ポート 8080）が使える。

## アーキテクチャ

```
.
├── index.md               トップページ本文（Markdown）。Team 一覧もここ
├── INFO-message.md        Next Mission バナーの元データ
├── layouts/default.html   唯一のレイアウト。{{{contents}}} に Markdown が入る。ロゴ・バナー・カウントダウンのインライン JS を含む
├── vss.toml               サイト設定・ビルド除外ファイル
├── generate-info.js       INFO-message.md   → static/data/info.json
├── generate-slides-list.js static/slides/   → static/slides/slides.json
├── generate-logs.js       activity_logs/    → static/data/activity_logs.json
├── resize-images.py       スライド画像の最適化
└── static/                そのまま dist/ にコピーされる
    ├── css/               theme-vars.css（色）/ style.css / style_vhs.css / log-viewer.css / dot/
    ├── js/                gallery.js（スライド）/ log-viewer.js（山行ログ）/ ridge.js（3D山稜）/ t.js（タイピング演出）
    ├── log.html           山行ログビューア（data/activity_logs.json を fetch）
    ├── climb_game.html    ミニゲーム
    ├── bio/*.html         メンバー個別ページ
    ├── data/              info.json, activity_logs.json（生成）と activity_logs/（元データ）
    └── slides/            トップのスライド画像。originals/ に元画像のバックアップ
```

### VSS の注意点

- ルート直下だけでなく、**リポジトリ内のすべての `.md` がページ化されうる**（実際に `.claude/skills/**/SKILL.md` が HTML になった前例がある）。公開したくない `.md`（`README.md`、`AGENTS.md`、`how-to-use.md`、`INFO-message.md`、SKILL.md など）は `vss.toml` の `ignore_files` に列挙する。**新しい非公開 `.md` を足したら必ず追加する。**
- **Windows の VSS はパス区切りが `\`**。サブディレクトリ内のファイルを除外するときは `/` 版と `\\` 版の**両方**を書く（Windows では `\\` 版、Linux の CI では `/` 版が効く）。現状 SKILL.md がこの形。
- `make build` 後は `dist/` 内の `*.html` を確認する。あるべきものは `index.html` `log.html` `climb_game.html` `bio/*.html` だけ。`AGENTS.html` `README.html` `SKILL.html` があれば除外漏れ。
- `static/sitemap.xml` は**手書き**（自動生成ではない）。ページを増やしたら手で追記する。

### 生成 JSON はコミット対象

`static/data/info.json`、`static/data/activity_logs.json`、`static/slides/slides.json` は生成物だが**git で追跡されている**。元データを変更したら `make generate` を実行し、元データと一緒にコミットする。`make generate` は冪等（元データが同じなら差分は出ない）。

## やりたいこと別レシピ

### Next Mission バナーを更新する

編集対象は `INFO-message.md` のみ。書式:

```markdown
---
title: Next Mission          # バナーのラベル（最初のブロックのものだけ使われる）
event_date: 2026-10-12       # YYYY-MM-DD か TBD
event_name: 山名
event_area: 地域             # 任意
---

本文（Markdown 風。段落、**強調**、改行のみ対応）
```

- `---` ブロックを複数書くと複数イベントを並べて表示する。1つ目のブロックにラベル（`title`）を置き、以降のブロックには `event_*` だけを書く。
- 値は**1行の `key: value` のみ**。改行や `:` を含む値は扱えない（パーサーが正規表現 `^(\w+):\s*(.*)$` で読むため）。
- `event_date` が過去のイベントは表示側（`layouts/default.html`）でカウントダウンから自動的に外れる。有効なイベントがゼロでも、バナーのラベルと本文は表示され、カウントダウン部分だけが空になる（過去のイベントを消し忘れても壊れないが、次のイベントを入れ忘れるとカウントダウンが出ない）。`TBD` は「--」表示で、他に表示できるイベントがないときだけ出る。
- ファイル末尾の `<!-- ... -->` は操作メモ。生成時に除去されるので消さなくてよい。
- 更新後: `make generate` → `static/data/info.json` の `events` を確認。
- 別ルート: GitHub の Issue フォーム「Missionバナー更新」（ラベル `mission-update`）を作ると、`update-mission.yml` が書き込み権限のあるコラボレーターの Issue だけを処理して `INFO-message.md` に新イベントを**追記**し、デプロイまで行う。Issue のタイトルが山名になる。エージェントがローカルで作業するときは `INFO-message.md` を直接編集する方が確実。

### 山行ログを追加する

`static/data/activity_logs/yyyymmdd_name/` を作り、中に以下を置く。フォルダ名は `^\d{8}_` で始まること（そうでないフォルダは無視される）。

```yaml
mountain: 乳（にゅう）
date: 2026-05-02
area: 八ヶ岳
members:
  - Avo
  - Koyama
note: ひとこと（空でもよい）
photos: []
```

- `track.gpx`（または `track.fit`）を同じフォルダに置く。GPX から**最高標高地点の座標と標高**を自動計算して JSON に入れる（YAML の `altitude` より GPX が優先）。GPX がなくてもログは作れる。
- YAML は自前の簡易パーサーで読んでいる。対応するのは、トップレベルの `key: value`、`  - item`（半角スペース2つ）の配列、`[]`、`|` の複数行文字列、1階層だけのオブジェクト。それ以外（深いネスト、アンカー、フロー記法の配列 `[a, b]` など）は使わない。
- `members` の表記は `index.md` の Team 一覧に合わせる。
- 追加後: `make generate` → `static/data/activity_logs.json` に新しい `id` が日付降順で入ることを確認。

### スライド画像を追加する

1. `static/slides/` に JPG / PNG を置く。
2. `make resize-images-win`（または `make resize-images`）。横幅 2000px・JPEG 品質 85% に縮小し、元画像を `static/slides/originals/` にバックアップ、処理済みを `static/slides/.processed_images.json` に記録する（処理済みは再処理しない）。
3. `make generate` で `slides.json` を更新。

### メンバー個別ページを追加する

- `static/bio/<name>.html` を作る。既存の `shigebayashi.html` / `ryu_wakimoto.html` を雛形にする。
- **`<link rel="stylesheet" href="../css/theme-vars.css" />` を必ず入れる**。`:root` の色を自前で書かない。
- `index.md` の Team 一覧にリンクを足す（`[名前](bio/xxx.html)`）。
- `static/sitemap.xml` に追記するか検討する。

### 配色・テーマを変える

色は**すべて `static/css/theme-vars.css` の `:root` 変数**から来る。色の変更はこのファイルだけを編集する。他のファイルに 16進カラーを直書きしたくなったら、それはバグか変数の見落とし。

- ロゴ SVG、ドット絵、トップの 3D 山稜（`static/js/ridge.js`）、山行ログ（`log.html`）、bio ページまで、テーマ切り替えで触るべき箇所と手順は **`.claude/skills/color-theme/SKILL.md`** にまとまっている。配色に関わる作業の前に必ず読む（Claude 以外のエージェントもプレーンな手順書として読める）。
- `ridge.js` が読む `--main-font-color` / `--doggo-color` / `--main-bg-color` は **`#rgb` / `#rrggbb` の16進のみ**。`rgb()` や名前付き色は無視される。

## 変更前後のチェックリスト

1. `git status` で作業前の状態を確認する。
2. 変更する。元データを触ったら `make generate`。
3. `make build-win`（Linux は `make build`）が成功し、`dist/` の HTML 一覧が上記の想定どおりであること。
4. 見た目に関わる変更は開発サーバーで表示確認（コンソールエラーがないこと）。
5. 生成 JSON の差分が意図した範囲だけであること。
6. ユーザーに頼まれたときだけ commit / push する。
