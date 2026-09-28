// ============================================
// Theme Colors
// ============================================
// Leaflet's SVG renderer and Chart.js both need a resolved color string,
// not a raw `var(--x)` reference, so read the current theme's CSS custom
// properties once and reuse the actual value. Keeps this file in sync with
// static/css/log-viewer.css's :root without duplicating hex codes here.
function themeColor(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Same as themeColor() but as an rgba() string with the given alpha, for
// chart fills that need a translucent version of a theme color.
function themeColorAlpha(name, alpha) {
    const hex = themeColor(name).replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ============================================
// Global State
// ============================================
let logsData = [];
let markers = [];
let map;
let gpxMaps = {}; // Store GPX maps by log ID
let gpxCharts = {}; // Store charts by log ID
let gpxData = {}; // Store loaded GPX data by log ID
let playbackStates = {}; // Store playback states by log ID

// ============================================
// Initialize Main Map
// ============================================
function initMap() {
    map = L.map('map').setView([37.0, 138.5], 6);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);
}

// ============================================
// Custom Marker Icon
// ============================================
function createMarkerIcon(hasGpx = false) {
    const color = hasGpx ? themeColor('--title-color') : themeColor('--main-font-color');
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="
            width: 24px;
            height: 24px;
            background: ${color};
            border: 3px solid ${themeColor('--main-bg-color')};
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 2px 2px 0 rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 24],
        popupAnchor: [0, -24]
    });
}

// ============================================
// Load Data
// ============================================
async function loadData() {
    try {
        const response = await fetch('data/activity_logs.json');
        const data = await response.json();
        logsData = data.activity_logs;

        updateStats();
        populateFilters();
        renderList();
        renderMarkers();
    } catch (error) {
        console.error('Failed to load data:', error);
    }
}

// ============================================
// Update Statistics
// ============================================
function updateStats() {
    document.getElementById('total-climbs').textContent = logsData.length;

    if (logsData.length > 0) {
        const highest = logsData.reduce((max, c) => c.altitude > max.altitude ? c : max, logsData[0]);
        document.getElementById('highest-peak').textContent = `${highest.mountain} (${highest.altitude}m)`;
    }

    const allMembers = new Set();
    logsData.forEach(c => c.members.forEach(m => allMembers.add(m)));
    document.getElementById('total-members').textContent = allMembers.size;
}

// ============================================
// Populate Filter Dropdowns
// ============================================
function populateFilters() {
    const memberFilter = document.getElementById('member-filter');
    const areaFilter = document.getElementById('area-filter');

    const members = new Set();
    const areas = new Set();

    logsData.forEach(log => {
        log.members.forEach(m => members.add(m));
        if (log.area) areas.add(log.area);
    });

    [...members].sort().forEach(member => {
        const option = document.createElement('option');
        option.value = member;
        option.textContent = member;
        memberFilter.appendChild(option);
    });

    [...areas].sort().forEach(area => {
        const option = document.createElement('option');
        option.value = area;
        option.textContent = area;
        areaFilter.appendChild(option);
    });
}

// ============================================
// Get Filtered Data
// ============================================
function getFilteredData() {
    const memberFilter = document.getElementById('member-filter').value;
    const areaFilter = document.getElementById('area-filter').value;

    return logsData.filter(log => {
        const memberMatch = !memberFilter || log.members.includes(memberFilter);
        const areaMatch = !areaFilter || log.area === areaFilter;
        return memberMatch && areaMatch;
    });
}

