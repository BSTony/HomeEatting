// Slave (Guest / Audience) Screen Logic

const socket = io();

let currentState = null;
let currentSlide = null;
let guestName = localStorage.getItem('feast_guest_name') || '';
let selectedChoice = null;
let selectedDishes = [];
let selectedStars = 0;
let isSpinning = false;

// DOM Elements
const brandTitle = document.getElementById('slave-brand-title');
const guestChip = document.getElementById('slave-guest-chip');
const guestNameDisplay = document.getElementById('guest-name-display');

const slaveBadge = document.getElementById('slave-badge');
const slaveBanner = document.getElementById('slave-banner');
const slaveBannerWrap = document.getElementById('slave-banner-wrap');
const slaveTitle = document.getElementById('slave-title');
const slaveSubtitle = document.getElementById('slave-subtitle');
const slaveDesc = document.getElementById('slave-desc');
const interactiveArea = document.getElementById('slave-interactive-area');

const nameModal = document.getElementById('name-modal');
const nameInput = document.getElementById('name-input');
const btnSaveName = document.getElementById('btn-save-name');

// Join Session as Slave
function joinSession() {
  socket.emit('join', {
    role: 'slave',
    name: guestName
  });
}

// Name modal handling
guestChip.addEventListener('click', () => {
  nameInput.value = guestName || '';
  nameModal.classList.add('show');
  nameInput.focus();
});

btnSaveName.addEventListener('click', () => {
  const val = nameInput.value.trim();
  if (val) {
    guestName = val;
    localStorage.setItem('feast_guest_name', guestName);
    guestNameDisplay.textContent = guestName;
    socket.emit('slave_update_name', { name: guestName });
  }
  nameModal.classList.remove('show');
});

nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') btnSaveName.click();
});

// Socket Event Handlers
socket.on('slave_init', (data) => {
  guestName = data.name;
  guestNameDisplay.textContent = guestName;
  applyState(data.state);
});

socket.on('slide_changed', (state) => {
  applyState(state);
});

socket.on('selection_toggled', ({ allowSelection }) => {
  if (currentState) {
    currentState.allowSelection = allowSelection;
    renderInteractiveWidget();
  }
});

socket.on('results_toggled', ({ showResults, summary }) => {
  if (currentState) {
    currentState.showResults = showResults;
    currentState.summary = summary;
    renderInteractiveWidget();
  }
});

socket.on('summary_updated', ({ summary }) => {
  if (currentState) {
    currentState.summary = summary;
    renderInteractiveWidget();
  }
});

socket.on('submission_accepted', (res) => {
  showToast('✅ 您的選擇已成功送出！');
  if (currentState) {
    currentState.hasSubmitted = true;
    currentState.mySubmission = res.data;
    renderInteractiveWidget();
  }
});

socket.on('broadcast_notice', (notice) => {
  showToast(`📢 ${notice.message}`);
});

socket.on('trigger_action', (data) => {
  if (data.action === 'confetti') {
    fireConfetti();
  } else if (data.action === 'wheel_spin') {
    spinWheelToPrize(data.prizeIndex, data.winningPrize);
  }
});

// Apply State to DOM
function applyState(state) {
  currentState = state;
  currentSlide = state.currentSlide;
  if (!currentSlide) return;

  slaveTitle.textContent = currentSlide.title || '';
  slaveSubtitle.textContent = currentSlide.subtitle || '';
  slaveDesc.textContent = currentSlide.content || '';
  slaveBadge.textContent = currentSlide.badge || '同步中';

  if (currentSlide.imageUrl) {
    slaveBanner.src = currentSlide.imageUrl;
    slaveBannerWrap.style.display = 'block';
  } else {
    slaveBannerWrap.style.display = 'none';
  }

  // Restore previous selections if any
  if (state.mySubmission) {
    selectedChoice = state.mySubmission.choice;
    selectedDishes = state.mySubmission.selectedDishes || [];
    selectedStars = state.mySubmission.stars || 0;
  } else {
    selectedChoice = null;
    selectedDishes = [];
    selectedStars = 0;
  }

  renderInteractiveWidget();
}

let currentFamilyNav = { householdId: null, memberId: null };

