# 糞取山酷会（くそとりさんこくかい）

仲間内の登山・ハイキングチームのウェブサイトです。

**[開発者向けセットアップガイド](how-to-use.md)** - 環境構築やVSSの使い方はこちら

## ページ下部のスライドの更新方法

`static/slides/` フォルダに画像ファイル（JPG/PNG）を追加すればOK。
あとはmainブランチにプッシュすれば自動的にビルドが始まって、画像が配置されるはず。

---

## 管理者向けコマンド集

### 初回セットアップ（Windows）

**VSSのインストール:**
```bash
make setup-win
```

**Pillowのインストール:**
```bash
py -3 -m pip install Pillow
```

### 日常的な作業フロー

**1. 画像を最適化:**
```bash
make resize-images-win
```

**2. サイトをビルド:**
```bash
make build-win
```

### その他のコマンド

**開発サーバーの起動:**
```bash
make serve-win
```

### 技術詳細

**使用技術:**
- 静的サイトジェネレーター: [VSS](https://github.com/vssio/go-vss)
- ホスティング: GitHub Pages

**画像リサイズスクリプト (`resize-images.py`):**
- 横幅2000ピクセルにリサイズ（アスペクト比維持）
- JPEG品質85%で最適化
- 元の画像を `static/slides/originals/` に自動バックアップ
- 処理履歴を `static/slides/.processed_images.json` に記録
- 既に処理済みの画像は自動スキップ（二重処理防止）

## ファイル構造

```
.
├── index.md               # トップページ
├── INFO-message.md        # INFOバナーの内容
├── layouts/
│   └── default.html       # メインレイアウト
├── static/
│   ├── css/                # スタイルシート
│   ├── js/                 # JavaScript
│   ├── data/                       # 生成データ（JSON）
│   │   ├── activity_logs/          # 山行ログ（yyyymmdd_name/info.yaml, track.gpx）
│   │   └── training_logs/          # トレーニングログ（同上）
│   └── slides/             # スライド画像
│       └── originals/      # バックアップ（元画像）
├── generate-info.js       # INFOバナー生成スクリプト
├── generate-slides-list.js  # スライドリスト生成スクリプト
├── generate-logs.js       # 山行/トレーニングログ生成スクリプト
├── resize-images.py       # 画像リサイズスクリプト
└── Makefile               # ビルドコマンド
```