// ============================================
// Render List View (Accordion Style)
// ============================================
function renderList() {
    const listEl = document.getElementById('climb-list');
    const filtered = getFilteredData();
    const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

    listEl.innerHTML = sorted.map(log => {
        const gpxBadge = log.gpx ? '<span class="gpx-badge">GPX</span>' : '';
        const fitBadge = log.fit ? '<span class="fit-badge">FIT</span>' : '';
        const trackBadge = fitBadge || gpxBadge;
        const membersHtml = log.members.map(m => `<span class="member-tag">${m}</span>`).join('');

        return `
            <li class="climb-item" id="item-${log.id}">
                <div class="climb-item-header" onclick="toggleDetail('${log.id}')">
                    <div class="climb-item-title">
                        <span class="climb-mountain">${log.mountain} ${trackBadge}</span>
                        <span class="climb-altitude">${log.altitude ? log.altitude + 'm' : ''}</span>
                        <span class="climb-date">${log.date}</span>
                    </div>
                    <span class="expand-icon">▶</span>
                </div>
                <div class="climb-detail">
                    <div class="detail-row">
                        <div class="detail-info">
                            <div class="detail-section">
                                <div class="detail-section-title">AREA</div>
                                <div>${log.area}</div>
                            </div>
                            <div class="detail-section">
                                <div class="detail-section-title">MEMBERS</div>
                                <div class="member-tags">${membersHtml}</div>
                            </div>
                            ${log.note ? `
                            <div class="detail-section">
                                <div class="detail-section-title">NOTE</div>
                                <div class="detail-note">${log.note}</div>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="gpx-section" id="gpx-section-${log.id}">
                        ${(log.gpx || log.fit) ? `
                            <div class="loading-gpx" id="loading-${log.id}">Loading track data...</div>
                            <div id="gpx-content-${log.id}" style="display: none;">
                                <div class="gpx-map-container" id="gpx-map-${log.id}"></div>
                                <div class="gpx-stats-grid">
                                    <div class="gpx-stat-box">
                                        <div class="gpx-stat-label">DISTANCE</div>
                                        <div class="gpx-stat-value" id="stat-distance-${log.id}">-</div>
                                        <div class="gpx-stat-unit">km</div>
                                    </div>
                                    <div class="gpx-stat-box">
                                        <div class="gpx-stat-label">ELEV GAIN</div>
                                        <div class="gpx-stat-value" id="stat-gain-${log.id}">-</div>
                                        <div class="gpx-stat-unit">m</div>
                                    </div>
                                    <div class="gpx-stat-box">
                                        <div class="gpx-stat-label">MAX ELEV</div>
                                        <div class="gpx-stat-value" id="stat-max-${log.id}">-</div>
                                        <div class="gpx-stat-unit">m</div>
                                    </div>
                                    <div class="gpx-stat-box">
                                        <div class="gpx-stat-label">DURATION</div>
                                        <div class="gpx-stat-value" id="stat-duration-${log.id}">-</div>
                                        <div class="gpx-stat-unit"></div>
                                    </div>
                                    <div class="gpx-stat-box pace" id="stat-pace-box-${log.id}" style="display: none;">
                                        <div class="gpx-stat-label">AVG PACE</div>
                                        <div class="gpx-stat-value" id="stat-avg-pace-${log.id}">-</div>
                                        <div class="gpx-stat-unit">min/km</div>
                                    </div>
                                    <div class="gpx-stat-box hr" id="stat-hr-box-${log.id}" style="display: none;">
                                        <div class="gpx-stat-label">AVG HR</div>
                                        <div class="gpx-stat-value" id="stat-avg-hr-${log.id}">-</div>
                                        <div class="gpx-stat-unit">bpm</div>
                                    </div>
                                    <div class="gpx-stat-box hr" id="stat-max-hr-box-${log.id}" style="display: none;">
                                        <div class="gpx-stat-label">MAX HR</div>
                                        <div class="gpx-stat-value" id="stat-max-hr-${log.id}">-</div>
                                        <div class="gpx-stat-unit">bpm</div>
                                    </div>
                                    <div class="gpx-stat-box cadence" id="stat-cadence-box-${log.id}" style="display: none;">
                                        <div class="gpx-stat-label">AVG CADENCE</div>
                                        <div class="gpx-stat-value" id="stat-avg-cadence-${log.id}">-</div>
                                        <div class="gpx-stat-unit">spm</div>
                                    </div>
                                </div>
                                <div class="chart-container">
                                    <div class="chart-header">
                                        <h4 class="chart-title">METRICS</h4>
                                        <div class="playback-controls">
                                            <select class="speed-select" id="speed-${log.id}">
                                                <option value="50">x4</option>
                                                <option value="100" selected>x2</option>
                                                <option value="200">x1</option>
                                                <option value="400">x0.5</option>
                                            </select>
                                            <button class="play-btn" id="play-${log.id}" onclick="togglePlayback('${log.id}')">▶ PLAY</button>
                                        </div>
                                    </div>
                                    <div class="chart-section">
                                        <div class="chart-section-label">ELEVATION</div>
                                        <div class="chart-wrapper" style="height: 100px;">
                                            <canvas id="elev-chart-${log.id}"></canvas>
                                        </div>
                                    </div>
                                    <div class="chart-section" id="metrics-chart-wrapper-${log.id}" style="display: none;">
                                        <div class="chart-section-label">METRICS</div>
                                        <div class="chart-wrapper" style="height: 150px;">
                                            <canvas id="chart-${log.id}"></canvas>
                                        </div>
                                        <div class="chart-toggles" id="chart-toggles-${log.id}">
                                            <div class="chart-toggle-item" id="toggle-pace-${log.id}" style="display: none;">
                                                <input type="checkbox" id="chk-pace-${log.id}" checked onchange="toggleMetric('${log.id}', 'pace', this.checked)">
                                                <label class="chart-toggle-label pace" for="chk-pace-${log.id}">PACE</label>
                                                <span class="chart-toggle-value" id="toggle-pace-val-${log.id}">-</span>
                                                <span class="chart-toggle-unit">/km</span>
                                            </div>
                                            <div class="chart-toggle-item" id="toggle-hr-${log.id}" style="display: none;">
                                                <input type="checkbox" id="chk-hr-${log.id}" checked onchange="toggleMetric('${log.id}', 'heartrate', this.checked)">
                                                <label class="chart-toggle-label hr" for="chk-hr-${log.id}">HR</label>
                                                <span class="chart-toggle-value" id="toggle-hr-val-${log.id}">-</span>
                                                <span class="chart-toggle-unit">bpm</span>
                                            </div>
                                            <div class="chart-toggle-item" id="toggle-cadence-${log.id}" style="display: none;">
                                                <input type="checkbox" id="chk-cadence-${log.id}" checked onchange="toggleMetric('${log.id}', 'cadence', this.checked)">
                                                <label class="chart-toggle-label cadence" for="chk-cadence-${log.id}">CADENCE</label>
                                                <span class="chart-toggle-value" id="toggle-cadence-val-${log.id}">-</span>
                                                <span class="chart-toggle-unit">spm</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="position-info" id="position-${log.id}">
                                        <div><span>Distance:</span> <strong id="info-dist-${log.id}">-</strong></div>
                                        <div><span>Elevation:</span> <strong id="info-elev-${log.id}">-</strong></div>
                                        <div id="info-pace-row-${log.id}" style="display: none;"><span>Pace:</span> <strong id="info-pace-${log.id}">-</strong></div>
                                        <div id="info-hr-row-${log.id}" style="display: none;"><span>Heart Rate:</span> <strong id="info-hr-${log.id}">-</strong></div>
                                        <div id="info-cadence-row-${log.id}" style="display: none;"><span>Cadence:</span> <strong id="info-cadence-${log.id}">-</strong></div>
                                        <div><span>Time:</span> <strong id="info-time-${log.id}">-</strong></div>
                                        <div><span>Elapsed:</span> <strong id="info-elapsed-${log.id}">-</strong></div>
                                    </div>
                                </div>
                            </div>
                        ` : '<div class="no-gpx">No track data available</div>'}
                    </div>
                </div>
            </li>
        `;
    }).join('');
}

// ============================================
// Toggle Detail (Accordion)
// ============================================
function toggleDetail(logId) {
    const item = document.getElementById(`item-${logId}`);
    const wasExpanded = item.classList.contains('expanded');

    // Close all other items
    document.querySelectorAll('.climb-item.expanded').forEach(el => {
        if (el.id !== `item-${logId}`) {
            el.classList.remove('expanded');
            const otherId = el.id.replace('item-', '');
            stopPlayback(otherId);
        }
    });

    if (wasExpanded) {
        item.classList.remove('expanded');
        stopPlayback(logId);
    } else {
        item.classList.add('expanded');

        // Load track data (GPX or FIT) if available and not already loaded
        const log = logsData.find(l => l.id === logId);
        if (log && (log.gpx || log.fit) && !gpxData[logId]) {
            loadTrackData(logId, log);
        } else if (gpxMaps[logId]) {
            // Invalidate map size when re-opening
            setTimeout(() => gpxMaps[logId].invalidateSize(), 100);
        }

        // Scroll to the item
        setTimeout(() => {
            item.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
}

// ============================================
// Render Markers on Map
// ============================================
function renderMarkers() {
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    const filtered = getFilteredData();

    filtered.forEach(log => {
        if (!log.location) return;

        const marker = L.marker([log.location.lat, log.location.lng], {
            icon: createMarkerIcon(!!log.gpx)
        }).addTo(map);

        const gpxBadge = log.gpx ? `<span style="background:${themeColor('--title-color')};color:${themeColor('--main-bg-color')};padding:0 4px;margin-left:5px;font-size:0.8rem;">GPX</span>` : '';
        const popupContent = `
            <div class="popup-mountain">${log.mountain}${gpxBadge}</div>
            <div class="popup-info">
                ${log.altitude}m | ${log.area}<br>
                ${log.date}<br>
                ${log.members.join(', ')}
            </div>
            <span class="popup-link" onclick="showInList('${log.id}')">Show in list >></span>
        `;

        marker.bindPopup(popupContent);
        markers.push(marker);
    });

    if (markers.length > 0) {
        const group = L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.1));
    }
}

// ============================================
// Show in List (from Map popup)
// ============================================
function showInList(logId) {
    // Switch to list view
    document.querySelector('[data-view="list"]').click();

    // Expand the item
    setTimeout(() => {
        toggleDetail(logId);
    }, 100);
}

// ============================================
// GPX Functions
// ============================================
function parseGPX(gpxText) {
    const parser = new DOMParser();
    const gpx = parser.parseFromString(gpxText, 'text/xml');

    const trackpoints = gpx.querySelectorAll('trkpt');
    const points = [];
    let totalDistance = 0;
    let totalElevationGain = 0;
    let maxElevation = -Infinity;
    let minElevation = Infinity;
    let startTime = null;
    let endTime = null;

    let prevPoint = null;

    trackpoints.forEach((trkpt, index) => {
        const lat = parseFloat(trkpt.getAttribute('lat'));
        const lon = parseFloat(trkpt.getAttribute('lon'));
        const eleNode = trkpt.querySelector('ele');
        const timeNode = trkpt.querySelector('time');

        const ele = eleNode ? parseFloat(eleNode.textContent) : 0;
        const time = timeNode ? new Date(timeNode.textContent) : null;

        if (index === 0 && time) startTime = time;
        if (time) endTime = time;

        if (ele > maxElevation) maxElevation = ele;
        if (ele < minElevation) minElevation = ele;

        if (prevPoint) {
            const dist = calculateDistance(prevPoint.lat, prevPoint.lon, lat, lon);
            totalDistance += dist;

            const elevDiff = ele - prevPoint.ele;
            if (elevDiff > 0) totalElevationGain += elevDiff;
        }

        points.push({ lat, lon, ele, time, distance: totalDistance });
        prevPoint = { lat, lon, ele };
    });

    return {
        points,
        stats: {
            distance: totalDistance,
            elevationGain: totalElevationGain,
            maxElevation,
            minElevation,
            startTime,
            endTime,
            duration: startTime && endTime ? (endTime - startTime) / 1000 : 0
        }
    };
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
}

function formatPace(minPerKm) {
    if (!minPerKm || !isFinite(minPerKm) || minPerKm <= 0 || minPerKm > 30) return '-';
    const minutes = Math.floor(minPerKm);
    const seconds = Math.round((minPerKm - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// FITファイルをパースして共通フォーマットに変換
async function parseFIT(fitArrayBuffer) {
    try {
        // ArrayBufferをUint8Arrayに変換（fit-decoderの要件）
        const buffer = new Uint8Array(fitArrayBuffer).buffer;

        // fit-decoder を使用してFITをパース
        const jsonRaw = fitDecoder.fit2json(buffer);
        const parsed = fitDecoder.parseRecords(jsonRaw);

        // fit-decoderはオブジェクトを返す: { records: [{type, data}, ...], ... }
        // sessionレコードから集計データを取得（COROS/Stravaと同じ値になる）
        const sessionRecord = parsed.records.find(item => item.type === 'session');
        const sessionData = sessionRecord ? sessionRecord.data : null;

        // type === 'record' のエントリからデータを抽出
        // GPS異常値をフィルタリング（Stravaライクな処理）
        let records = [];
        if (parsed && parsed.records && Array.isArray(parsed.records)) {
            // Step 1: 基本的なフィルタリング（座標範囲外を除外）
            const validRecords = parsed.records
                .filter(item => {
                    if (item.type !== 'record') return false;
                    const d = item.data;
                    if (!d.position_lat || !d.position_long) return false;
                    // 異常な座標値を除外（GPS取得失敗時は179.99...になることがある）
                    if (d.position_lat > 90 || d.position_lat < -90) return false;
                    if (d.position_long > 180 || d.position_long < -180) return false;
                    return true;
                })
                .map(item => item.data);

            // Step 2: 急激な位置飛び（スパイク）を検出・除外
            // 2点間の距離を計算するヘルパー関数
            const haversineDistance = (lat1, lon1, lat2, lon2) => {
                const R = 6371000; // 地球の半径（メートル）
                const dLat = (lat2 - lat1) * Math.PI / 180;
                const dLon = (lon2 - lon1) * Math.PI / 180;
                const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                          Math.sin(dLon/2) * Math.sin(dLon/2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                return R * c;
            };

            // スパイク検出: 前後の点から急激に離れている点を除外
            records = validRecords.filter((record, index, arr) => {
                if (index === 0 || index === arr.length - 1) return true;

                const prev = arr[index - 1];
                const next = arr[index + 1];
                const curr = record;

                // 時間差を計算（秒）
                const timePrev = prev.timestamp ? new Date(prev.timestamp) : null;
                const timeCurr = curr.timestamp ? new Date(curr.timestamp) : null;
                const timeNext = next.timestamp ? new Date(next.timestamp) : null;

                if (!timePrev || !timeCurr || !timeNext) return true;

                const dtPrev = (timeCurr - timePrev) / 1000;
                const dtNext = (timeNext - timeCurr) / 1000;

                if (dtPrev <= 0 || dtNext <= 0) return true;

                // 距離を計算
                const distPrev = haversineDistance(prev.position_lat, prev.position_long, curr.position_lat, curr.position_long);
                const distNext = haversineDistance(curr.position_lat, curr.position_long, next.position_lat, next.position_long);
                const distDirect = haversineDistance(prev.position_lat, prev.position_long, next.position_lat, next.position_long);

                // 速度を計算（m/s）
                const speedPrev = distPrev / dtPrev;
                const speedNext = distNext / dtNext;

                // 非現実的な速度（50m/s = 180km/h以上）を検出
                const maxRealisticSpeed = 50;
                if (speedPrev > maxRealisticSpeed || speedNext > maxRealisticSpeed) {
                    // さらに確認：前後を直接つないだ距離が短ければスパイク
                    const directSpeed = distDirect / (dtPrev + dtNext);
                    if (directSpeed < maxRealisticSpeed * 0.5) {
                        return false; // スパイクとして除外
                    }
                }

                return true;
            });
        }

        const points = [];
        let totalElevationGain = 0;
        let maxElevation = -Infinity;
        let minElevation = Infinity;
        let startTime = null;
        let endTime = null;
        let prevEle = null;
        let totalHeartRate = 0;
        let heartRateCount = 0;
        let maxHeartRate = 0;
        let totalCadence = 0;
        let cadenceCount = 0;
        let totalSpeed = 0;
        let speedCount = 0;

        // Step 3: 標高スパイク除去（前の値との差が大きすぎる場合は前の値を使用）
        let lastValidEle = null;

        records.forEach((record, index) => {
            const lat = record.position_lat;
            const lon = record.position_long;

            // 標高: 前の値との差が100m以上ならスパイクとして除外
            let ele = record.altitude || record.enhanced_altitude || 0;
            if (lastValidEle !== null && Math.abs(ele - lastValidEle) > 100) {
                ele = lastValidEle; // スパイクは前の値で置換
            } else {
                lastValidEle = ele;
            }

            const time = record.timestamp ? new Date(record.timestamp) : null;
            // fit-decoderは距離をメートルに変換済み
            const distance = (record.distance || 0) / 1000; // メートルからkmに変換

            // 心拍数: 異常値フィルタ（30-220の範囲外は除外）
            let heartRate = record.heart_rate || null;
            if (heartRate && (heartRate < 30 || heartRate > 220)) {
                heartRate = null;
            }

            const cadence = record.cadence ? record.cadence * 2 : null; // ランニングは片足なので2倍
            // fit-decoderは速度をm/sに変換済み
            const speedMs = record.speed || record.enhanced_speed || null;
            const speed = speedMs ? speedMs * 3.6 : null; // m/s -> km/h

            if (index === 0 && time) startTime = time;
            if (time) endTime = time;

            if (ele > maxElevation) maxElevation = ele;
            if (ele < minElevation) minElevation = ele;

            // 獲得標高計算: ノイズ対策で2m以上の上昇のみカウント
            if (prevEle !== null) {
                const elevDiff = ele - prevEle;
                if (elevDiff > 2) {
                    totalElevationGain += elevDiff;
                }
            }
            prevEle = ele;

            if (heartRate) {
                totalHeartRate += heartRate;
                heartRateCount++;
                if (heartRate > maxHeartRate) maxHeartRate = heartRate;
            }

            if (cadence) {
                totalCadence += cadence;
                cadenceCount++;
            }

            if (speed && speed > 0) {
                totalSpeed += speed;
                speedCount++;
            }

            points.push({
                lat,
                lon,
                ele,
                time,
                distance,
                heartRate,
                cadence,
                speed,
                pace: speed && speed > 0 ? 60 / speed : null // min/km
            });
        });

        const lastDistance = points.length > 0 ? points[points.length - 1].distance : 0;
        const durationSeconds = startTime && endTime ? (endTime - startTime) / 1000 : 0;

        // sessionレコードから統計を取得（COROS/Stravaと同じ値）
        // avg_speedはm/s単位、ペース(min/km) = 60 / (speed * 3.6)
        const sessionAvgPace = sessionData && sessionData.avg_speed > 0
            ? 60 / (sessionData.avg_speed * 3.6)
            : null;

        return {
            points,
            stats: {
                distance: lastDistance,
                elevationGain: totalElevationGain,
                maxElevation,
                minElevation,
                startTime,
                endTime,
                duration: durationSeconds,
                avgHeartRate: sessionData?.avg_heart_rate || (heartRateCount > 0 ? Math.round(totalHeartRate / heartRateCount) : null),
                maxHeartRate: sessionData?.max_heart_rate || (maxHeartRate > 0 ? maxHeartRate : null),
                avgCadence: sessionData?.avg_cadence ? sessionData.avg_cadence * 2 : (cadenceCount > 0 ? Math.round(totalCadence / cadenceCount) : null),
                avgPace: sessionAvgPace
            },
            hasHeartRate: heartRateCount > 0,
            hasCadence: cadenceCount > 0,
            hasSpeed: speedCount > 0
        };
    } catch (error) {
        console.error('FIT parse error:', error);
        throw error;
    }
}

// GPXまたはFITを読み込む統合関数
async function loadTrackData(logId, log) {
    try {
        let trackData;

        if (log.fit) {
            // FITファイルを読み込み
            const response = await fetch(`data/activity_logs/${log.fit}`);
            const arrayBuffer = await response.arrayBuffer();
            trackData = await parseFIT(arrayBuffer);
        } else if (log.gpx) {
            // GPXファイルを読み込み（既存のparseGPX関数を使用）
            const response = await fetch(`data/activity_logs/${log.gpx}`);
            const gpxText = await response.text();
            trackData = parseGPX(gpxText);
            trackData.hasHeartRate = false;
            trackData.hasCadence = false;
            trackData.hasSpeed = false;
        }

        if (!trackData) return;

        gpxData[logId] = trackData;

        // Hide loading, show content
        document.getElementById(`loading-${logId}`).style.display = 'none';
        document.getElementById(`gpx-content-${logId}`).style.display = 'block';

        // Initialize GPX map (FITの場合は黄緑色、プライバシーゾーン適用)
        initGPXMap(logId, trackData, !!log.fit);

        // Update basic stats
        document.getElementById(`stat-distance-${logId}`).textContent = trackData.stats.distance.toFixed(1);
        document.getElementById(`stat-gain-${logId}`).textContent = Math.round(trackData.stats.elevationGain);
        document.getElementById(`stat-max-${logId}`).textContent = Math.round(trackData.stats.maxElevation);
        document.getElementById(`stat-duration-${logId}`).textContent = formatDuration(trackData.stats.duration);

        // Show FIT-specific stats and enable toggles if available
        if (trackData.hasSpeed && trackData.stats.avgPace) {
            document.getElementById(`stat-pace-box-${logId}`).style.display = 'block';
            document.getElementById(`stat-avg-pace-${logId}`).textContent = formatPace(trackData.stats.avgPace);
            document.getElementById(`toggle-pace-${logId}`).style.display = 'flex';
            document.getElementById(`toggle-pace-val-${logId}`).textContent = formatPace(trackData.stats.avgPace);
            document.getElementById(`info-pace-row-${logId}`).style.display = 'block';
        }

        if (trackData.hasHeartRate) {
            document.getElementById(`stat-hr-box-${logId}`).style.display = 'block';
            document.getElementById(`stat-avg-hr-${logId}`).textContent = trackData.stats.avgHeartRate;
            document.getElementById(`stat-max-hr-box-${logId}`).style.display = 'block';
            document.getElementById(`stat-max-hr-${logId}`).textContent = trackData.stats.maxHeartRate;
            document.getElementById(`toggle-hr-${logId}`).style.display = 'flex';
            document.getElementById(`toggle-hr-val-${logId}`).textContent = trackData.stats.avgHeartRate;
            document.getElementById(`info-hr-row-${logId}`).style.display = 'block';
        }

        if (trackData.hasCadence) {
            document.getElementById(`stat-cadence-box-${logId}`).style.display = 'block';
            document.getElementById(`stat-avg-cadence-${logId}`).textContent = trackData.stats.avgCadence;
            document.getElementById(`toggle-cadence-${logId}`).style.display = 'flex';
            document.getElementById(`toggle-cadence-val-${logId}`).textContent = trackData.stats.avgCadence;
            document.getElementById(`info-cadence-row-${logId}`).style.display = 'block';
        }

        // Sample points once for both charts (ensures alignment)
        const sampleRate = Math.max(1, Math.floor(trackData.points.length / 200));
        const sampledPoints = trackData.points.filter((_, i) => i % sampleRate === 0);
        playbackStates[logId].sampledPoints = sampledPoints;

        // Draw elevation chart (always shown)
        drawElevationChart(logId, sampledPoints);

        // Draw metrics chart if FIT data has metrics
        const hasMetrics = trackData.hasSpeed || trackData.hasHeartRate || trackData.hasCadence;
        if (hasMetrics) {
            document.getElementById(`metrics-chart-wrapper-${logId}`).style.display = 'block';
            drawMetricsChart(logId, sampledPoints, trackData);
        }

    } catch (error) {
        console.error('Failed to load track data:', error);
        document.getElementById(`loading-${logId}`).textContent = 'Failed to load track data';
    }
}

function initGPXMap(logId, trackData, isFit = false) {
    const mapContainer = document.getElementById(`gpx-map-${logId}`);
    const gpxMap = L.map(mapContainer).setView([36.5, 138.5], 6);

    const gsiLayer = L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png', {
        attribution: '&copy; 国土地理院',
        maxZoom: 18
    });

    const topoLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenTopoMap',
        maxZoom: 17
    });

    gsiLayer.addTo(gpxMap);
    L.control.layers({ '地理院地図': gsiLayer, 'OpenTopoMap': topoLayer }).addTo(gpxMap);

    // FITの場合: start/goal付近200mを非表示（プライバシー保護）
    let latlngs = trackData.points.map(p => [p.lat, p.lon]);
    if (isFit && trackData.points.length > 0) {
        const totalDist = trackData.points[trackData.points.length - 1].distance;
        const privacyZone = 0.2; // 200m = 0.2km
        latlngs = trackData.points
            .filter(p => p.distance > privacyZone && p.distance < totalDist - privacyZone)
            .map(p => [p.lat, p.lon]);
    }

    // Draw track (FITは title-color、GPXはmain-font-color)
    const trackColor = isFit ? themeColor('--title-color') : themeColor('--main-font-color');
    const trackLayer = L.polyline(latlngs, {
        color: trackColor,
        weight: 4,
        opacity: 0.9
    }).addTo(gpxMap);

    // Start/End markers (表示位置はプライバシーゾーン適用後の軌跡端点)
    if (latlngs.length > 0) {
        const startIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="width:18px;height:18px;background:${themeColor('--title-color')};border:2px solid ${themeColor('--main-bg-color')};border-radius:50%;display:flex;align-items:center;justify-content:center;color:${themeColor('--main-bg-color')};font-family:VT323;font-size:11px;font-weight:bold;">S</div>`,
            iconSize: [18, 18],
            iconAnchor: [9, 9]
        });

        // End marker stays a fixed red (goal marker) regardless of theme.
        const endIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="width:18px;height:18px;background:#F24C3D;border:2px solid ${themeColor('--main-bg-color')};border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-family:VT323;font-size:11px;font-weight:bold;">G</div>`,
            iconSize: [18, 18],
            iconAnchor: [9, 9]
        });

        L.marker(latlngs[0], { icon: startIcon }).addTo(gpxMap);
        L.marker(latlngs[latlngs.length - 1], { icon: endIcon }).addTo(gpxMap);
    }

    // Position marker for playback stays a fixed bright yellow (attention marker).
    const positionIcon = L.divIcon({
        className: 'position-marker',
        html: `<div style="width:14px;height:14px;background:#ffff00;border:2px solid ${themeColor('--main-bg-color')};border-radius:50%;box-shadow:0 0 8px rgba(255,255,0,0.8);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
    });
    const positionMarker = L.marker(latlngs[0], { icon: positionIcon, zIndexOffset: 1000 });

    gpxMap.fitBounds(trackLayer.getBounds().pad(0.1));

    gpxMaps[logId] = gpxMap;
    playbackStates[logId] = {
        positionMarker,
        isPlaying: false,
        index: 0,
        interval: null,
        currentIndex: -1
    };
}