socket.on('family_nav_synced', (nav) => {
  currentFamilyNav = nav || { householdId: null, memberId: null };
  if (currentSlide && (currentSlide.type === 'family_tree' || currentSlide.type === 'family')) {
    renderFamilyTreeWidget();
  }
});

// Render Interactive Content depending on Slide Type
function renderInteractiveWidget() {
  if (!currentSlide) return;
  interactiveArea.innerHTML = '';

  if (currentSlide.type === 'family_tree' || currentSlide.type === 'family') {
    renderFamilyTreeWidget();
    return;
  }

  // If host locked selection
  if (!currentState.allowSelection) {
    interactiveArea.innerHTML = `
      <div class="locked-banner">
        <span>🔒 主控端目前展示中，請專注欣賞大螢幕</span>
      </div>
    `;
    return;
  }

  if (currentSlide.type === 'poll') {
    renderPollWidget();
  } else if (currentSlide.type === 'menu') {
    renderMenuWidget();
  } else if (currentSlide.type === 'lucky_wheel') {
    renderLuckyWheelWidget();
  } else if (currentSlide.type === 'rating') {
    renderRatingWidget();
  }
}

// Q-Version Family Tree & Character Entrance Spotlight
function renderFamilyTreeWidget() {
  const households = currentSlide.households || [];
  const container = document.createElement('div');
  container.className = 'family-intro-container';

  // Step 1: Showing all households
  if (!currentFamilyNav.householdId) {
    let html = `
      <div style="font-size:13px;font-weight:700;color:var(--accent-gold);margin-bottom:6px;">
        🏛️ 家族親友譜系（點選家庭查看成員）：
      </div>
      <div class="tree-overview-container">
    `;

    households.forEach(h => {
      let avatarStackHtml = '';
      (h.members || []).slice(0, 4).forEach(m => {
        avatarStackHtml += `
          <div class="mini-avatar-bubble" style="background:${m.avatarBg || 'var(--accent-gold)'};">
            ${m.avatar || '👤'}
          </div>
        `;
      });

      html += `
        <div class="household-card" data-hid="${h.id}">
          <div class="household-top-row">
            <div>
              <div class="household-title">${h.title}</div>
              <div class="household-subtitle">${h.subtitle || ''}</div>
            </div>
            <span class="badge badge-gold">👥 ${h.memberCount} 位成員</span>
          </div>
          <div class="household-members-row">
            <div class="avatar-stack">
              ${avatarStackHtml}
            </div>
            <span class="household-enter-hint">介紹成員 ➔</span>
          </div>
        </div>
      `;
    });

    html += `</div>`;
    container.innerHTML = html;

    container.querySelectorAll('.household-card').forEach(card => {
      card.addEventListener('click', () => {
        const hid = card.dataset.hid;
        currentFamilyNav.householdId = hid;
        currentFamilyNav.memberId = null;
        renderFamilyTreeWidget();
      });
    });

    closeSpotlightModal();
  } else {
    // Step 2: Inside a specific Household
    const currentHousehold = households.find(h => h.id === currentFamilyNav.householdId);
    if (!currentHousehold) {
      currentFamilyNav.householdId = null;
      renderFamilyTreeWidget();
      return;
    }

    let html = `
      <div class="household-detail-container">
        <button id="btn-tree-back" class="btn-back-to-tree">
          <span>⬅️ 返回家族譜總覽</span>
        </button>
        <div class="household-header-banner">
          <div>
            <div style="font-size:15px;font-weight:800;color:var(--text-primary);">${currentHousehold.title}</div>
            <div style="font-size:12px;color:var(--accent-gold);">${currentHousehold.subtitle || ''}</div>
          </div>
          <span class="badge badge-gold">共 ${currentHousehold.memberCount} 位成員</span>
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin:4px 0 2px;">
          ✨ 點選任一位家人，為他播放專屬出場動畫：
        </div>
        <div class="family-members-grid">
    `;

    (currentHousehold.members || []).forEach(m => {
      html += `
        <div class="family-card" data-mid="${m.id}">
          <div class="family-avatar-wrap" style="background:${m.avatarBg || 'linear-gradient(135deg, #f59e0b, #d97706)'};">
            <span>${m.avatar || '👤'}</span>
          </div>
          <span class="family-tag-pill">${m.tag || m.role}</span>
          <div class="family-name">${m.name}</div>
          <div class="family-desc">${m.title || m.desc || ''}</div>
          <div style="font-size:10px;color:var(--accent-gold);margin-top:6px;font-weight:bold;">
            ✨ 出場動畫 ➔
          </div>
        </div>
      `;
    });

    html += `
        </div>
        <button id="btn-cheer-family" class="btn btn-primary btn-cheer-all">
          <span>👏</span>
          <span>為全體家人熱烈鼓掌喝采！</span>
          <span>🎉</span>
        </button>
      </div>
    `;

    container.innerHTML = html;

    const btnBack = container.querySelector('#btn-tree-back');
    if (btnBack) {
      btnBack.addEventListener('click', () => {
        currentFamilyNav.householdId = null;
        currentFamilyNav.memberId = null;
        renderFamilyTreeWidget();
      });
    }

    const btnCheer = container.querySelector('#btn-cheer-family');
    if (btnCheer) {
      btnCheer.addEventListener('click', () => {
        fireConfetti();
        showToast('🎉 感謝您的熱情喝采與掌聲！');
        socket.emit('slave_submit_choice', { cheered: true, submittedAt: Date.now() });
      });
    }

    container.querySelectorAll('.family-card').forEach(card => {
      card.addEventListener('click', () => {
        const mid = card.dataset.mid;
        const member = (currentHousehold.members || []).find(m => m.id === mid);
        if (member) {
          triggerMemberEntrance(member);
        }
      });
    });

    // Check if synced spotlight member
    if (currentFamilyNav.memberId) {
      const activeMember = (currentHousehold.members || []).find(m => m.id === currentFamilyNav.memberId);
      if (activeMember) {
        triggerMemberEntrance(activeMember);
      }
    }
  }

  interactiveArea.appendChild(container);
}

