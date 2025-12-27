const fs = require('fs');
const path = require('path');

// slidesフォルダのパス
const slidesDir = path.join(__dirname, 'static', 'slides');
const outputFile = path.join(slidesDir, 'slides.json');

// 画像ファイルの拡張子
const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.JPG', '.JPEG', '.PNG', '.GIF', '.WEBP'];

try {
  // slidesフォルダが存在するか確認
  if (!fs.existsSync(slidesDir)) {
    console.error(`Error: ${slidesDir} does not exist`);
    process.exit(1);
  }

  // フォルダ内のファイル一覧を取得
  const files = fs.readdirSync(slidesDir);

  // 画像ファイルだけをフィルタリング
  const imageFiles = files.filter(file => {
    const ext = path.extname(file);
    return imageExtensions.includes(ext);
  }).sort(); // ファイル名順にソート

  // JSONファイルとして保存
  fs.writeFileSync(outputFile, JSON.stringify(imageFiles, null, 2));

  console.log(`✓ Generated slides.json with ${imageFiles.length} images`);
  console.log(`  Files: ${imageFiles.join(', ')}`);
} catch (error) {
  console.error('Error generating slides list:', error);
  process.exit(1);
}