// 標高グラフ（常時表示、シンプル）
let elevCharts = {};
function drawElevationChart(logId, sampledPoints) {
    const ctx = document.getElementById(`elev-chart-${logId}`).getContext('2d');

    if (elevCharts[logId]) {
        elevCharts[logId].destroy();
    }

    const labels = sampledPoints.map(p => p.distance.toFixed(1));
    const elevData = sampledPoints.map(p => p.ele);
    const minElev = Math.min(...elevData);
    const maxElev = Math.max(...elevData);

    // Vertical line plugin
    const verticalLinePlugin = {
        id: 'verticalLineElev',
        afterDraw: (chart) => {
            const state = playbackStates[logId];
            if (state && state.currentIndex !== undefined && state.currentIndex >= 0) {
                const ctx = chart.ctx;
                const xAxis = chart.scales.x;
                const yAxis = chart.scales.y;
                const x = xAxis.getPixelForValue(state.currentIndex);

                ctx.save();
                ctx.beginPath();
                ctx.moveTo(x, yAxis.top);
                ctx.lineTo(x, yAxis.bottom);
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#ffff00';
                ctx.stroke();
                ctx.restore();
            }
        }
    };

    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'elevation',
                data: elevData,
                borderColor: themeColor('--main-font-color'),
                backgroundColor: themeColorAlpha('--main-font-color', 0.3),
                fill: true,
                tension: 0.2,
                pointRadius: 0,
                borderWidth: 1
            }]
        },
        plugins: [verticalLinePlugin],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { left: 0, right: 30 } },
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: {
                x: {
                    display: false
                },
                y: {
                    display: true,
                    position: 'left',
                    min: Math.max(0, minElev - 20),
                    max: maxElev + 20,
                    ticks: {
                        color: themeColor('--main-font-color'),
                        font: { family: 'VT323', size: 10 },
                        maxTicksLimit: 3,
                        callback: (val) => val + 'm'
                    },
                    grid: { color: 'rgba(0, 88, 63, 0.3)' }
                }
            },
            onHover: (event, elements) => {
                if (playbackStates[logId].isPlaying) return;
                if (elements.length > 0) {
                    updatePositionMarker(logId, elements[0].index);
                }
            }
        }
    });

    elevCharts[logId] = chart;

    // Mouse leave handler
    document.getElementById(`elev-chart-${logId}`).addEventListener('mouseleave', () => {
        if (!playbackStates[logId].isPlaying) {
            const state = playbackStates[logId];
            state.currentIndex = -1;
            if (elevCharts[logId]) elevCharts[logId].draw();
            if (gpxCharts[logId]) gpxCharts[logId].draw();
            if (gpxMaps[logId] && gpxMaps[logId].hasLayer(state.positionMarker)) {
                gpxMaps[logId].removeLayer(state.positionMarker);
            }
            document.getElementById(`position-${logId}`).classList.remove('active');
        }
    });
}

