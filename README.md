# 糞取山酷会（くそとりさんこくかい）

仲間内の登山・ハイキングチームの公式サイト → **https://sankoku.club/**

このリポジトリは **AI エージェント（Claude Code、Codex など）に操作させること**を前提に作っています。
コードを書ける人も書けない人も、やりたいことを日本語で頼めば、AI が更新・ビルド・確認までやってくれます。

## AI に頼む

1. このリポジトリを AI エージェントで開く（`git clone` してそのフォルダで起動するだけ）。
2. やりたいことを日本語で伝える。

AI は最初に [`AGENTS.md`](AGENTS.md) を読みます。ファイル構成、コマンド、データの書式、落とし穴はすべてそこに書いてあるので、人間が細かく説明する必要はありません。

### 頼み方の例

| やりたいこと | 頼み方の例 |
|---|---|
| Next Mission バナーを更新 | 「次の山行を 10/12 に八ヶ岳の赤岳で登録して」 |
| 山行ログを追加 | 「この GPX で山行ログを追加して。メンバーは Koyama と Avo、山は◯◯」 |
| スライド写真を追加 | 「`static/slides` に入れた写真を縮小して、スライドに反映して」 |
| メンバーページを追加 | 「◯◯さんの個別ページを追加して、Team 一覧にもリンクして」 |
| 配色を変える | 「配色案を3つ出して。気に入ったら適用して」 |
| 変更を確認する | 「ビルドして、開発サーバーで表示を確認して」 |
| 公開する | 「commit して main に push して」 |

- **`main` への push は、そのまま本番サイトに公開されます。** AI は頼まれない限り commit / push しない決まりになっています。公開したいときは、はっきり頼んでください。
- 作業内容に自信がなければ、「push はしないで、差分だけ見せて」と頼めば安心です。

## AI を使わずに更新する

- **Next Mission バナー**: GitHub の [Issues](../../issues/new/choose) から「Missionバナー更新」フォームを送信すると、自動でバナーが更新されて公開されます（リポジトリへの書き込み権限があるメンバーのみ）。山名は Issue のタイトル欄に入力します。
- **スライド写真**: `static/slides/` に画像（JPG/PNG）を追加して `main` に push すると、自動でビルドされて表示されます。大きい画像は事前に `make resize-images-win`（Mac / Linux は `make resize-images`）で縮小してください。
- それ以外の手作業: [開発者向けセットアップガイド](how-to-use.md)

## 公開の仕組み

`main` に push → GitHub Actions が `make build` を実行 → `dist/` を GitHub Pages に公開。

- 静的サイトジェネレーター: [VSS](https://github.com/veltiosoft/vss)
- ビルド前に Node.js スクリプトが JSON を生成（Next Mission バナー、スライド一覧、山行ログ）
- 開発サーバー: `make serve-win`（Mac / Linux は `make serve`）→ http://localhost:8080

## 手元で動かす準備

AI に作業させる場合も、ビルドと確認のために以下がローカルに必要です。

- `git`、`make`、Node.js
- Python 3 + Pillow（画像リサイズのときだけ。`py -3 -m pip install Pillow`）
- VSS 本体（初回のみ。`make setup-win`、Mac / Linux は [how-to-use.md](how-to-use.md) 参照）

詳細なコマンド一覧、データの書式、既知の落とし穴は [`AGENTS.md`](AGENTS.md) にまとまっています。
