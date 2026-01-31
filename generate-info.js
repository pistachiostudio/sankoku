const fs = require('fs');
const path = require('path');

const infoMdPath = path.join(__dirname, 'INFO-message.md');
const outputPath = path.join(__dirname, 'static', 'data', 'info.json');

// シンプルなMarkdown→HTML変換
function simpleMarkdownToHtml(text) {
  // **text** → <strong>text</strong>
  let html = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // 段落分け（空行で区切り）
  const paragraphs = html.split(/\n\s*\n/);

  // 各段落内の改行を<br>に変換し、<p>で囲む
  html = paragraphs
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('');

  return html;
}

// YAMLフロントマターをパース
function parseFrontmatter(content) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');

  // フロントマターの開始を確認
  if (lines[0].trim() !== '---') {
    return { frontmatter: {}, body: content };
  }

  // フロントマターの終了位置を探す
  let endIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    return { frontmatter: {}, body: content };
  }

  // フロントマターをパース
  const frontmatter = {};
  for (let i = 1; i < endIndex; i++) {
    const match = lines[i].match(/^(\w+):\s*(.*)$/);
    if (match) {
      frontmatter[match[1]] = match[2].trim();
    }
  }

  // 本文を取得
  const body = lines.slice(endIndex + 1).join('\n').trim();

  return { frontmatter, body };
}

try {
  // INFO-message.md が存在するか確認
  if (!fs.existsSync(infoMdPath)) {
    console.log('INFO-message.md not found, skipping info.json generation');
    process.exit(0);
  }

  // ファイルを読み込み
  const content = fs.readFileSync(infoMdPath, 'utf8');
  const { frontmatter, body } = parseFrontmatter(content);

  // HTMLに変換
  const htmlContent = simpleMarkdownToHtml(body);

  // JSONを生成
  const result = {
    title: frontmatter.title || 'INFO',
    content: htmlContent
  };

  // 出力ディレクトリが存在するか確認
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // JSONファイルとして保存
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

  console.log('✓ Generated info.json');
  console.log(`  Title: ${result.title}`);
  console.log(`  Content: ${result.content.substring(0, 50)}...`);

} catch (error) {
  console.error('Error generating info.json:', error);
  process.exit(1);
}