// メトリクスグラフ（pace/HR/cadence、FIT専用）
function drawMetricsChart(logId, sampledPoints, trackData) {
    const ctx = document.getElementById(`chart-${logId}`).getContext('2d');

    if (gpxCharts[logId]) {
        gpxCharts[logId].destroy();
    }

    const labels = sampledPoints.map(p => p.distance.toFixed(1));
    const datasets = [];

    // ペース（青）
    if (trackData.hasSpeed) {
        datasets.push({
            label: 'pace',
            data: sampledPoints.map(p => p.pace && p.pace > 0 && p.pace < 30 ? p.pace : null),
            borderColor: '#3b82f6',
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.2,
            pointRadius: 0,
            borderWidth: 2,
            spanGaps: true,
            yAxisID: 'yPace'
        });
    }

    // 心拍数（赤）
    if (trackData.hasHeartRate) {
        datasets.push({
            label: 'heartrate',
            data: sampledPoints.map(p => p.heartRate),
            borderColor: '#ef4444',
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.2,
            pointRadius: 0,
            borderWidth: 2,
            spanGaps: true,
            yAxisID: 'yHeartRate'
        });
    }

    // ケイデンス（マゼンタ）
    if (trackData.hasCadence) {
        datasets.push({
            label: 'cadence',
            data: sampledPoints.map(p => p.cadence),
            borderColor: '#d946ef',
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.2,
            pointRadius: 0,
            borderWidth: 2,
            spanGaps: true,
            yAxisID: 'yCadence'
        });
    }

    // Vertical line plugin
    const verticalLinePlugin = {
        id: 'verticalLineMetrics',
        afterDraw: (chart) => {
            const state = playbackStates[logId];
            if (state && state.currentIndex !== undefined && state.currentIndex >= 0) {
                const ctx = chart.ctx;
                const xAxis = chart.scales.x;
                const chartArea = chart.chartArea;
                const x = xAxis.getPixelForValue(state.currentIndex);

                ctx.save();
                ctx.beginPath();
                ctx.moveTo(x, chartArea.top);
                ctx.lineTo(x, chartArea.bottom);
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#ffff00';
                ctx.stroke();
                ctx.restore();
            }
        }
    };

    const chart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        plugins: [verticalLinePlugin],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: {
                x: {
                    display: true,
                    title: { display: true, text: 'km', color: themeColor('--link-color'), font: { family: 'VT323' } },
                    ticks: { color: themeColor('--link-color'), font: { family: 'VT323' }, maxTicksLimit: 8 },
                    grid: { color: 'rgba(0, 88, 63, 0.3)' }
                },
                yPace: {
                    type: 'linear',
                    display: trackData.hasSpeed,
                    position: 'left',
                    reverse: true,
                    min: 3,
                    max: 15,
                    ticks: {
                        color: '#3b82f6',
                        font: { family: 'VT323', size: 11 },
                        callback: (val) => val + ':00'
                    },
                    grid: { display: false }
                },
                yHeartRate: {
                    type: 'linear',
                    display: trackData.hasHeartRate,
                    position: 'right',
                    min: 80,
                    max: 200,
                    ticks: {
                        color: '#ef4444',
                        font: { family: 'VT323', size: 11 }
                    },
                    grid: { display: false }
                },
                yCadence: {
                    type: 'linear',
                    display: false,
                    position: 'right',
                    min: 100,
                    max: 200
                }
            },
            onHover: (event, elements) => {
                if (playbackStates[logId].isPlaying) return;
                if (elements.length > 0) {
                    updatePositionMarker(logId, elements[0].index);
                }
            }
        }
    });

    gpxCharts[logId] = chart;

    // Mouse leave handler
    document.getElementById(`chart-${logId}`).addEventListener('mouseleave', () => {
        if (!playbackStates[logId].isPlaying) {
            const state = playbackStates[logId];
            state.currentIndex = -1;
            if (elevCharts[logId]) elevCharts[logId].draw();
            if (gpxCharts[logId]) gpxCharts[logId].draw();
            if (gpxMaps[logId] && gpxMaps[logId].hasLayer(state.positionMarker)) {
                gpxMaps[logId].removeLayer(state.positionMarker);
            }
            document.getElementById(`position-${logId}`).classList.remove('active');
        }
    });
}

