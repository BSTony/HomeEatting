// Master Hub Controller Logic - Mobile First

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
const stageSwipeArea = document.getElementById('stage-swipe-area');

const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const cardToggleSelection = document.getElementById('card-toggle-selection');
const cardToggleResults = document.getElementById('card-toggle-results');
const textSelectionStatus = document.getElementById('text-selection-status');
const textResultsStatus = document.getElementById('text-results-status');

const statsPanel = document.getElementById('stats-panel');
const slideDeckList = document.getElementById('slide-deck-list');
const clientsList = document.getElementById('clients-list');
const clientCountBadges = document.querySelectorAll('.client-count-badge');

const qrModal = document.getElementById('qr-modal');
const btnOpenQr = document.getElementById('btn-open-qr');
const btnShowQrBig = document.getElementById('btn-show-qr-big');
const btnCloseQr = document.getElementById('btn-close-qr');
const slaveUrlDisplay = document.getElementById('slave-url-display');
const qrContainer = document.getElementById('qr-code-box');

const btnConfetti = document.getElementById('btn-confetti');
const btnSpinWheelQuick = document.getElementById('btn-spin-wheel-quick');
const btnBroadcast = document.getElementById('btn-broadcast');
const btnBroadcastQuick = document.getElementById('btn-broadcast-quick');
const broadcastModal = document.getElementById('broadcast-modal');
const btnCloseBroadcast = document.getElementById('btn-close-broadcast');
const btnSendBroadcast = document.getElementById('btn-send-broadcast');
const broadcastInput = document.getElementById('broadcast-input');

const btnResetPreset = document.getElementById('btn-reset-preset');

// Mobile Bottom Navigation Tabs
const navTabItems = document.querySelectorAll('.nav-tab-item');
const masterTabViews = document.querySelectorAll('.master-tab-view');

navTabItems.forEach(tab => {
  tab.addEventListener('click', () => {
    navTabItems.forEach(t => t.classList.remove('active'));
    masterTabViews.forEach(v => v.classList.remove('active'));

    tab.classList.add('active');
    const targetId = tab.dataset.target;
    const targetView = document.getElementById(targetId);
    if (targetView) targetView.classList.add('active');
  });
});

// Authentication & Connection
function tryJoinMaster(pin) {
  socket.emit('join', {
    role: 'master',
    name: '主控操作台',
    pin: pin
  });
}

socket.on('connect', () => {
  if (savedPin) {
    tryJoinMaster(savedPin);
  }
});

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

if (savedPin) {
  tryJoinMaster(savedPin);
} else {
  pinInput.value = '8888';
}

socket.on('auth_error', (data) => {
  authError.textContent = data.message || '密碼錯誤';
  authError.style.display = 'block';
  authModal.classList.add('show');
  sessionStorage.removeItem('feast_master_pin');
});

