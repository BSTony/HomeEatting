// Master Hub Controller Logic

const socket = io();

let currentSlides = [];
let currentIndex = 0;
let allowSelection = true;
let showResults = false;
let currentSummary = null;
let savedPin = sessionStorage.getItem('feast_master_pin') || '';

// DOM Elements
const authModal = document.getElementById('login-modal');
const pinInput = document.getElementById('pin-input');
const btnLogin = document.getElementById('btn-login');
const authError = document.getElementById('auth-error');

const stageTitle = document.getElementById('stage-title');
const stageSubtitle = document.getElementById('stage-subtitle');
const stageDesc = document.getElementById('stage-desc');
const stageBanner = document.getElementById('stage-banner');
const stageBadge = document.getElementById('stage-badge');
const stageInteractive = document.getElementById('stage-interactive');
const slideCounter = document.getElementById('slide-counter');

const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const toggleAllowSelection = document.getElementById('toggle-allow-selection');
const toggleShowResults = document.getElementById('toggle-show-results');

const statsPanel = document.getElementById('stats-panel');
const slideDeckList = document.getElementById('slide-deck-list');
const clientsList = document.getElementById('clients-list');
const clientCountBadges = document.querySelectorAll('.client-count-badge');

const qrModal = document.getElementById('qr-modal');
const btnOpenQr = document.getElementById('btn-open-qr');
const btnCloseQr = document.getElementById('btn-close-qr');
const slaveUrlDisplay = document.getElementById('slave-url-display');
const qrContainer = document.getElementById('qr-code-box');

const btnConfetti = document.getElementById('btn-confetti');
const btnBroadcast = document.getElementById('btn-broadcast');
const broadcastModal = document.getElementById('broadcast-modal');
const btnCloseBroadcast = document.getElementById('btn-close-broadcast');
const btnSendBroadcast = document.getElementById('btn-send-broadcast');
const broadcastInput = document.getElementById('broadcast-input');

const btnAddSlide = document.getElementById('btn-add-slide');
const btnResetPreset = document.getElementById('btn-reset-preset');

// Tabs
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

// Setup Tabs Navigation
tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    tabButtons.forEach(b => b.classList.remove('active'));
    tabPanes.forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const target = document.getElementById(btn.dataset.tab);
    if (target) target.classList.add('active');
  });
});

// Initialization & Authentication
function tryJoinMaster(pin) {
  socket.emit('join', {
    role: 'master',
    name: '主控操作台',
    pin: pin
  });
}

btnLogin.addEventListener('click', () => {
  const pin = pinInput.value.trim();
  if (!pin) {
    authError.textContent = '請輸入授權密碼';
    authError.style.display = 'block';
    return;
  }
  savedPin = pin;
  tryJoinMaster(pin);
});

pinInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') btnLogin.click();
});

// Auto-login if previously saved
if (savedPin) {
  tryJoinMaster(savedPin);
} else {
  // Pre-fill 8888 for smooth user testing
  pinInput.value = '8888';
}

socket.on('auth_error', (data) => {
  authError.textContent = data.message || '密碼錯誤';
  authError.style.display = 'block';
  authModal.classList.add('show');
  sessionStorage.removeItem('feast_master_pin');
});

socket.on('master_init', (data) => {
  sessionStorage.setItem('feast_master_pin', savedPin);
  authModal.classList.remove('show');
  currentSlides = data.slides || [];
  updateDashboard(data.dashboard);
  renderSlideDeck();
});

socket.on('master_telemetry_updated', (dashboard) => {
  updateDashboard(dashboard);
});

socket.on('clients_updated', (data) => {
  clientCountBadges.forEach(b => b.textContent = `${data.slavesCount} 賓客`);
  renderClientsList(data.clientsList || []);
});

socket.on('submission_received', (data) => {
  currentSummary = data.summary;
  renderStats();
  showToast(`📩 收到來自「${data.guestName}」的即時反饋！`);
});

socket.on('slides_reloaded', (data) => {
  currentSlides = data.slides || [];
  currentIndex = data.currentIndex || 0;
  renderSlideDeck();
  renderStage();
});

socket.on('trigger_action', (data) => {
  if (data.action === 'confetti') {
    fireConfetti();
  }
});

// Dashboard Rendering
function updateDashboard(dashboard) {
  if (!dashboard) return;
  currentIndex = dashboard.currentIndex;
  allowSelection = dashboard.allowSelection;
  showResults = dashboard.showResults;
  currentSummary = dashboard.summary;

  toggleAllowSelection.checked = allowSelection;
  toggleShowResults.checked = showResults;

  clientCountBadges.forEach(b => b.textContent = `${dashboard.slavesCount} 賓客`);
  renderClientsList(dashboard.clientsList || []);

  renderStage();
  renderStats();
  highlightActiveSlideInDeck();
}