// Member Spotlight Modal Trigger
function triggerMemberEntrance(member) {
  const modal = document.getElementById('spotlight-modal');
  if (!modal) return;

  const emoji = document.getElementById('spotlight-avatar-emoji');
  const wrap = document.getElementById('spotlight-avatar-wrap');
  const name = document.getElementById('spotlight-name');
  const role = document.getElementById('spotlight-role-badge');
  const title = document.getElementById('spotlight-title-text');
  const quote = document.getElementById('spotlight-quote-bubble');

  if (emoji) emoji.textContent = member.avatar || '👤';
  if (wrap) wrap.style.background = member.avatarBg || 'var(--accent-gold)';
  if (name) name.textContent = member.name;
  if (role) role.textContent = member.role + (member.tag ? ` • ${member.tag}` : '');
  if (title) title.textContent = member.title || member.desc || '';
  if (quote) quote.textContent = member.quote || '「恭喜東霖與芷鈞永結同心，永遠幸福！」';

  modal.classList.add('show');
  fireConfetti();

  const btnCheer = document.getElementById('btn-spotlight-cheer');
  if (btnCheer) {
    btnCheer.onclick = () => {
      fireConfetti();
      showToast(`💖 給「${member.name}」獻上最熱烈的掌聲！`);
    };
  }

  const btnClose = document.getElementById('btn-close-spotlight');
  if (btnClose) {
    btnClose.onclick = () => {
      closeSpotlightModal();
    };
  }
}

function closeSpotlightModal() {
  const modal = document.getElementById('spotlight-modal');
  if (modal) modal.classList.remove('show');
}

