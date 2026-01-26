const fs = require('fs');
const path = require('path');

// シンプルなYAMLパーサー（山行記録用に特化）
function parseSimpleYaml(content) {
  const result = {};
  // CRLF/LFどちらも対応
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 空行やコメント行をスキップ
    if (line.trim() === '' || line.trim().startsWith('#')) {
      i++;
      continue;
    }

    // トップレベルのキー: 値
    const match = line.match(/^(\w+):\s*(.*)$/);
    if (match) {
      const key = match[1];
      const value = match[2].trim();

      // 空配列
      if (value === '[]') {
        result[key] = [];
        i++;
        continue;
      }

      // null
      if (value === 'null' || value === '~') {
        result[key] = null;
        i++;
        continue;
      }

      // インライン値がある場合
      if (value !== '' && value !== '|') {
        // 数値
        if (!isNaN(value) && value !== '') {
          result[key] = parseFloat(value);
        }
        // クォートされた文字列
        else if ((value.startsWith('"') && value.endsWith('"')) ||
                 (value.startsWith("'") && value.endsWith("'"))) {
          result[key] = value.slice(1, -1);
        }
        // 通常の文字列
        else {
          result[key] = value;
        }
        i++;
        continue;
      }

      // マルチライン文字列
      if (value === '|') {
        const multilineValue = [];
        i++;
        while (i < lines.length && (lines[i].startsWith('  ') || lines[i].trim() === '')) {
          if (lines[i].trim() !== '') {
            multilineValue.push(lines[i].replace(/^  /, ''));
          }
          i++;
        }
        result[key] = multilineValue.join('\n').trim();
        continue;
      }

      // 値が空の場合 - 次の行を見てオブジェクトか配列か判断
      if (value === '') {
        i++;
        // 次の行を確認
        if (i < lines.length) {
          const nextLine = lines[i];
          // 配列の場合
          if (nextLine.match(/^  - /)) {
            const arr = [];
            while (i < lines.length && lines[i].match(/^  - /)) {
              let itemValue = lines[i].replace(/^  - /, '').trim();
              // クォートを除去
              if ((itemValue.startsWith('"') && itemValue.endsWith('"')) ||
                  (itemValue.startsWith("'") && itemValue.endsWith("'"))) {
                itemValue = itemValue.slice(1, -1);
              }
              arr.push(itemValue);
              i++;
            }
            result[key] = arr;
            continue;
          }
          // オブジェクトの場合
          else if (nextLine.match(/^  \w+:/)) {
            const obj = {};
            while (i < lines.length && lines[i].match(/^  \w+:/)) {
              const objMatch = lines[i].match(/^  (\w+):\s*(.*)$/);
              if (objMatch) {
                let objValue = objMatch[2].trim();
                // 数値変換
                if (!isNaN(objValue) && objValue !== '') {
                  objValue = parseFloat(objValue);
                }
                obj[objMatch[1]] = objValue;
              }
              i++;
            }
            result[key] = obj;
            continue;
          }
        }
        // それ以外は空文字列
        result[key] = '';
        continue;
      }
    }

    i++;
  }

  return result;
}

// GPXファイルから最高標高地点の座標と標高を取得
function getDataFromGPX(gpxPath) {
  try {
    const content = fs.readFileSync(gpxPath, 'utf8');

    // トラックポイントを抽出
    const trkptRegex = /<trkpt lat="([^"]+)" lon="([^"]+)"[^>]*>[\s\S]*?<ele>([^<]+)<\/ele>/g;
    let match;
    let maxEle = -Infinity;
    let location = null;

    while ((match = trkptRegex.exec(content)) !== null) {
      const lat = parseFloat(match[1]);
      const lon = parseFloat(match[2]);
      const ele = parseFloat(match[3]);

      if (ele > maxEle) {
        maxEle = ele;
        location = { lat, lng: lon };
      }
    }

    return {
      location,
      altitude: maxEle !== -Infinity ? Math.round(maxEle) : null
    };
  } catch (error) {
    console.warn(`  Warning: Could not read GPX file: ${gpxPath}`);
    return { location: null, altitude: null };
  }
}

// パス設定
const logsDir = path.join(__dirname, 'static', 'data', 'logs');
const outputFile = path.join(__dirname, 'static', 'data', 'logs.json');

try {
  // logsフォルダが存在するか確認
  if (!fs.existsSync(logsDir)) {
    console.log(`Creating ${logsDir}`);
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // サブフォルダ一覧を取得（yyyymmdd_name 形式）
  const entries = fs.readdirSync(logsDir, { withFileTypes: true });
  const logFolders = entries
    .filter(entry => entry.isDirectory() && /^\d{8}_/.test(entry.name))
    .map(entry => entry.name);

  if (logFolders.length === 0) {
    console.log('No log folders found in logs directory');
    fs.writeFileSync(outputFile, JSON.stringify({ logs: [] }, null, 2));
    console.log('✓ Generated empty logs.json');
    process.exit(0);
  }

  // 各フォルダを処理
  const logs = logFolders.map(folder => {
    const folderPath = path.join(logsDir, folder);
    const yamlPath = path.join(folderPath, 'info.yaml');
    const gpxPath = path.join(folderPath, 'track.gpx');

    // info.yamlを読み込み
    if (!fs.existsSync(yamlPath)) {
      console.warn(`  Warning: No info.yaml in ${folder}`);
      return null;
    }

    const content = fs.readFileSync(yamlPath, 'utf8');
    const data = parseSimpleYaml(content);

    // GPXファイルの有無を確認
    const hasGpx = fs.existsSync(gpxPath);

    // GPXから位置情報と標高を取得
    let gpxData = { location: null, altitude: null };
    if (hasGpx) {
      gpxData = getDataFromGPX(gpxPath);
    }

    // YAMLのaltitudeよりGPXのaltitudeを優先
    const altitude = gpxData.altitude !== null ? gpxData.altitude : (data.altitude || null);

    // フォルダ名をIDとして使用
    return {
      id: folder,
      ...data,
      altitude,
      location: gpxData.location,
      gpx: hasGpx ? `${folder}/track.gpx` : null
    };
  }).filter(log => log !== null);

  // 日付で降順ソート
  logs.sort((a, b) => new Date(b.date) - new Date(a.date));

  // JSONファイルとして保存
  fs.writeFileSync(outputFile, JSON.stringify({ logs }, null, 2));

  console.log(`✓ Generated logs.json with ${logs.length} records`);
  logs.forEach(log => {
    const gpxStatus = log.gpx ? '📍' : '  ';
    console.log(`  ${gpxStatus} ${log.id}: ${log.mountain} (${log.date})`);
  });

} catch (error) {
  console.error('Error generating logs:', error);
  process.exit(1);
}