// メトリクスの表示/非表示を切り替え
function toggleMetric(logId, metric, visible) {
    const chart = gpxCharts[logId];
    if (!chart) return;

    const dataset = chart.data.datasets.find(ds => ds.label === metric);
    if (dataset) {
        dataset.hidden = !visible;
        chart.update();
    }

    if (playbackStates[logId]) {
        playbackStates[logId].visibleMetrics[metric] = visible;
    }
}

function updatePositionMarker(logId, index) {
    const state = playbackStates[logId];
    const point = state.sampledPoints[index];
    if (!point) return;

    // Update vertical line position on both charts
    state.currentIndex = index;
    if (elevCharts[logId]) {
        elevCharts[logId].draw();
    }
    if (gpxCharts[logId]) {
        gpxCharts[logId].draw();
    }

    state.positionMarker.setLatLng([point.lat, point.lon]);
    if (!gpxMaps[logId].hasLayer(state.positionMarker)) {
        state.positionMarker.addTo(gpxMaps[logId]);
    }

    document.getElementById(`info-dist-${logId}`).textContent = point.distance.toFixed(2) + ' km';
    document.getElementById(`info-elev-${logId}`).textContent = Math.round(point.ele) + ' m';

    // FIT固有のデータ
    const paceEl = document.getElementById(`info-pace-${logId}`);
    if (paceEl) {
        paceEl.textContent = point.pace ? formatPace(point.pace) + ' /km' : '-';
    }

    const hrEl = document.getElementById(`info-hr-${logId}`);
    if (hrEl) {
        hrEl.textContent = point.heartRate ? point.heartRate + ' bpm' : '-';
    }

    const cadenceEl = document.getElementById(`info-cadence-${logId}`);
    if (cadenceEl) {
        cadenceEl.textContent = point.cadence ? point.cadence + ' spm' : '-';
    }

    if (point.time) {
        document.getElementById(`info-time-${logId}`).textContent = point.time.toLocaleTimeString('ja-JP');
        const startTime = state.sampledPoints[0].time;
        if (startTime) {
            document.getElementById(`info-elapsed-${logId}`).textContent = formatDuration((point.time - startTime) / 1000);
        }
    } else {
        document.getElementById(`info-time-${logId}`).textContent = '-';
        document.getElementById(`info-elapsed-${logId}`).textContent = '-';
    }

    document.getElementById(`position-${logId}`).classList.add('active');
}