function renderStage() {
  const slide = currentSlides[currentIndex];
  if (!slide) return;

  slideCounter.textContent = `第 ${currentIndex + 1} / ${currentSlides.length} 頁`;
  stageTitle.textContent = slide.title || '';
  stageSubtitle.textContent = slide.subtitle || '';
  stageDesc.textContent = slide.content || '';
  stageBadge.textContent = slide.badge || '展示';

  if (slide.imageUrl) {
    stageBanner.src = slide.imageUrl;
    stageBanner.style.display = 'block';
  } else {
    stageBanner.style.display = 'none';
  }

  // Render interactive preview in stage
  renderStageInteractivePreview(slide);
}

function renderStageInteractivePreview(slide) {
  stageInteractive.innerHTML = '';

  if (slide.type === 'poll') {
    let html = `<div style="font-weight:700;margin-bottom:8px;color:var(--accent-gold);">📊 投票題目預覽 (賓客端可點擊)：</div><div style="display:flex;flex-direction:column;gap:6px;">`;
    (slide.options || []).forEach(opt => {
      html += `<div style="padding:8px 12px;background:rgba(255,255,255,0.05);border-radius:6px;font-size:13px;">${opt.text}</div>`;
    });
    html += `</div>`;
    stageInteractive.innerHTML = html;
  } else if (slide.type === 'menu') {
    let count = 0;
    (slide.menuCategories || []).forEach(c => count += (c.items || []).length);
    stageInteractive.innerHTML = `
      <div style="color:var(--accent-gold);font-weight:700;">🍽️ 菜單點選模式</div>
      <div style="font-size:13px;color:var(--text-secondary);margin-top:4px;">
        共有 ${(slide.menuCategories || []).length} 個分類、${count} 道特選料理開放賓客勾選。
      </div>
    `;
  } else if (slide.type === 'lucky_wheel') {
    stageInteractive.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="color:var(--accent-gold);font-weight:700;">🎡 幸運大轉盤</div>
          <div style="font-size:13px;color:var(--text-secondary);">共有 ${(slide.prizes || []).length} 個獎項</div>
        </div>
        <button id="btn-spin-wheel" class="btn btn-primary">
          🎯 啟動同步旋轉
        </button>
      </div>
    `;
    const spinBtn = document.getElementById('btn-spin-wheel');
    if (spinBtn) {
      spinBtn.addEventListener('click', triggerWheelSpin);
    }
  } else if (slide.type === 'rating') {
    stageInteractive.innerHTML = `
      <div style="color:var(--accent-gold);font-weight:700;">⭐ 星級評價與祝福</div>
      <div style="font-size:13px;color:var(--text-secondary);margin-top:4px;">
        開放 1~5 顆星滿意度評價及溫馨留言反饋。
      </div>
    `;
  } else {
    stageInteractive.innerHTML = `
      <div style="color:var(--text-muted);font-size:13px;">
        🖼️ 一般內容展示頁（從屬端將以極致排版全螢幕呈現）
      </div>
    `;
  }
}

// Stage Navigation Controls
btnPrev.addEventListener('click', () => {
  if (currentIndex > 0) {
    socket.emit('master_change_slide', { index: currentIndex - 1 });
  }
});

btnNext.addEventListener('click', () => {
  if (currentIndex < currentSlides.length - 1) {
    socket.emit('master_change_slide', { index: currentIndex + 1 });
  }
});

// Keyboard Controls (Left, Right, Space)
window.addEventListener('keydown', (e) => {
  if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
  if (e.key === 'ArrowRight' || e.key === ' ') {
    e.preventDefault();
    btnNext.click();
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    btnPrev.click();
  }
});

toggleAllowSelection.addEventListener('change', () => {
  socket.emit('master_toggle_selection', { enabled: toggleAllowSelection.checked });
});

toggleShowResults.addEventListener('change', () => {
  socket.emit('master_toggle_results', { show: toggleShowResults.checked });
});

// Render Stats & Telemetry
function renderStats() {
  const slide = currentSlides[currentIndex];
  if (!slide) return;

  if (!currentSummary || currentSummary.totalCount === 0) {
    statsPanel.innerHTML = `
      <div class="stat-summary-card" style="text-align:center;padding:32px 16px;">
        <div style="font-size:32px;margin-bottom:8px;">⏳</div>
        <div style="font-weight:700;color:var(--text-primary);">尚無賓客反饋資料</div>
        <div style="font-size:13px;color:var(--text-muted);margin-top:4px;">
          請確保「開放作答」已開啟，賓客送出後將即時在此動態展示！
        </div>
      </div>
    `;
    return;
  }

  let html = `
    <div class="stat-summary-card">
      <div class="stat-header">
        <span>📈 本頁反饋統計</span>
        <span class="badge badge-gold">已收集 ${currentSummary.totalCount} 份</span>
      </div>
  `;

  if (slide.type === 'poll' && slide.options) {
    slide.options.forEach(opt => {
      const count = (currentSummary.counts && currentSummary.counts[opt.id]) || 0;
      const pct = currentSummary.totalCount > 0 ? Math.round((count / currentSummary.totalCount) * 100) : 0;
      html += `
        <div class="stat-item-row">
          <div class="stat-label-bar">
            <span>${opt.text}</span>
            <span style="font-weight:700;color:var(--accent-gold);">${count} 票 (${pct}%)</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width: ${pct}%"></div>
          </div>
        </div>
      `;
    });
  } else if (slide.type === 'menu') {
    html += `<div style="font-size:13px;font-weight:700;margin-bottom:8px;color:var(--accent-gold);">人氣菜色點選榜：</div>`;
    const counts = currentSummary.dishCounts || {};
    const sortedEntries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    
    // Map id to name
    const dishMap = {};
    (slide.menuCategories || []).forEach(cat => {
      cat.items.forEach(d => { dishMap[d.id] = d.name; });
    });

    if (sortedEntries.length === 0) {
      html += `<div style="font-size:12px;color:var(--text-muted);">尚未有菜色被選取</div>`;
    } else {
      sortedEntries.forEach(([dishId, count]) => {
        const dishName = dishMap[dishId] || dishId;
        const pct = Math.round((count / currentSummary.totalCount) * 100);
        html += `
          <div class="stat-item-row">
            <div class="stat-label-bar">
              <span>${dishName}</span>
              <span style="font-weight:700;color:var(--accent-gold);">${count} 人選擇</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style="width: ${pct}%"></div>
            </div>
          </div>
        `;
      });
    }
  } else if (slide.type === 'rating') {
    html += `
      <div style="text-align:center;padding:12px 0;">
        <div style="font-size:36px;font-weight:800;color:#fbbf24;">${currentSummary.average} <span style="font-size:18px;">★</span></div>
        <div style="font-size:12px;color:var(--text-muted);">平均滿意度得分 (${currentSummary.totalCount} 則評價)</div>
      </div>
    `;
  }

  // Voter details breakdown
  if (currentSummary.submissions && currentSummary.submissions.length > 0) {
    html += `
      <div style="margin-top:16px;border-top:1px solid var(--border-color);padding-top:12px;">
        <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:8px;">即時參與明細：</div>
        <div style="display:flex;flex-direction:column;gap:6px;max-height:160px;overflow-y:auto;">
    `;
    currentSummary.submissions.forEach(sub => {
      let detailText = '';
      if (slide.type === 'poll') {
        const opt = slide.options.find(o => o.id === sub.data?.choice);
        detailText = opt ? opt.text : '已投票';
      } else if (slide.type === 'rating') {
        detailText = `${sub.data?.stars} 星 ★ ${sub.data?.comment ? '「' + sub.data.comment + '」' : ''}`;
      } else if (slide.type === 'menu') {
        const selected = sub.data?.selectedDishes || [];
        detailText = `點選了 ${selected.length} 道菜`;
      }
      html += `
        <div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 8px;background:rgba(255,255,255,0.03);border-radius:4px;">
          <span style="font-weight:600;">${sub.guestName}</span>
          <span style="color:var(--accent-gold);">${detailText}</span>
        </div>
      `;
    });
    html += `</div></div>`;
  }

  html += `</div>`;
  statsPanel.innerHTML = html;
}

// Slide Deck Thumbnail List
function renderSlideDeck() {
  slideDeckList.innerHTML = '';
  currentSlides.forEach((slide, idx) => {
    const item = document.createElement('div');
    item.className = `slide-deck-item ${idx === currentIndex ? 'active' : ''}`;
    item.innerHTML = `
      <img src="${slide.imageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=120&q=80'}" class="slide-thumb" alt="thumbnail" />
      <div class="slide-meta">
        <div class="slide-meta-title">${idx + 1}. ${slide.title}</div>
        <div class="slide-meta-type">${slide.type} • ${slide.badge || '頁面'}</div>
      </div>
    `;
    item.addEventListener('click', () => {
      socket.emit('master_change_slide', { index: idx });
    });
    slideDeckList.appendChild(item);
  });
}

function highlightActiveSlideInDeck() {
  const items = slideDeckList.querySelectorAll('.slide-deck-item');
  items.forEach((item, idx) => {
    if (idx === currentIndex) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

// Connected Clients List
function renderClientsList(clients) {
  const slaves = clients.filter(c => c.role === 'slave');
  if (slaves.length === 0) {
    clientsList.innerHTML = `
      <div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13px;">
        目前尚無賓客裝置連線，請點擊右上角「QR Code」邀請手機掃描加入！
      </div>
    `;
    return;
  }

  let html = `<div style="display:flex;flex-direction:column;gap:8px;">`;
  slaves.forEach(slave => {
    html += `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:rgba(255,255,255,0.03);border:1px solid var(--border-color);border-radius:var(--radius-sm);">
        <div style="display:flex;align-items:center;gap:10px;">
          <span class="live-dot"></span>
          <span style="font-weight:600;font-size:14px;">${slave.name}</span>
        </div>
        <span style="font-size:12px;color:var(--text-muted);">${new Date(slave.joinedAt).toLocaleTimeString()}</span>
      </div>
    `;
  });
  html += `</div>`;
  clientsList.innerHTML = html;
}

// QR Code Modal
btnOpenQr.addEventListener('click', () => {
  const slaveUrl = `${window.location.origin}/slave.html`;
  slaveUrlDisplay.textContent = slaveUrl;
  qrContainer.innerHTML = '';
  
  if (window.QRCode) {
    new QRCode(qrContainer, {
      text: slaveUrl,
      width: 200,
      height: 200,
      colorDark: "#0a0d14",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M
    });
  } else {
    qrContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(slaveUrl)}" alt="QR Code" width="200" height="200" />`;
  }
  qrModal.classList.add('show');
});