// 1. Poll Widget
function renderPollWidget() {
  const options = currentSlide.options || [];
  const showResults = currentState.showResults;
  const summary = currentState.summary;
  const totalCount = summary?.totalCount || 0;

  const container = document.createElement('div');
  container.className = 'interactive-widget-box';

  let html = `<div class="poll-options-grid">`;
  options.forEach(opt => {
    const isSelected = selectedChoice === opt.id;
    const voteCount = (summary?.counts && summary?.counts[opt.id]) || 0;
    const pct = totalCount > 0 ? Math.round((voteCount / totalCount) * 100) : 0;

    html += `
      <button class="poll-option-btn ${isSelected ? 'selected' : ''}" data-id="${opt.id}">
        ${showResults ? `<div class="poll-result-bar" style="width: ${pct}%"></div>` : ''}
        <div class="poll-text-wrap" style="display:flex;align-items:center;gap:10px;">
          <span class="check-indicator">${isSelected ? '✓' : ''}</span>
          <span>${opt.text}</span>
        </div>
        ${showResults ? `<span class="poll-votes-badge">${pct}% (${voteCount}票)</span>` : ''}
      </button>
    `;
  });
  html += `</div>`;

  if (currentState.hasSubmitted) {
    html += `
      <div class="submit-status-pill">
        <span>✓ 已完成投票！可直接點擊其他選項進行修改</span>
      </div>
    `;
  }

  container.innerHTML = html;

  container.querySelectorAll('.poll-option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const optId = btn.dataset.id;
      selectedChoice = optId;
      socket.emit('slave_submit_choice', {
        choice: optId,
        submittedAt: Date.now()
      });
      renderInteractiveWidget();
    });
  });

  interactiveArea.appendChild(container);
}

// 2. Menu Widget
function renderMenuWidget() {
  const container = document.createElement('div');
  container.className = 'interactive-widget-box';

  let html = `<div style="font-size:13px;color:var(--text-secondary);margin-bottom:14px;">點擊菜色加入您的今日首選品嚐清單：</div>`;

  (currentSlide.menuCategories || []).forEach(cat => {
    html += `
      <div class="menu-group">
        <div class="menu-category-title">🥢 ${cat.category}</div>
    `;
    (cat.items || []).forEach(dish => {
      const isChecked = selectedDishes.includes(dish.id);
      html += `
        <div class="dish-card ${isChecked ? 'selected' : ''}" data-id="${dish.id}">
          <div class="dish-info">
            <h4>${dish.name}</h4>
            <p>${dish.desc}</p>
          </div>
          <div class="check-indicator" style="width:24px;height:24px;border-radius:6px;border:1.5px solid var(--text-muted);display:flex;align-items:center;justify-content:center;font-size:14px;color:var(--accent-gold);font-weight:bold;">
            ${isChecked ? '✓' : ''}
          </div>
        </div>
      `;
    });
    html += `</div>`;
  });

  html += `
    <div style="margin-top:16px;">
      <label style="font-size:12px;color:var(--text-muted);display:block;margin-bottom:6px;">特殊備註 (例如：不要香菜、長輩軟嫩少鹽)：</label>
      <input type="text" id="menu-note-input" class="input-field" placeholder="可選填..." style="margin-bottom:12px;" />
      <button id="btn-submit-menu" class="btn btn-primary submit-action-btn">
        📩 送出我的家宴菜單 (${selectedDishes.length} 道)
      </button>
    </div>
  `;

  if (currentState.hasSubmitted) {
    html += `
      <div class="submit-status-pill">
        <span>✓ 菜單已送達主廚大腦，可重新點選並更新！</span>
      </div>
    `;
  }

  container.innerHTML = html;

  // Dish selection click
  container.querySelectorAll('.dish-card').forEach(card => {
    card.addEventListener('click', () => {
      const dishId = card.dataset.id;
      if (selectedDishes.includes(dishId)) {
        selectedDishes = selectedDishes.filter(id => id !== dishId);
      } else {
        selectedDishes.push(dishId);
      }
      renderInteractiveWidget();
    });
  });

  const btnSubmit = container.querySelector('#btn-submit-menu');
  if (btnSubmit) {
    btnSubmit.addEventListener('click', () => {
      const note = container.querySelector('#menu-note-input')?.value || '';
      socket.emit('slave_submit_choice', {
        selectedDishes,
        note,
        submittedAt: Date.now()
      });
    });
  }

  interactiveArea.appendChild(container);
}

// 3. Lucky Wheel Widget
function renderLuckyWheelWidget() {
  const prizes = currentSlide.prizes || [];
  const container = document.createElement('div');
  container.className = 'interactive-widget-box';

  container.innerHTML = `
    <div class="lucky-wheel-container">
      <div class="wheel-pointer"></div>
      <div class="wheel-canvas-wrap">
        <canvas id="luckyWheelCanvas" width="280" height="280"></canvas>
        <div class="wheel-center-pin">盛宴</div>
      </div>
      <div id="wheel-winner-display" style="display:none;" class="wheel-winner-card"></div>
    </div>
    <div style="text-align:center;font-size:13px;color:var(--text-muted);">
      ✨ 主控端啟動時，輪盤將與全場同步旋轉開獎！
    </div>
  `;

  interactiveArea.appendChild(container);
  drawWheel(0);
}

