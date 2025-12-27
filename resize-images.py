#!/usr/bin/env python3
"""
画像を一括でリサイズするスクリプト
横幅2000ピクセルにリサイズし、品質を85%に設定してファイルサイズを削減
処理済み画像は記録ファイルで管理し、二重処理を防ぐ
"""
import os
import json
from pathlib import Path
from datetime import datetime
from PIL import Image

# 設定
MAX_WIDTH = 2000
QUALITY = 85
INPUT_DIR = Path("static/slides")
BACKUP_DIR = Path("static/slides/originals")
PROCESSED_FILE = INPUT_DIR / ".processed_images.json"

def load_processed_images():
    """処理済み画像リストを読み込む"""
    if PROCESSED_FILE.exists():
        with open(PROCESSED_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_processed_images(processed_data):
    """処理済み画像リストを保存"""
    with open(PROCESSED_FILE, 'w', encoding='utf-8') as f:
        json.dump(processed_data, f, ensure_ascii=False, indent=2)

def is_already_processed(image_path, processed_data):
    """画像が既に処理済みかチェック"""
    filename = image_path.name
    if filename in processed_data:
        # ファイルが存在し、サイズが変わっていなければ処理済み
        if image_path.exists():
            current_mtime = os.path.getmtime(image_path)
            recorded_mtime = processed_data[filename].get('mtime', 0)
            # 処理後にファイルが変更されていなければスキップ
            if abs(current_mtime - recorded_mtime) < 1:  # 1秒以内の差は許容
                return True
    return False

def resize_image(image_path, max_width=MAX_WIDTH, quality=QUALITY, processed_data=None):
    """画像をリサイズして保存"""
    if processed_data is None:
        processed_data = {}

    try:
        # 処理済みチェック
        if is_already_processed(image_path, processed_data):
            print(f"\nスキップ: {image_path.name} (処理済み)")
            return False, processed_data

        with Image.open(image_path) as img:
            # 元のサイズを表示
            original_size = os.path.getsize(image_path) / (1024 * 1024)  # MB
            print(f"\n処理中: {image_path.name}")
            print(f"  元のサイズ: {img.size[0]}x{img.size[1]}, {original_size:.2f}MB")

            # 既に小さい場合はスキップ（ただし処理済みとして記録）
            if img.size[0] <= max_width:
                print(f"  スキップ: 既に{max_width}px以下です")
                # 処理済みとして記録
                processed_data[image_path.name] = {
                    'processed_at': datetime.now().isoformat(),
                    'original_width': img.size[0],
                    'skipped': True,
                    'mtime': os.path.getmtime(image_path)
                }
                return False, processed_data

            # アスペクト比を維持してリサイズ
            ratio = max_width / img.size[0]
            new_height = int(img.size[1] * ratio)
            resized = img.resize((max_width, new_height), Image.Resampling.LANCZOS)

            # 元の画像をバックアップ
            if not BACKUP_DIR.exists():
                BACKUP_DIR.mkdir(parents=True)
            backup_path = BACKUP_DIR / image_path.name
            if not backup_path.exists():
                os.rename(image_path, backup_path)
                print(f"  バックアップ: {backup_path}")

            # 保存（JPEGの場合は品質設定を使用）
            if image_path.suffix.lower() in ['.jpg', '.jpeg']:
                resized.save(image_path, 'JPEG', quality=quality, optimize=True)
            else:
                resized.save(image_path, optimize=True)

            new_size = os.path.getsize(image_path) / (1024 * 1024)  # MB
            print(f"  新しいサイズ: {max_width}x{new_height}, {new_size:.2f}MB")
            print(f"  削減: {original_size - new_size:.2f}MB ({(1 - new_size/original_size)*100:.1f}%)")

            # 処理済みとして記録
            processed_data[image_path.name] = {
                'processed_at': datetime.now().isoformat(),
                'original_width': img.size[0],
                'original_size_mb': round(original_size, 2),
                'new_size_mb': round(new_size, 2),
                'mtime': os.path.getmtime(image_path)
            }
            return True, processed_data

    except Exception as e:
        print(f"エラー: {image_path.name} - {e}")
        return False, processed_data

def main():
    """メイン処理"""
    if not INPUT_DIR.exists():
        print(f"エラー: {INPUT_DIR} が見つかりません")
        return

    # 処理済みデータを読み込む
    processed_data = load_processed_images()
    print(f"処理済み画像記録: {len(processed_data)}件")

    # 画像ファイルを取得
    image_extensions = {'.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'}
    image_files = [f for f in INPUT_DIR.iterdir()
                   if f.is_file() and f.suffix in image_extensions]

    if not image_files:
        print("画像ファイルが見つかりません")
        return

    print(f"\n=== 画像リサイズ開始 ===")
    print(f"対象: {len(image_files)}枚")
    print(f"最大幅: {MAX_WIDTH}px")
    print(f"品質: {QUALITY}%")

    processed = 0
    skipped = 0
    for image_file in sorted(image_files):
        result, processed_data = resize_image(image_file, processed_data=processed_data)
        if result:
            processed += 1
        else:
            # 処理済みでスキップされた場合もカウント
            if is_already_processed(image_file, processed_data):
                skipped += 1

    # 処理済みデータを保存
    save_processed_images(processed_data)

    print(f"\n=== 完了 ===")
    print(f"処理済み: {processed}枚")
    print(f"スキップ: {skipped}枚")
    if processed > 0:
        print(f"バックアップ: {BACKUP_DIR}")
    print(f"処理記録: {PROCESSED_FILE}")

if __name__ == "__main__":
    main()
