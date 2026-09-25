const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;
const MASTER_PIN = process.env.MASTER_PIN || '8888';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Path to data
const defaultSlidesPath = path.join(__dirname, 'data', 'default-slides.json');
const savedSlidesPath = path.join(__dirname, 'data', 'slides.json');

// In-memory application state
let slides = [];
try {
  if (fs.existsSync(savedSlidesPath)) {
    slides = JSON.parse(fs.readFileSync(savedSlidesPath, 'utf8'));
  } else if (fs.existsSync(defaultSlidesPath)) {
    slides = JSON.parse(fs.readFileSync(defaultSlidesPath, 'utf8'));
  }
} catch (err) {
  console.error('Error loading initial slides:', err);
  slides = [
    {
      id: 'default-1',
      type: 'showcase',
      title: '盛宴同步系統',
      subtitle: 'Feast Synchronized Display',
      badge: '歡迎',
      content: '主控端可在此自由切換投影片與互動選單。',
      imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80'
    }
  ];
}

let currentIndex = 0;
let allowSelection = true;
let showResults = false;
let familyTreeNav = { side: 'groom', householdId: null, memberId: null };

// Submissions store: { [slideId]: [ { socketId, guestName, data, timestamp } ] }
let submissions = {};

// Connected clients store: Map(socketId => { socketId, role, name, joinedAt, ip })
const connectedClients = new Map();

function saveSlidesToFile() {
  try {
    fs.writeFileSync(savedSlidesPath, JSON.stringify(slides, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save slides:', err);
  }
}

function getSlideSummary(slideId) {
  const list = submissions[slideId] || [];
  const currentSlide = slides.find(s => s.id === slideId);
  if (!currentSlide) return { totalCount: list.length, details: list };

  if (currentSlide.type === 'poll') {
    const counts = {};
    if (currentSlide.options) {
      currentSlide.options.forEach(opt => { counts[opt.id] = 0; });
    }
    list.forEach(sub => {
      const choice = sub.data?.choice;
      if (Array.isArray(choice)) {
        choice.forEach(c => { counts[c] = (counts[c] || 0) + 1; });
      } else if (choice) {
        counts[choice] = (counts[choice] || 0) + 1;
      }
    });
    return {
      totalCount: list.length,
      counts,
      submissions: list
    };
  }

  if (currentSlide.type === 'menu') {
    const dishCounts = {};
    list.forEach(sub => {
      const selected = sub.data?.selectedDishes || [];
      selected.forEach(dishId => {
        dishCounts[dishId] = (dishCounts[dishId] || 0) + 1;
      });
    });
    return {
      totalCount: list.length,
      dishCounts,
      submissions: list
    };
  }

  if (currentSlide.type === 'rating') {
    let sum = 0;
    const starCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    list.forEach(sub => {
      const stars = Number(sub.data?.stars) || 0;
      if (stars >= 1 && stars <= 5) {
        starCounts[stars] = (starCounts[stars] || 0) + 1;
        sum += stars;
      }
    });
    const avg = list.length > 0 ? (sum / list.length).toFixed(1) : 0;
    return {
      totalCount: list.length,
      average: avg,
      starCounts,
      submissions: list
    };
  }

  return {
    totalCount: list.length,
    submissions: list
  };
}

function getMasterDashboardPayload() {
  const currentSlide = slides[currentIndex] || null;
  const slideId = currentSlide ? currentSlide.id : null;
  return {
    currentIndex,
    totalSlides: slides.length,
    currentSlide,
    allowSelection,
    showResults,
    familyTreeNav,
    summary: slideId ? getSlideSummary(slideId) : null,
    connectedCount: connectedClients.size,
    slavesCount: Array.from(connectedClients.values()).filter(c => c.role === 'slave').length,
    clientsList: Array.from(connectedClients.values())
  };
}

function getSlavePayload(socketId) {
  const currentSlide = slides[currentIndex] || null;
  const slideId = currentSlide ? currentSlide.id : null;
  const userSubmissions = slideId && submissions[slideId]
    ? submissions[slideId].find(s => s.socketId === socketId)
    : null;

  return {
    currentIndex,
    totalSlides: slides.length,
    currentSlide,
    allowSelection,
    showResults,
    familyTreeNav,
    summary: showResults && slideId ? getSlideSummary(slideId) : null,
    hasSubmitted: !!userSubmissions,
    mySubmission: userSubmissions ? userSubmissions.data : null
  };
}

// REST API Endpoints
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    slidesCount: slides.length,
    currentIndex,
    clientsCount: connectedClients.size,
    uptime: process.uptime()
  });
});

app.get('/api/slides', (req, res) => {
  res.json(slides);
});