function drawWheel(rotationAngle = 0) {
  const canvas = document.getElementById('luckyWheelCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const prizes = currentSlide?.prizes || [];
  const count = prizes.length;
  if (count === 0) return;

  const width = canvas.width;
  const height = canvas.height;
  const radius = width / 2;
  const arc = (2 * Math.PI) / count;

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.translate(radius, radius);
  ctx.rotate(rotationAngle);

  prizes.forEach((prize, i) => {
    const angle = i * arc;
    ctx.beginPath();
    ctx.fillStyle = prize.color || '#f59e0b';
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, angle, angle + arc);
    ctx.lineTo(0, 0);
    ctx.fill();
    ctx.stroke();

    // Text label
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px -apple-system, sans-serif';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.translate(
      Math.cos(angle + arc / 2) * (radius * 0.65),
      Math.sin(angle + arc / 2) * (radius * 0.65)
    );
    ctx.rotate(angle + arc / 2 + Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText(prize.text, 0, 0);
    ctx.restore();
  });

  ctx.restore();
}

function spinWheelToPrize(prizeIndex, winningPrize) {
  if (isSpinning) return;
  isSpinning = true;

  const prizes = currentSlide?.prizes || [];
  const count = prizes.length;
  const arc = (2 * Math.PI) / count;

  // Wheel top pointer is at 3*PI/2 (270 degrees)
  const targetSectorCenter = prizeIndex * arc + arc / 2;
  const finalAngle = (1.5 * Math.PI - targetSectorCenter) + (Math.PI * 2 * 6); // 6 full spins

  const duration = 4500;
  const startTime = performance.now();

  function animate(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease-out cubic
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const currentRot = easeProgress * finalAngle;

    drawWheel(currentRot);

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      isSpinning = false;
      drawWheel(finalAngle);
      fireConfetti();
      const winnerDisplay = document.getElementById('wheel-winner-display');
      if (winnerDisplay && winningPrize) {
        winnerDisplay.textContent = `🎉 恭喜抽出：${winningPrize.text}！`;
        winnerDisplay.style.display = 'block';
      }
    }
  }

  requestAnimationFrame(animate);
}

// 4. Rating Widget
function renderRatingWidget() {
  const container = document.createElement('div');
  container.className = 'interactive-widget-box';

  let html = `
    <div style="text-align:center;font-size:14px;color:var(--accent-gold);font-weight:700;">
      ${currentSlide.promptText || '點選星級送上您的評分'}
    </div>
    <div class="rating-stars-row">
  `;

  for (let i = 1; i <= 5; i++) {
    html += `
      <button class="star-btn ${i <= selectedStars ? 'active' : ''}" data-val="${i}">★</button>
    `;
  }

  html += `
    </div>
    <textarea id="rating-comment" class="input-field" placeholder="留下一句暖心祝福或給主廚的讚美..." rows="3" style="resize:none;"></textarea>
    <button id="btn-submit-rating" class="btn btn-primary submit-action-btn">
      ⭐ 送出評價與祝福
    </button>
  `;

  if (currentState.hasSubmitted) {
    html += `
      <div class="submit-status-pill">
        <span>✓ 感謝您的暖心回饋！</span>
      </div>
    `;
  }

  container.innerHTML = html;

  container.querySelectorAll('.star-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedStars = Number(btn.dataset.val);
      renderInteractiveWidget();
    });
  });

  const btnSubmit = container.querySelector('#btn-submit-rating');
  if (btnSubmit) {
    btnSubmit.addEventListener('click', () => {
      const comment = container.querySelector('#rating-comment')?.value || '';
      if (selectedStars === 0) {
        showToast('請先點選 1~5 顆星！');
        return;
      }
      socket.emit('slave_submit_choice', {
        stars: selectedStars,
        comment,
        submittedAt: Date.now()
      });
    });
  }

  interactiveArea.appendChild(container);
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

// Confetti Effect
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
      y: canvas.height * 0.4,
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

// Start
joinSession();