socket.on('master_init', (data) => {
  sessionStorage.setItem('feast_master_pin', savedPin || '8888');
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

// Update Dashboard View
function updateDashboard(dashboard) {
  if (!dashboard) return;
  currentIndex = dashboard.currentIndex;
  allowSelection = dashboard.allowSelection;
  showResults = dashboard.showResults;
  currentSummary = dashboard.summary;

  updateToggleStateUI();

  clientCountBadges.forEach(b => b.textContent = `${dashboard.slavesCount} 賓客`);
  renderClientsList(dashboard.clientsList || []);

  renderStage();
  renderStats();
  highlightActiveSlideInDeck();
}

function updateToggleStateUI() {
  if (cardToggleSelection) {
    if (allowSelection) {
      cardToggleSelection.classList.add('active');
      textSelectionStatus.textContent = '允許手機點選';
    } else {
      cardToggleSelection.classList.remove('active');
      textSelectionStatus.textContent = '鎖定禁止作答';
    }
  }

  if (cardToggleResults) {
    if (showResults) {
      cardToggleResults.classList.add('active');
      textResultsStatus.textContent = '公開即時票數';
    } else {
      cardToggleResults.classList.remove('active');
      textResultsStatus.textContent = '隱藏統計票數';
    }
  }
}

// Render Current Stage Preview
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

  renderStageInteractivePreview(slide);
}

function renderStageInteractivePreview(slide) {
  stageInteractive.innerHTML = '';

  if (slide.type === 'poll') {
    let html = `<div style="font-weight:700;margin-bottom:6px;color:var(--accent-gold);">📊 題目選項預覽：</div><div style="display:flex;flex-direction:column;gap:5px;">`;
    (slide.options || []).forEach(opt => {
      html += `<div style="padding:6px 10px;background:rgba(255,255,255,0.06);border-radius:6px;font-size:12px;">${opt.text}</div>`;
    });
    html += `</div>`;
    stageInteractive.innerHTML = html;
  } else if (slide.type === 'menu') {
    let count = 0;
    (slide.menuCategories || []).forEach(c => count += (c.items || []).length);
    stageInteractive.innerHTML = `
      <div style="color:var(--accent-gold);font-weight:700;">🍽️ 特選菜單點選</div>
      <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">
        共有 ${(slide.menuCategories || []).length} 個分類、${count} 道特選料理供賓客勾選。
      </div>
    `;
  } else if (slide.type === 'lucky_wheel') {
    stageInteractive.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="color:var(--accent-gold);font-weight:700;">🎡 幸運大轉盤</div>
          <div style="font-size:12px;color:var(--text-secondary);">獎項數：${(slide.prizes || []).length} 個</div>
        </div>
        <button id="btn-spin-wheel-in-stage" class="btn btn-primary" style="font-size:12px;padding:6px 14px;">
          🎯 旋轉開獎
        </button>
      </div>
    `;
    const spinBtn = document.getElementById('btn-spin-wheel-in-stage');
    if (spinBtn) {
      spinBtn.addEventListener('click', triggerWheelSpin);
    }
  } else if (slide.type === 'family') {
    let count = (slide.members || []).length;
    let html = `
      <div style="color:var(--accent-gold);font-weight:700;margin-bottom:8px;">
        👥 ${slide.badge || '親友代表團'} (共 ${count} 位成員)：
      </div>
      <div class="family-members-grid">
    `;
    (slide.members || []).forEach(m => {
      html += `
        <div class="family-card" style="padding:8px 6px;">
          <div class="family-avatar-wrap" style="width:44px;height:44px;font-size:22px;background:${m.avatarBg || 'var(--accent-gold)'};margin-bottom:4px;">
            <span>${m.avatar || '👤'}</span>
          </div>
          <span class="family-tag-pill" style="font-size:9px;padding:1px 6px;">${m.tag || m.role}</span>
          <div class="family-name" style="font-size:12px;">${m.name}</div>
          <div class="family-desc" style="font-size:10px;">${m.desc || ''}</div>
        </div>
      `;
    });
    html += `</div>`;
    stageInteractive.innerHTML = html;
  } else if (slide.type === 'rating') {
    stageInteractive.innerHTML = `
      <div style="color:var(--accent-gold);font-weight:700;">⭐ 星級評價與祝福</div>
      <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">
        開放賓客手機端進行 1~5 星評分與溫馨留言。
      </div>
    `;
  } else {
    stageInteractive.innerHTML = `
      <div style="color:var(--text-muted);font-size:12px;">
        🖼️ 一般內容展示頁（全體手機鏡像同步呈現）
      </div>
    `;
  }
}

// Navigation Controls
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

// Touch Swipe Gestures on Mobile Stage
let touchStartX = 0;
let touchStartY = 0;
if (stageSwipeArea) {
  stageSwipeArea.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  stageSwipeArea.addEventListener('touchend', (e) => {
    const diffX = e.changedTouches[0].screenX - touchStartX;
    const diffY = e.changedTouches[0].screenY - touchStartY;
    // Only detect horizontal swipe if movement is primarily horizontal
    if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX < 0) {
        // Swiped Left -> Next Slide
        btnNext.click();
      } else {
        // Swiped Right -> Prev Slide
        btnPrev.click();
      }
    }
  }, { passive: true });
}

// Toggle Buttons
cardToggleSelection.addEventListener('click', () => {
  allowSelection = !allowSelection;
  socket.emit('master_toggle_selection', { enabled: allowSelection });
  updateToggleStateUI();
});

cardToggleResults.addEventListener('click', () => {
  showResults = !showResults;
  socket.emit('master_toggle_results', { show: showResults });
  updateToggleStateUI();
});

// Quick Action Triggers
btnConfetti.addEventListener('click', () => {
  socket.emit('master_trigger_action', { action: 'confetti' });
  fireConfetti();
  showToast('🎊 施放全螢幕歡慶彩帶！');
});

btnSpinWheelQuick.addEventListener('click', triggerWheelSpin);

function triggerWheelSpin() {
  const slide = currentSlides[currentIndex];
  if (!slide || slide.type !== 'lucky_wheel' || !slide.prizes || slide.prizes.length === 0) {
    showToast('💡 提示：請先將投影片切換至「幸運大轉盤」頁面！');
    return;
  }

  const prizeIndex = Math.floor(Math.random() * slide.prizes.length);
  const winningPrize = slide.prizes[prizeIndex];

  socket.emit('master_trigger_action', {
    action: 'wheel_spin',
    prizeIndex,
    winningPrize
  });
  showToast(`🎡 轉盤啟動！正在開出幸運獎項...`);
}

btnBroadcast.addEventListener('click', () => {
  broadcastModal.classList.add('show');
  broadcastInput.focus();
});
btnBroadcastQuick.addEventListener('click', () => {
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

// QR Code Modal
function openQrModal() {
  const slaveUrl = `${window.location.origin}/slave.html`;
  slaveUrlDisplay.textContent = slaveUrl;
  qrContainer.innerHTML = '';

  if (window.QRCode) {
    new QRCode(qrContainer, {
      text: slaveUrl,
      width: 190,
      height: 190,
      colorDark: "#0a0d14",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M
    });
  } else {
    qrContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=190x190&data=${encodeURIComponent(slaveUrl)}" alt="QR Code" width="190" height="190" />`;
  }
  qrModal.classList.add('show');
}

btnOpenQr.addEventListener('click', openQrModal);
if (btnShowQrBig) btnShowQrBig.addEventListener('click', openQrModal);
btnCloseQr.addEventListener('click', () => qrModal.classList.remove('show'));

// Slide Management: Add and Delete
const addSlideModal = document.getElementById('add-slide-modal');
const btnOpenAddSlide = document.getElementById('btn-add-slide-modal');
const btnCancelAddSlide = document.getElementById('btn-cancel-add-slide');
const btnConfirmAddSlide = document.getElementById('btn-confirm-add-slide');
const newSlideType = document.getElementById('new-slide-type');
const newSlideTitle = document.getElementById('new-slide-title');
const newSlideSubtitle = document.getElementById('new-slide-subtitle');
const newSlideContent = document.getElementById('new-slide-content');
const newSlideOptionsGroup = document.getElementById('new-slide-options-group');
const newSlideOptions = document.getElementById('new-slide-options');
const newSlideImage = document.getElementById('new-slide-image');
const btnDeleteCurrentSlide = document.getElementById('btn-delete-current-slide');

if (btnOpenAddSlide) {
  btnOpenAddSlide.addEventListener('click', () => {
    addSlideModal.classList.add('show');
    newSlideTitle.value = '';
    newSlideSubtitle.value = '';
    newSlideContent.value = '';
    newSlideTitle.focus();
  });
}

if (btnCancelAddSlide) {
  btnCancelAddSlide.addEventListener('click', () => {
    addSlideModal.classList.remove('show');
  });
}

if (newSlideType) {
  newSlideType.addEventListener('change', () => {
    if (newSlideType.value === 'poll') {
      newSlideOptionsGroup.style.display = 'block';
    } else {
      newSlideOptionsGroup.style.display = 'none';
    }
  });
}

if (btnConfirmAddSlide) {
  btnConfirmAddSlide.addEventListener('click', () => {
    const type = newSlideType.value;
    const title = newSlideTitle.value.trim() || '自訂展示頁面';
    const subtitle = newSlideSubtitle.value.trim();
    const content = newSlideContent.value.trim();
    const imageUrl = newSlideImage.value.trim();

    const slideObj = {
      id: 'custom-' + Date.now(),
      type,
      title,
      subtitle,
      badge: type === 'poll' ? '即時票選' : (type === 'rating' ? '心得回饋' : '自訂展示'),
      content,
      imageUrl
    };

    if (type === 'poll') {
      const lines = newSlideOptions.value.split('\n').map(s => s.trim()).filter(Boolean);
      slideObj.options = lines.length > 0
        ? lines.map((text, i) => ({ id: 'opt-' + (i + 1), text }))
        : [
            { id: 'opt-1', text: '選項一：贊成' },
            { id: 'opt-2', text: '選項二：保留' }
          ];
    }

    currentSlides.push(slideObj);
    socket.emit('master_update_slides', {
      newSlides: currentSlides,
      targetIndex: currentSlides.length - 1
    });

    addSlideModal.classList.remove('show');
    showToast('✅ 已成功新增頁面！');
  });
}

if (btnDeleteCurrentSlide) {
  btnDeleteCurrentSlide.addEventListener('click', () => {
    if (currentSlides.length <= 1) {
      alert('至少需要保留一張投影片！');
      return;
    }
    const currentSlide = currentSlides[currentIndex];
    const title = currentSlide ? currentSlide.title : `第 ${currentIndex + 1} 頁`;
    if (confirm(`確定要刪除「${title}」嗎？`)) {
      currentSlides.splice(currentIndex, 1);
      const targetIndex = Math.max(0, currentIndex - 1);
      socket.emit('master_update_slides', {
        newSlides: currentSlides,
        targetIndex
      });
      showToast('🗑️ 已刪除該頁投影片');
    }
  });
}

btnResetPreset.addEventListener('click', () => {
  if (confirm('確定要載入「溫馨闔家盛宴」預設範本嗎？')) {
    const preset = window.SLIDE_PRESETS?.banquet?.slides || [];
    socket.emit('master_update_slides', { newSlides: preset, targetIndex: 0 });
    showToast('✅ 已成功載入盛宴預設範本！');
  }
});

// Render Live Stats
function renderStats() {
  const slide = currentSlides[currentIndex];
  if (!slide) return;

  if (!currentSummary || currentSummary.totalCount === 0) {
    statsPanel.innerHTML = `
      <div class="stat-summary-card" style="text-align:center;padding:32px 16px;">
        <div style="font-size:36px;margin-bottom:8px;">⏳</div>
        <div style="font-weight:700;color:var(--text-primary);">尚無賓客反饋資料</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">
          請確保「開放作答」已開啟，賓客送出後將即時在此呈現！
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
      <div style="margin-top:14px;border-top:1px solid var(--border-color);padding-top:10px;">
        <div style="font-size:12px;font-weight:700;color:var(--text-muted);margin-bottom:8px;">即時明細清單：</div>
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
        <div style="display:flex;justify-content:space-between;font-size:12px;padding:6px 10px;background:rgba(255,255,255,0.04);border-radius:4px;">
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

// Slide Deck List
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
      // Switch back to stage tab for immediate view
      document.querySelector('.nav-tab-item[data-target="view-stage"]')?.click();
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
      <div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px;">
        目前尚無賓客手機連線，請點擊上方「連線 QR Code」讓親友掃描加入！
      </div>
    `;
    return;
  }

  let html = `<div style="display:flex;flex-direction:column;gap:8px;">`;
  slaves.forEach(slave => {
    html += `
      <div class="guest-item-card">
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

// Confetti Engine
function fireConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#ec4899', '#fbbf24'];

  for (let i = 0; i < 90; i++) {
    particles.push({
      x: canvas.width / 2,
      y: canvas.height * 0.45,
      w: Math.random() * 8 + 5,
      h: Math.random() * 5 + 3,
      vx: (Math.random() - 0.5) * 16,
      vy: (Math.random() - 0.7) * 18,
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
      p.vy += 0.45;
      p.tilt += p.tiltSpeed;
      p.alpha -= 0.009;

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
