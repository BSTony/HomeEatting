// Built-in Presets for Slides
window.SLIDE_PRESETS = {
  banquet: {
    name: "🏮 溫馨闔家盛宴 (預設)",
    description: "開場歡迎、主廚菜單點選、人氣菜色票選、大獎輪盤、心得星級評價",
    slides: [
      {
        id: "b-1",
        type: "showcase",
        title: "🏮 闔家歡聚・盛宴開席",
        subtitle: "Warm Family Gathering Feast",
        badge: "歡迎入場",
        content: "歡迎各位家人與好友蒞臨！今晚讓我們放下忙碌，共享美味佳餚與溫馨歡笑。\n手機連線後將自動同步主控螢幕，並可即時參與互動點餐與抽獎！",
        imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
        theme: "amber"
      },
      {
        id: "b-2",
        type: "menu",
        title: "📋 今晚家宴特選菜單",
        subtitle: "Chef's Special Tasting Menu",
        badge: "點選菜色",
        content: "請在手機端勾選您最期待品嚐或想加點的菜色，主控端將即時彙整統計送進廚房！",
        imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80",
        menuCategories: [
          {
            category: "開胃前菜",
            items: [
              { id: "m1", name: "金沙烏魚子脆餅", desc: "野生烏魚子佐脆青蘋果片" },
              { id: "m2", name: "松露野菇炙干貝", desc: "北海道生食級干貝佐黑松露醬" }
            ]
          },
          {
            category: "主廚大菜",
            items: [
              { id: "m3", name: "特級花雕醉仙雞", desc: "陳釀花雕酒溫潤甘醇浸漬" },
              { id: "m4", name: "古法清蒸龍虎斑", desc: "當日現捕鮮甜細緻蔥油淋" },
              { id: "m5", name: "慢火醬烤牛小排", desc: "獨家特調私房果香甜醬" }
            ]
          },
          {
            category: "暖胃湯品 & 甜點",
            items: [
              { id: "m6", name: "金湯花膠燉土雞", desc: "文火慢熬八小時濃郁膠質" },
              { id: "m7", name: "手工拔絲香芋脆捲", desc: "大甲芋頭綿密香濃金黃脆皮" }
            ]
          }
        ]
      },
      {
        id: "b-3",
        type: "poll",
        title: "🗳️ 互動投票：今晚第一人氣菜色？",
        subtitle: "Vote for Tonight's Favorite Dish",
        badge: "即時票選",
        content: "品嚐完美饌後，誰是您心目中最令人難忘的料理？請投下您神聖的一票！",
        imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
        allowMulti: false,
        options: [
          { id: "p1", text: "🥇 金沙烏魚子佐炙干貝" },
          { id: "p2", text: "🥩 慢火醬烤蜜汁牛小排" },
          { id: "p3", text: "🐟 古法清蒸鮮甜龍虎斑" },
          { id: "p4", text: "🍲 金湯花膠極品燉土雞" }
        ]
      },
      {
        id: "b-4",
        type: "lucky_wheel",
        title: "🎡 盛宴歡樂幸運大轉盤",
        subtitle: "Synchronized Lucky Draw",
        badge: "同步抽獎",
        content: "主控端啟動輪盤轉動時，所有在座賓客的手機將同步旋轉並抽出幸運大獎！",
        imageUrl: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80",
        prizes: [
          { id: "w1", text: "🧧 特獎紅包 888", color: "#ff4d4f" },
          { id: "w2", text: "🍾 高級陳釀紅酒一瓶", color: "#fa8c16" },
          { id: "w3", text: "🎁 驚喜文創伴手禮", color: "#faad14" },
          { id: "w4", text: "🎤 上台獻唱歡樂一曲", color: "#52c41a" },
          { id: "w5", text: "🥂 全桌親友共同乾杯", color: "#1890ff" },
          { id: "w6", "text": "👑 免收拾免洗碗特權", color: "#722ed1" }
        ]
      },
      {
        id: "b-5",
        type: "rating",
        title: "⭐ 家宴滿意度與寄語祝福",
        subtitle: "Rating & Warm Wishes",
        badge: "心得回饋",
        content: "感謝大家今晚的熱情相聚，請給今晚的氛圍與菜色打星評分，並留下一句祝福送給全家人！",
        imageUrl: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1200&q=80",
        maxStars: 5,
        promptText: "點選星級，並可寫下想對大家說的話"
      }
    ]
  },
  tech_showcase: {
    name: "⚡ 科技發表會／提案簡報",
    description: "產品核心亮點、功能滿意度調查、聽眾提問互動",
    slides: [
      {
        id: "t-1",
        type: "showcase",
        title: "🚀 新一代跨螢幕即時互動系統",
        subtitle: "Next-Gen Multi-Display Realtime Engine",
        badge: "產品發布",
        content: "毫秒級 WebSocket 全雙工同步架構，主控端一手掌握各端螢幕與即時互動反饋。",
        imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80"
      },
      {
        id: "t-2",
        type: "poll",
        title: "📊 現場調查：哪項特色最吸引您？",
        subtitle: "Audience Realtime Survey",
        badge: "即時問答",
        content: "請從屬端點選您最看重的技術特點：",
        imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80",
        allowMulti: false,
        options: [
          { id: "o1", text: "⚡ 極低延遲毫秒級同步" },
          { id: "o2", text: "📱 免裝 App 掃碼即用" },
          { id: "o3", text: "☁️ 一鍵部署至 Render 雲端" },
          { id: "o4", text: "🎨 高質感玻璃擬態視覺設計" }
        ]
      }
    ]
  }
};