app.post('/api/slides', (req, res) => {
  const { pin, newSlides } = req.body;
  if (pin !== MASTER_PIN) {
    return res.status(403).json({ error: '密碼不正確' });
  }
  if (!Array.isArray(newSlides) || newSlides.length === 0) {
    return res.status(400).json({ error: '投影片格式不正確' });
  }
  slides = newSlides;
  if (currentIndex >= slides.length) {
    currentIndex = 0;
  }
  saveSlidesToFile();
  io.emit('slides_reloaded', { slides, currentIndex });
  res.json({ success: true, count: slides.length });
});

app.post('/api/reset-data', (req, res) => {
  const { pin } = req.body;
  if (pin !== MASTER_PIN) {
    return res.status(403).json({ error: '密碼不正確' });
  }
  submissions = {};
  io.emit('data_reset');
  res.json({ success: true });
});

// Socket.io Real-Time Synchronization
io.on('connection', (socket) => {
  const clientIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;

  socket.on('join', (data = {}) => {
    const { role = 'slave', name = '', pin = '' } = data;

    if (role === 'master') {
      if (pin !== MASTER_PIN) {
        socket.emit('auth_error', { message: '主控端授權密碼錯誤，請重新輸入' });
        return;
      }
      socket.join('master_room');
      connectedClients.set(socket.id, {
        socketId: socket.id,
        role: 'master',
        name: name || '主控指揮台',
        joinedAt: new Date().toISOString(),
        ip: clientIp
      });

      socket.emit('master_init', {
        slides,
        dashboard: getMasterDashboardPayload(),
        masterPin: MASTER_PIN
      });
      io.to('master_room').emit('clients_updated', {
        connectedCount: connectedClients.size,
        slavesCount: Array.from(connectedClients.values()).filter(c => c.role === 'slave').length,
        clientsList: Array.from(connectedClients.values())
      });
      return;
    }

    // Role: Slave
    const guestNumber = Array.from(connectedClients.values()).filter(c => c.role === 'slave').length + 1;
    const guestName = name.trim() || `貴賓 #${guestNumber}`;

    connectedClients.set(socket.id, {
      socketId: socket.id,
      role: 'slave',
      name: guestName,
      joinedAt: new Date().toISOString(),
      ip: clientIp
    });

    socket.emit('slave_init', {
      name: guestName,
      state: getSlavePayload(socket.id)
    });

    // Notify masters of new client
    io.to('master_room').emit('clients_updated', {
      connectedCount: connectedClients.size,
      slavesCount: Array.from(connectedClients.values()).filter(c => c.role === 'slave').length,
      clientsList: Array.from(connectedClients.values())
    });
  });

  // Master switches slide
  socket.on('master_change_slide', ({ index }) => {
    const client = connectedClients.get(socket.id);
    if (!client || client.role !== 'master') return;

    if (typeof index === 'number' && index >= 0 && index < slides.length) {
      currentIndex = index;
      const currentSlide = slides[currentIndex];
      const defaultSide = (currentSlide && currentSlide.familySide) || 'groom';
      familyTreeNav = { side: defaultSide, householdId: null, memberId: null };

      // Broadcast to all slaves
      io.emit('slide_changed', {
        currentIndex,
        totalSlides: slides.length,
        currentSlide,
        allowSelection,
        showResults,
        familyTreeNav,
        summary: showResults ? getSlideSummary(currentSlide.id) : null
      });

      // Update masters with full telemetry
      io.to('master_room').emit('master_telemetry_updated', getMasterDashboardPayload());
    }
  });

  // Master navigates within family tree (select household or spotlight person)
  socket.on('master_family_nav', ({ side = 'groom', householdId = null, memberId = null }) => {
    const client = connectedClients.get(socket.id);
    if (!client || client.role !== 'master') return;

    familyTreeNav = { side, householdId, memberId };
    io.emit('family_nav_synced', familyTreeNav);
    io.to('master_room').emit('master_telemetry_updated', getMasterDashboardPayload());
  });

  // Master toggles interactive selection (allows/locks slave choices)
  socket.on('master_toggle_selection', ({ enabled }) => {
    const client = connectedClients.get(socket.id);
    if (!client || client.role !== 'master') return;

    allowSelection = !!enabled;
    io.emit('selection_toggled', { allowSelection });
    io.to('master_room').emit('master_telemetry_updated', getMasterDashboardPayload());
  });

  // Master toggles results visibility on slave screens
  socket.on('master_toggle_results', ({ show }) => {
    const client = connectedClients.get(socket.id);
    if (!client || client.role !== 'master') return;

    showResults = !!show;
    const currentSlide = slides[currentIndex];
    const summary = currentSlide ? getSlideSummary(currentSlide.id) : null;

    io.emit('results_toggled', { showResults, summary });
    io.to('master_room').emit('master_telemetry_updated', getMasterDashboardPayload());
  });

  // Master broadcasts urgent notification or banner toast
  socket.on('master_broadcast_notice', (notice) => {
    const client = connectedClients.get(socket.id);
    if (!client || client.role !== 'master') return;

    io.emit('broadcast_notice', {
      message: notice.message || '',
      type: notice.type || 'info', // 'info' | 'warning' | 'success' | 'alert'
      duration: notice.duration || 5000,
      timestamp: Date.now()
    });
  });

  // Master triggers special synchronized event (confetti / lucky spin)
  socket.on('master_trigger_action', (actionData) => {
    const client = connectedClients.get(socket.id);
    if (!client || client.role !== 'master') return;

    io.emit('trigger_action', actionData);
  });

  // Client (slave or master) sends live floating reaction
  socket.on('send_reaction', (reaction = {}) => {
    const client = connectedClients.get(socket.id);
    const senderName = client ? client.name : '現場親友';
    io.emit('floating_reaction', {
      emoji: reaction.emoji || '💖',
      memberId: reaction.memberId || null,
      senderName,
      timestamp: Date.now()
    });
  });

  // Master adds/edits/reorders slides
  socket.on('master_update_slides', ({ newSlides, targetIndex = 0 }) => {
    const client = connectedClients.get(socket.id);
    if (!client || client.role !== 'master') return;

    if (Array.isArray(newSlides) && newSlides.length > 0) {
      slides = newSlides;
      currentIndex = Math.min(targetIndex, slides.length - 1);
      saveSlidesToFile();

      io.emit('slides_reloaded', {
        slides,
        currentIndex,
        currentSlide: slides[currentIndex]
      });
      io.to('master_room').emit('master_telemetry_updated', getMasterDashboardPayload());
    }
  });

  // Slave submits choice (poll option, menu dishes, star rating, etc.)
  socket.on('slave_submit_choice', (data = {}) => {
    const client = connectedClients.get(socket.id);
    const guestName = client ? client.name : '神秘嘉賓';
    const currentSlide = slides[currentIndex];
    if (!currentSlide) return;

    if (!allowSelection) {
      socket.emit('submission_error', { message: '目前主控端已暫時關閉作答與選擇' });
      return;
    }

    const slideId = currentSlide.id;
    if (!submissions[slideId]) {
      submissions[slideId] = [];
    }

    // Check if user already submitted for this slide -> update it
    const existingIndex = submissions[slideId].findIndex(s => s.socketId === socket.id);
    const submissionItem = {
      socketId: socket.id,
      guestName,
      data,
      timestamp: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      submissions[slideId][existingIndex] = submissionItem;
    } else {
      submissions[slideId].push(submissionItem);
    }

    // Acknowledge slave
    socket.emit('submission_accepted', {
      slideId,
      data,
      message: '選擇已成功送出！'
    });

    const updatedSummary = getSlideSummary(slideId);

    // Update masters in real time
    io.to('master_room').emit('submission_received', {
      slideId,
      guestName,
      data,
      summary: updatedSummary
    });
    io.to('master_room').emit('master_telemetry_updated', getMasterDashboardPayload());

    // If showResults is enabled, broadcast updated stats to all slaves as well
    if (showResults) {
      io.emit('summary_updated', {
        slideId,
        summary: updatedSummary
      });
    }
  });

  // Slave updates their name
  socket.on('slave_update_name', ({ name }) => {
    const client = connectedClients.get(socket.id);
    if (client && name && name.trim()) {
      client.name = name.trim();
      socket.emit('name_updated', { name: client.name });
      io.to('master_room').emit('clients_updated', {
        connectedCount: connectedClients.size,
        slavesCount: Array.from(connectedClients.values()).filter(c => c.role === 'slave').length,
        clientsList: Array.from(connectedClients.values())
      });
    }
  });

  // Client disconnects
  socket.on('disconnect', () => {
    const client = connectedClients.get(socket.id);
    connectedClients.delete(socket.id);

    io.to('master_room').emit('clients_updated', {
      connectedCount: connectedClients.size,
      slavesCount: Array.from(connectedClients.values()).filter(c => c.role === 'slave').length,
      clientsList: Array.from(connectedClients.values())
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=========================================`);
  console.log(`🚀 家宴同步看板伺服器已啟動！`);
  console.log(`📡 運行通訊埠: http://localhost:${PORT}`);
  console.log(`👑 主控台位址: http://localhost:${PORT}/master.html (預設密碼: ${MASTER_PIN})`);
  console.log(`📱 賓客端位址: http://localhost:${PORT}/slave.html 或 http://localhost:${PORT}/`);
  console.log(`=========================================`);
});
