# 開発者向けセットアップガイド

このドキュメントは、糞取山酷会ウェブサイトの開発環境セットアップと使い方について説明します。

## 必要なツール

| ツール | 用途 |
|--------|------|
| Make | ビルドコマンドの実行 |
| Node.js | スライドリスト・ログ生成スクリプト |
| VSS | 静的サイトジェネレーター |

---

## 一括セットアップ

### macOS

```bash
# 1. Homebrew経由で必要なツールをインストール
brew install make node

# 2. VSSをダウンロード
curl -OL https://github.com/vssio/go-vss/releases/latest/download/vss_darwin_arm64.tar.gz
tar -xvf vss_darwin_arm64.tar.gz
chmod +x vss
```

### Linux

```bash
# 1. パッケージマネージャーでツールをインストール（Ubuntu/Debian）
sudo apt update
sudo apt install -y make nodejs npm

# 2. VSSをダウンロード
make setup
```

### Windows

```powershell
# 1. winget でNode.jsをインストール
winget install OpenJS.NodeJS

# 2. VSSをダウンロード
make setup-win
```

---

## Makeコマンド一覧

### セットアップ

| コマンド | 説明 | 対応OS |
|----------|------|--------|
| `make setup` | VSSをダウンロード | Linux |
| `make setup-win` | VSSをダウンロード | Windows |
| `make clean` | VSSの関連ファイルを削除 | 全OS |

### ビルド

| コマンド | 説明 | 対応OS |
|----------|------|--------|
| `make build` | サイトをビルド | Linux/macOS |
| `make build-win` | サイトをビルド | Windows |

### 開発サーバー

| コマンド | 説明 | 対応OS |
|----------|------|--------|
| `make serve` | 開発サーバーを起動 | Linux/macOS |
| `make serve-win` | 開発サーバーを起動 | Windows |

---

## VSS（静的サイトジェネレーター）の使い方

VSS は Go言語で書かれた軽量な静的サイトジェネレーターです。友だちが作っているもので、当サイトの要望をフルに取り入れてもらいミニマムで作ってもらっています。

[VSS: Easy-to-use static site generator](https://github.com/veltiosoft/vss)

### 基本コマンド

```bash
# サイトをビルド（distディレクトリに出力）
vss build

# 開発サーバーを起動（ファイル変更を自動検知）
vss serve

# ヘルプを表示
vss --help
```

### 設定ファイル（vss.toml）

```toml
site_title = "サイト名"
site_description = "サイトの説明"
base_url = "https://example.com/"

[build]
ignore_files = ["README.md"]  # ビルドから除外するファイル
```

### ディレクトリ構造

```
.
├── index.md              # トップページ（Markdownで記述）
├── layouts/
│   └── default.html      # HTMLテンプレート
├── static/               # 静的ファイル（そのままコピーされる）
│   ├── css/
│   ├── js/
│   └── slides/
├── dist/                 # ビルド出力先
└── vss.toml              # VSS設定ファイル
```

---

## 開発ワークフロー

※適当でいいです。ガンガンmainブランチにpushしてもらってOKです。

### 1. リポジトリをクローン

```bash
git clone <repository-url>
cd sankoku
```

### 2. セットアップ（初回のみ）

上記の「一括セットアップ」を参照してください。

### 3. 開発サーバーを起動

```bash
# macOS/Linux
make serve

# Windows
make serve-win
```

ブラウザで `http://localhost:8080` にアクセスしてプレビューを確認できます。

### 4. 本番ビルド

```bash
# macOS/Linux
make build

# Windows
make build-win
```

`dist/` ディレクトリに静的ファイルが生成されます。

### 5. デプロイ

mainブランチにプッシュすると、GitHub Actionsが自動でビルド・デプロイを行います。