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

let currentFamilyNav = { side: 'groom', householdId: null, memberId: null };

socket.on('family_nav_synced', (nav) => {
  currentFamilyNav = nav || { side: 'groom', householdId: null, memberId: null };
  if (currentSlide && (currentSlide.type === 'family_tree' || currentSlide.type === 'family')) {
    renderFamilyTreeWidget();
  }
});

// Helper to get family tree data for active side
function getFamilyTreeData(side) {
  if (window.FAMILY_DATA && window.FAMILY_DATA[side]) {
    return window.FAMILY_DATA[side];
  }
  if (currentSlide && currentSlide.households) {
    return {
      side: side,
      title: side === 'bride' ? '🌸 新娘芷鈞家族譜系' : '👑 新郎東霖家族譜系',
      subtitle: side === 'bride' ? '芷鈞至親溫暖大家庭' : '至親三大幸福家庭',
      households: currentSlide.households
    };
  }
  return { side, households: [] };
}

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

// Audio Synthesizer Chimes (No external audio files needed)
let soundEnabled = true;
function playChimeSound(type = 'fanfare') {
  if (!soundEnabled) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    if (type === 'fanfare') {
      const freqs = [523.25, 659.25, 783.99, 1046.50];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.4);
      });
    } else if (type === 'pop') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.08);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);
    }
  } catch (e) {
    // Graceful fallback if blocked by browser policy
  }
}

// Floating Reactions Container
function ensureFloatingReactionContainer() {
  let container = document.getElementById('floating-reaction-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'floating-reaction-container';
    container.className = 'floating-reaction-container';
    document.body.appendChild(container);
  }
  return container;
}

function spawnFloatingReaction(emoji = '💖', senderName = '現場親友') {
  const container = ensureFloatingReactionContainer();
  const item = document.createElement('div');
  item.className = 'floating-reaction-item';
  const leftPercent = 12 + Math.random() * 72;
  item.style.left = `${leftPercent}%`;
  item.innerHTML = `
    <span class="react-emoji">${emoji}</span>
    <span class="react-sender">${senderName}</span>
  `;
  container.appendChild(item);
  setTimeout(() => {
    item.remove();
  }, 3200);
}

socket.on('floating_reaction', (data) => {
  spawnFloatingReaction(data.emoji, data.senderName);
});

