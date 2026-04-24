## 言語設定

すべてのプロジェクトで日本語での返答を希望します。

## 日時確認

**日時に関する指示や作業を行う場合は、必ず最初に `date "+%Y-%m-%d (%a) %H:%M"` コマンドで現在日時を確認してください。**

## プロジェクト概要

「糞取山酷会（くそとりさんこくかい）」の公式ウェブサイト。仲間内の登山・ハイキングチームのサイト。
URL: https://sankoku.club/ / GitHub Pages でホスティング。

## ビルドコマンド

```bash
# Windows（通常の作業フロー）
make build-win      # ビルド（Node.jsスクリプト実行 → vss.exe build）
make serve-win      # 開発サーバー起動
make resize-images-win  # 画像リサイズ（static/slides/ の画像を最適化）

# Linux/Mac
make build
make serve
make resize-images

# 初回セットアップ（Windows）
make setup-win      # vss.exe をダウンロード
py -3 -m pip install Pillow  # 画像リサイズに必要
```

## アーキテクチャ

### 静的サイトジェネレーター: VSS

- `vss.toml`: サイト設定（タイトル、URL、ビルド対象外ファイル）
- トップ階層の `.md` ファイルが自動的にページになる（`README.md`, `how-to-use.md`, `INFO-message.md` はビルド対象外）
- `layouts/default.html`: 唯一のレイアウトテンプレート。`{{{contents}}}` にMarkdownの内容が挿入される
- ビルド結果は `dist/` に出力される

### ビルド前に実行されるNode.jsスクリプト

`make build` / `make serve` は以下を順番に実行する：

1. **`generate-info.js`**: `INFO-message.md` を読んで `static/data/info.json` を生成
   - 複数の `---` フロントマターブロックで複数イベントのカウントダウンを定義可能
   - `event_date: TBD` にすると「--」表示
2. **`generate-slides-list.js`**: `static/slides/` の画像一覧を `static/slides/slides.json` に出力
3. **`generate-logs.js`**: `static/data/activity_logs/` と `static/data/training_logs/` 内の `yyyymmdd_name/` 形式フォルダを処理し、各フォルダの `info.yaml` と `track.gpx` からJSONを生成

### INFO バナーの更新

`INFO-message.md` を編集してビルドするだけ。フォーマット：

```markdown
---
title: バナーラベル
event_date: 2026-01-01
event_name: 山名
event_area: 地域
---

本文テキスト（Markdown対応）
```

### 画像スライドの追加

`static/slides/` にJPG/PNGを追加してビルド。`resize-images.py` は：
- 横幅2000pxにリサイズ（アスペクト比維持）、JPEG品質85%
- 元画像を `static/slides/originals/` に自動バックアップ
- 処理済み記録: `static/slides/.processed_images.json`