function togglePlayback(logId) {
    const state = playbackStates[logId];
    if (state.isPlaying) {
        stopPlayback(logId);
    } else {
        startPlayback(logId);
    }
}

function startPlayback(logId) {
    const state = playbackStates[logId];
    if (!state.sampledPoints || state.sampledPoints.length === 0) return;

    state.isPlaying = true;
    document.getElementById(`play-${logId}`).textContent = '■ STOP';
    document.getElementById(`play-${logId}`).classList.add('playing');

    const speed = parseInt(document.getElementById(`speed-${logId}`).value);

    if (state.index >= state.sampledPoints.length - 1) {
        state.index = 0;
    }

    state.interval = setInterval(() => {
        if (state.index >= state.sampledPoints.length - 1) {
            stopPlayback(logId);
            return;
        }

        updatePositionMarker(logId, state.index);

        if (gpxCharts[logId]) {
            gpxCharts[logId].setActiveElements([{ datasetIndex: 0, index: state.index }]);
            gpxCharts[logId].update('none');
        }

        state.index++;
    }, speed);
}

function stopPlayback(logId) {
    const state = playbackStates[logId];
    if (!state) return;

    state.isPlaying = false;

    const playBtn = document.getElementById(`play-${logId}`);
    if (playBtn) {
        playBtn.textContent = '▶ PLAY';
        playBtn.classList.remove('playing');
    }

    if (state.interval) {
        clearInterval(state.interval);
        state.interval = null;
    }
}

// ============================================
// Event Listeners
// ============================================

// View toggle
let mapInitialized = false;
document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const view = btn.dataset.view;
        if (view === 'list') {
            document.getElementById('list-container').classList.remove('hidden');
            document.getElementById('map-container').classList.remove('active');
        } else {
            document.getElementById('list-container').classList.add('hidden');
            document.getElementById('map-container').classList.add('active');
            setTimeout(() => {
                map.invalidateSize();
                if (!mapInitialized) {
                    map.setView([37.0, 138.5], 6);
                    mapInitialized = true;
                }
            }, 100);
        }
    });
});

// Filter change handlers
document.getElementById('member-filter').addEventListener('change', () => {
    renderList();
    renderMarkers();
});
document.getElementById('area-filter').addEventListener('change', () => {
    renderList();
    renderMarkers();
});

// ============================================
// Initialize
// ============================================
initMap();
loadData();