// Single-Screen Animated Family Tree & Character Entrance Spotlight
function renderFamilyTreeWidget() {
  interactiveArea.innerHTML = '';

  const activeSide = currentFamilyNav.side || (currentSlide.familySide === 'bride' ? 'bride' : 'groom');
  const sideData = getFamilyTreeData(activeSide);
  const households = sideData.households || [];
  const currentHousehold = households.find(h => h.id === currentFamilyNav.householdId) || null;
  const activeMember = currentHousehold ? (currentHousehold.members || []).find(m => m.id === currentFamilyNav.memberId) : null;

  // Household members & Prev/Next Member calculation
  const householdMembers = currentHousehold ? (currentHousehold.members || []) : [];
  const currentMemberIndex = householdMembers.findIndex(m => m.id === currentFamilyNav.memberId);
  const prevMember = currentMemberIndex > 0 ? householdMembers[currentMemberIndex - 1] : null;
  const nextMember = currentMemberIndex >= 0 && currentMemberIndex < householdMembers.length - 1 ? householdMembers[currentMemberIndex + 1] : null;

  // Build the outer wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'family-scene-wrapper';

  // 1. Top Switcher: 男方家族 vs 女方家族
  const switcherHtml = `
    <div class="scene-side-switcher">
      <button class="scene-side-btn ${activeSide === 'groom' ? 'active' : ''}" data-side="groom">
        <span>🤵</span>
        <span>男方家族 (3個家庭)</span>
      </button>
      <button class="scene-side-btn ${activeSide === 'bride' ? 'active' : ''}" data-side="bride">
        <span>👰</span>
        <span>女方家族 (1個家庭)</span>
      </button>
    </div>
  `;

  // 2. SVG branch lines for Mode 1
  let svgBranchesHtml = '';
  if (activeSide === 'groom') {
    svgBranchesHtml = `
      <path class="branch-path" d="M 180 20 C 180 80, 60 80, 60 160" />
      <path class="branch-path" d="M 180 20 C 180 80, 180 100, 180 160" />
      <path class="branch-path" d="M 180 20 C 180 80, 300 80, 300 160" />
    `;
  } else {
    svgBranchesHtml = `
      <path class="branch-path" d="M 180 20 C 180 80, 180 100, 180 160" />
    `;
  }

  // 3. Household circular orbs for Mode 1
  let householdOrbsHtml = '';
  households.forEach(h => {
    let previewEmojis = (h.members || []).map(m => m.avatar || '👤').slice(0, 4).join(' ');
    householdOrbsHtml += `
      <div class="household-node-orb" data-hid="${h.id}">
        <div class="orb-circle" style="background:${h.accent || 'radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.25) 0%, rgba(22, 27, 40, 0.95) 75%)'};">
          <span>${h.icon || '🏠'}</span>
          <div class="orb-pulse-ring"></div>
        </div>
        <div class="orb-name-label">${h.shortTitle || h.title}</div>
        <div class="orb-count-pill">👥 ${h.count || (h.members || []).length} 位成員</div>
        <div class="orb-preview-row">${previewEmojis}</div>
      </div>
    `;
  });

  // 4. Member floating spheres for Mode 2
  let memberBubblesHtml = '';
  if (currentHousehold) {
    (currentHousehold.members || []).forEach(m => {
      memberBubblesHtml += `
        <div class="member-floating-bubble" data-mid="${m.id}">
          <div class="member-avatar-sphere" style="background:${m.avatarBg || 'var(--accent-gold)'};">
            <span>${m.avatar || '👤'}</span>
          </div>
          <div class="member-name-text">${m.name}</div>
          <div class="member-role-tag">${m.role}</div>
          <div class="member-tap-hint">✨ 登場</div>
        </div>
      `;
    });
  }

  // Mode visibility
  const showSpotlight = !!activeMember;
  const showMembers = !showSpotlight && !!currentHousehold;
  const showTree = !showSpotlight && !showMembers;

  const stageHtml = `
    <div class="scene-stage-canvas" id="scene-stage-canvas">
      <div class="scene-dust-particles"></div>

      <!-- VIEW 1: Tree Branches & Household Circular Orbs -->
      <div class="scene-view-tree ${showTree ? '' : 'hidden'}" id="scene-view-tree">
        <div class="tree-trunk-hub">
          <span>${sideData.title}</span>
        </div>

        <svg class="tree-branches-svg" viewBox="0 0 360 200" preserveAspectRatio="none">
          <defs>
            <linearGradient id="goldBranchGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.9" />
              <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.3" />
            </linearGradient>
          </defs>
          ${svgBranchesHtml}
        </svg>

        <div class="household-nodes-cluster">
          ${householdOrbsHtml}
        </div>

        <div class="tree-touch-hint">
          <span>✨ 點選家庭圓球・展開成員群星 ➔</span>
        </div>
      </div>

      <!-- VIEW 2: Household Members Constellation -->
      <div class="scene-view-members ${showMembers ? '' : 'hidden'}" id="scene-view-members">
        <div class="members-top-nav-bar">
          <button class="btn-scene-back-orb" id="btn-back-to-tree">
            <span>⬅️ 家族譜總覽</span>
          </button>
          <div class="scene-household-banner">
            ${currentHousehold ? `${currentHousehold.icon || '🏠'} ${currentHousehold.title} ｜ 👥 共有 ${currentHousehold.count || (currentHousehold.members || []).length} 位成員` : ''}
          </div>
        </div>

        <div class="members-constellation-wrap">
          ${memberBubblesHtml}
        </div>

        <button class="btn btn-primary" id="btn-cheer-household" style="margin-top:auto;width:100%;padding:10px;font-size:13px;border-radius:var(--radius-full);">
          <span>👏 為全體家人熱烈喝采！</span>
        </button>
      </div>

      <!-- VIEW 3: Character Entrance Spotlight Stage -->
      <div class="scene-view-spotlight ${showSpotlight ? '' : 'hidden'}" id="scene-view-spotlight">
        <div class="sunburst-beams"></div>

        <div class="spotlight-hero-card">
          <!-- Spotlight Prev / Next Navigation -->
          <div class="spotlight-nav-row">
            <button class="btn-spotlight-nav" id="btn-spotlight-prev" ${!prevMember ? 'disabled' : ''}>
              <span>◀</span>
              <span>${prevMember ? prevMember.name : '最前'}</span>
            </button>
            <div class="spotlight-nav-counter">
              ${currentMemberIndex >= 0 ? `${currentMemberIndex + 1} / ${householdMembers.length}` : ''}
            </div>
            <button class="btn-spotlight-nav" id="btn-spotlight-next" ${!nextMember ? 'disabled' : ''}>
              <span>${nextMember ? nextMember.name : '最後'}</span>
              <span>▶</span>
            </button>
          </div>

          <div class="spotlight-entrance-tag">🌟 家族焦點・隆重登場 🌟</div>

          <div class="spotlight-avatar-container">
            <div class="spotlight-avatar-halo"></div>
            <div class="spotlight-hero-avatar-orb" style="background:${activeMember ? activeMember.avatarBg : 'var(--accent-gold)'};">
              <span>${activeMember ? activeMember.avatar : '👤'}</span>
            </div>
          </div>

          <div class="spotlight-hero-name">${activeMember ? activeMember.name : ''}</div>
          <div class="spotlight-hero-role-pill">${activeMember ? `${activeMember.role} • ${activeMember.tag}` : ''}</div>

          <div class="spotlight-comic-bubble">
            ${activeMember ? activeMember.quote : ''}
          </div>

          <div class="spotlight-action-row">
            <button class="btn-scene-action btn-cheer" id="btn-scene-spotlight-cheer">
              <span>👏 為他喝采！</span>
            </button>
            <button class="btn-scene-action btn-back" id="btn-scene-spotlight-back">
              <span>👥 其他成員</span>
            </button>
            <button class="btn-scene-action btn-tree" id="btn-scene-spotlight-tree">
              <span>🏛️ 家族譜</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  wrapper.innerHTML = switcherHtml + stageHtml;
  interactiveArea.appendChild(wrapper);

  // Attach event handlers
  // Side switcher
  wrapper.querySelectorAll('.scene-side-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const side = btn.dataset.side;
      currentFamilyNav.side = side;
      currentFamilyNav.householdId = null;
      currentFamilyNav.memberId = null;
      renderFamilyTreeWidget();
    });
  });

  // Household orb click
  wrapper.querySelectorAll('.household-node-orb').forEach(orb => {
    orb.addEventListener('click', () => {
      const hid = orb.dataset.hid;
      currentFamilyNav.householdId = hid;
      currentFamilyNav.memberId = null;
      playChimeSound('pop');
      renderFamilyTreeWidget();
    });
  });

  // Back to tree
  const btnBackTree = wrapper.querySelector('#btn-back-to-tree');
  if (btnBackTree) {
    btnBackTree.addEventListener('click', () => {
      currentFamilyNav.householdId = null;
      currentFamilyNav.memberId = null;
      renderFamilyTreeWidget();
    });
  }

  // Cheer household
  const btnCheerHouse = wrapper.querySelector('#btn-cheer-household');
  if (btnCheerHouse) {
    btnCheerHouse.addEventListener('click', () => {
      fireConfetti();
      playChimeSound('pop');
      const emojis = ['👏', '🎉', '🥂', '💖', '✨'];
      const em = emojis[Math.floor(Math.random() * emojis.length)];
      socket.emit('send_reaction', { emoji: em, memberId: null });
      spawnFloatingReaction(em, guestName || '現場親友');
      showToast('🎉 感謝您的熱情喝采與掌聲！');
      socket.emit('slave_submit_choice', { cheered: true, side: activeSide, household: currentHousehold ? currentHousehold.title : '' });
    });
  }

  // Member bubble click
  wrapper.querySelectorAll('.member-floating-bubble').forEach(bubble => {
    bubble.addEventListener('click', () => {
      const mid = bubble.dataset.mid;
      currentFamilyNav.memberId = mid;
      renderFamilyTreeWidget();
    });
  });

  // Spotlight Prev / Next buttons
  const btnPrev = wrapper.querySelector('#btn-spotlight-prev');
  if (btnPrev && prevMember) {
    btnPrev.addEventListener('click', () => {
      currentFamilyNav.memberId = prevMember.id;
      renderFamilyTreeWidget();
    });
  }

  const btnNext = wrapper.querySelector('#btn-spotlight-next');
  if (btnNext && nextMember) {
    btnNext.addEventListener('click', () => {
      currentFamilyNav.memberId = nextMember.id;
      renderFamilyTreeWidget();
    });
  }

  // Spotlight cheer
  const btnSpotlightCheer = wrapper.querySelector('#btn-scene-spotlight-cheer');
  if (btnSpotlightCheer) {
    btnSpotlightCheer.addEventListener('click', () => {
      fireConfetti();
      playChimeSound('pop');
      const emojis = ['💖', '👏', '🎉', '🥂', '✨', '💐', '🎊'];
      const em = emojis[Math.floor(Math.random() * emojis.length)];
      socket.emit('send_reaction', { emoji: em, memberId: activeMember ? activeMember.id : null });
      spawnFloatingReaction(em, guestName || '我');
      showToast(`💖 為「${activeMember ? activeMember.name : ''}」獻上熱烈喝采！`);
      socket.emit('slave_submit_choice', { cheeredMember: activeMember ? activeMember.name : '', submittedAt: Date.now() });
    });
  }

  // Spotlight back to members
  const btnSpotlightBack = wrapper.querySelector('#btn-scene-spotlight-back');
  if (btnSpotlightBack) {
    btnSpotlightBack.addEventListener('click', () => {
      currentFamilyNav.memberId = null;
      renderFamilyTreeWidget();
    });
  }

  // Spotlight back to tree
  const btnSpotlightTree = wrapper.querySelector('#btn-scene-spotlight-tree');
  if (btnSpotlightTree) {
    btnSpotlightTree.addEventListener('click', () => {
      currentFamilyNav.householdId = null;
      currentFamilyNav.memberId = null;
      renderFamilyTreeWidget();
    });
  }

  // If spotlight active, trigger entrance audio & confetti
  if (showSpotlight) {
    playChimeSound('fanfare');
    fireConfetti();
  }
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