btnCloseQr.addEventListener('click', () => {
  qrModal.classList.remove('show');
});

// Broadcast Modal
btnBroadcast.addEventListener('click', () => {
  broadcastModal.classList.add('show');
  broadcastInput.focus();
});

btnCloseBroadcast.addEventListener('click', () => {
  broadcastModal.classList.remove('show');
});

btnSendBroadcast.addEventListener('click', () => {
  const text = broadcastInput.value.trim();
  if (text) {
    socket.emit('master_broadcast_notice', { message: text });
    showToast(`📢 已向全場廣播：「${text}」`);
    broadcastInput.value = '';
    broadcastModal.classList.remove('show');
  }
});

// Actions: Confetti & Lucky Wheel Spin
btnConfetti.addEventListener('click', () => {
  socket.emit('master_trigger_action', { action: 'confetti' });
  fireConfetti();
  showToast('🎊 施放全螢幕歡慶彩帶！');
});

function triggerWheelSpin() {
  const slide = currentSlides[currentIndex];
  if (!slide || slide.type !== 'lucky_wheel' || !slide.prizes || slide.prizes.length === 0) return;

  const prizeIndex = Math.floor(Math.random() * slide.prizes.length);
  const winningPrize = slide.prizes[prizeIndex];

  socket.emit('master_trigger_action', {
    action: 'wheel_spin',
    prizeIndex,
    winningPrize
  });
  showToast(`🎡 轉盤啟動中！即將開出獎項...`);
}

