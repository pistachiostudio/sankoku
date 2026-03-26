const fs = require('fs');
const path = require('path');

const infoMdPath = path.join(__dirname, 'INFO-message.md');
const outputPath = path.join(__dirname, 'static', 'data', 'info.json');

// シンプルなMarkdown→HTML変換
function simpleMarkdownToHtml(text) {
  // <!-- ... --> コメントを除去（複数行対応）
  let html = text.replace(/<!--[\s\S]*?-->/g, '');

  // **text** → <strong>text</strong>
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

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

// 複数フロントマターブロックをパース
// --- で区切られたブロックを複数取得し、最後の本文も返す
function parseMultipleFrontmatters(content) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    // --- の開始を探す
    if (lines[i].trim() === '---') {
      const startIdx = i;
      i++;
      // --- の終了を探す
      while (i < lines.length && lines[i].trim() !== '---') {
        i++;
      }
      if (i < lines.length) {
        // フロントマターをパース
        const frontmatter = {};
        for (let j = startIdx + 1; j < i; j++) {
          const match = lines[j].match(/^(\w+):\s*(.*)$/);
          if (match) {
            frontmatter[match[1]] = match[2].trim();
          }
        }
        blocks.push(frontmatter);
        i++; // --- の次の行へ
      }
    } else {
      break; // フロントマター以外の行に到達
    }

    // ブロック間の空行をスキップ
    while (i < lines.length && lines[i].trim() === '') {
      i++;
    }
  }

  // 残りの本文
  const body = lines.slice(i).join('\n').trim();

  return { blocks, body };
}

try {
  // INFO-message.md が存在するか確認
  if (!fs.existsSync(infoMdPath)) {
    console.log('INFO-message.md not found, skipping info.json generation');
    process.exit(0);
  }

  // ファイルを読み込み
  const content = fs.readFileSync(infoMdPath, 'utf8');
  const { blocks, body } = parseMultipleFrontmatters(content);

  // 最初のブロックからtitleを取得
  const title = (blocks[0] && blocks[0].title) || 'INFO';

  // HTMLに変換
  const htmlContent = simpleMarkdownToHtml(body);

  // JSONを生成
  const result = {
    title: title,
    content: htmlContent
  };

  // イベント情報を配列で追加
  const events = blocks
    .filter(b => b.event_date || b.event_name || b.event_area)
    .map(b => ({
      date: b.event_date || '',
      name: b.event_name || '',
      area: b.event_area || ''
    }));

  if (events.length > 0) {
    result.events = events;
  }

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
  if (result.events) {
    result.events.forEach((e, i) => {
      console.log(`  Event ${i + 1}: ${e.name} (${e.date})`);
    });
  }

} catch (error) {
  console.error('Error generating info.json:', error);
  process.exit(1);
}