// Reset Presets
btnResetPreset.addEventListener('click', () => {
  if (confirm('確定要載入「溫馨闔家盛宴」預設投影片範本嗎？')) {
    const preset = window.SLIDE_PRESETS?.banquet?.slides || [];
    socket.emit('master_update_slides', { newSlides: preset, targetIndex: 0 });
    showToast('✅ 已成功還原並載入盛宴預設範本！');
  }
});

// Toast Helper
function showToast(message) {
  const toast = document.getElementById('broadcast-toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

// Confetti Animation Engine
function fireConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#ec4899', '#fbbf24'];

  for (let i = 0; i < 120; i++) {
    particles.push({
      x: canvas.width / 2,
      y: canvas.height / 2,
      w: Math.random() * 10 + 6,
      h: Math.random() * 6 + 4,
      vx: (Math.random() - 0.5) * 20,
      vy: (Math.random() - 0.7) * 22,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10,
      tiltSpeed: (Math.random() - 0.5) * 0.2,
      alpha: 1
    });
  }

  let animationFrame;
  function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.45; // gravity
      p.tilt += p.tiltSpeed;
      p.alpha -= 0.008;

      if (p.alpha > 0) {
        alive = true;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.tilt);
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
    });

    if (alive) {
      animationFrame = requestAnimationFrame(update);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cancelAnimationFrame(animationFrame);
    }
  }
  update();
}
