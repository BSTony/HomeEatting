// Family Tree & Members Data for Donglin & Zhijun's Banquet
// 男方 3 個家庭 (10人) & 女方 1 個家庭 (5人)

window.FAMILY_DATA = {
  groom: {
    side: 'groom',
    sideName: '男方家族',
    title: '👑 新郎東霖家族譜系',
    subtitle: '至親三大幸福家庭・金玉滿堂',
    households: [
      {
        id: 'h-groom-main',
        title: '新郎本家核心家庭',
        shortTitle: '新郎本家',
        icon: '🏠',
        count: 3,
        accent: 'linear-gradient(135deg, #f59e0b, #d97706)',
        members: [
          {
            id: 'm-grandma',
            name: '金珠 奶奶',
            role: '新郎奶奶',
            tag: '德高望重大家長',
            avatar: '👵',
            avatarBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
            title: '全家族福氣象徵・定海神針大家長',
            quote: '「今天看到乖孫娶這麼漂亮的媳婦，奶奶打從心底最歡喜！全家平安幸福！」'
          },
          {
            id: 'm-groom',
            name: '東霖 (新郎)',
            role: '新郎本尊',
            tag: '帥氣男主角',
            avatar: '🤵',
            avatarBg: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            title: '新好男人・寵妻第一名男主角',
            quote: '「謝謝奶奶、妹妹與所有至親！今晚我把最愛的芷鈞娶回家了，感恩全家人！」'
          },
          {
            id: 'm-sister',
            name: '玉婷',
            role: '新郎妹妹',
            tag: '貼心神隊友',
            avatar: '👧',
            avatarBg: 'linear-gradient(135deg, #ec4899, #be185d)',
            title: '甜美可愛・哥哥最讚神隊友',
            quote: '「哥哥終於把女神嫂嫂娶進門啦！以後我有最美嫂嫂當靠山，哥哥退位！」'
          }
        ]
      },
      {
        id: 'h-groom-aunt',
        title: '姑姑姑丈活力家庭',
        shortTitle: '姑姑姑丈家',
        icon: '🏡',
        count: 4,
        accent: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
        members: [
          {
            id: 'm-aunt',
            name: '奈玲 姑姑',
            role: '新郎姑姑',
            tag: '熱情活力擔當',
            avatar: '👩',
            avatarBg: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
            title: '開朗大方・家族聚會氣氛第一名',
            quote: '「東霖大喜的日子，姑姑一定要全場最熱情應援！祝福新人甜甜蜜蜜長長久久！」'
          },
          {
            id: 'm-uncle-in-law',
            name: '銘忠 姑丈',
            role: '新郎姑丈',
            tag: '幽默風趣長輩',
            avatar: '👨',
            avatarBg: 'linear-gradient(135deg, #10b981, #047857)',
            title: '沉穩風趣・親切幽默的好長輩',
            quote: '「恭喜東霖成家立業！婚姻生活的幸福秘訣只有一句話：聽老婆的話就對了！」'
          },
          {
            id: 'm-cousin-m1',
            name: '淳瑋',
            role: '新郎表弟',
            tag: '陽光開朗好青年',
            avatar: '👦',
            avatarBg: 'linear-gradient(135deg, #06b6d4, #0e7490)',
            title: '青春活力・熱情開朗好青年',
            quote: '「恭喜表哥！今天表哥帥翻天，表嫂美若天仙！有任何任務表弟全包！」'
          },
          {
            id: 'm-cousin-f1',
            name: '芷瑄',
            role: '新郎表妹',
            tag: '元氣甜美小仙女',
            avatar: '👧',
            avatarBg: 'linear-gradient(135deg, #f43f5e, #e11d48)',
            title: '青春甜美・家族顏值小仙女',
            quote: '「表哥娶到美嬌娘太替你開心了！祝東霖哥跟芷鈞姐永遠恩恩愛愛！」'
          }
        ]
      },
      {
        id: 'h-groom-uncle',
        title: '叔叔嬸嬸幸福家庭',
        shortTitle: '叔叔嬸嬸家',
        icon: '🏡',
        count: 3,
        accent: 'linear-gradient(135deg, #f97316, #c2410c)',
        members: [
          {
            id: 'm-uncle',
            name: '文進 叔叔',
            role: '新郎叔叔',
            tag: '豪邁霸氣挺新郎',
            avatar: '👨',
            avatarBg: 'linear-gradient(135deg, #f97316, #c2410c)',
            title: '霸氣豪爽・最罩最挺的新郎叔叔',
            quote: '「東霖好樣的！從小看你長大，今天看你成家，叔叔敬你們夫妻一大杯！」'
          },
          {
            id: 'm-aunt2',
            name: '淑娟 嬸嬸',
            role: '新郎嬸嬸',
            tag: '溫柔優雅賢內助',
            avatar: '👩',
            avatarBg: 'linear-gradient(135deg, #a855f7, #7e22ce)',
            title: '氣質優雅・親切溫暖的賢內助',
            quote: '「看東霖與芷鈞站在一塊兒真是郎才女貌，祝福你們攜手築起溫暖幸福的家！」'
          },
          {
            id: 'm-cousin-m2',
            name: '東宸',
            role: '新郎堂弟',
            tag: '機敏未來新星',
            avatar: '👦',
            avatarBg: 'linear-gradient(135deg, #14b8a6, #0f766e)',
            title: '機靈有禮・家族未來耀眼新星',
            quote: '「恭喜堂哥大婚！祝堂哥堂嫂永浴愛河、早生貴子！」'
          }
        ]
      }
    ]
  },
  bride: {
    side: 'bride',
    sideName: '女方家族',
    title: '🌸 新娘芷鈞家族譜系',
    subtitle: '芷鈞至親溫暖大家庭・掌上明珠',
    households: [
      {
        id: 'h-bride-main',
        title: '芷鈞至親溫暖大家庭',
        shortTitle: '新娘本家',
        icon: '🌸',
        count: 5,
        accent: 'linear-gradient(135deg, #f43f5e, #be123c)',
        members: [
          {
            id: 'm-b-father',
            name: '新娘爸爸',
            role: '慈愛父親',
            tag: '如山依靠厚實港灣',
            avatar: '👨',
            avatarBg: 'linear-gradient(135deg, #3b82f6, #1e40af)',
            title: '沉穩深情・芷鈞最溫暖厚實的靠山',
            quote: '「東霖，我把這輩子最疼愛的掌上明珠交給你了，願你們相互扶持、白頭偕老！」'
          },
          {
            id: 'm-b-mother',
            name: '新娘媽媽',
            role: '溫柔母親',
            tag: '慈愛春風無微不至',
            avatar: '👩',
            avatarBg: 'linear-gradient(135deg, #ec4899, #9d174d)',
            title: '心靈港灣・無微不至溫暖慈暉',
            quote: '「看到芷鈞笑得這麼幸福，媽媽心裡都是感動。祝福女兒女婿永遠甜甜蜜蜜！」'
          },
          {
            id: 'm-b-brother',
            name: '新娘哥哥',
            role: '新娘哥哥',
            tag: '護妹擔當帥氣兄長',
            avatar: '👦',
            avatarBg: 'linear-gradient(135deg, #10b981, #065f46)',
            title: '挺拔帥氣・最有肩膀與擔當的兄長',
            quote: '「東霖老弟，我妹妹可是我們家的寶，你要一輩子好好寵她！恭喜你們！」'
          },
          {
            id: 'm-b-sister',
            name: '新娘姊姊',
            role: '新娘姊姊',
            tag: '知性閨蜜最棒智囊',
            avatar: '👧',
            avatarBg: 'linear-gradient(135deg, #8b5cf6, #5b21b6)',
            title: '知性優雅・無話不談的最棒閨蜜',
            quote: '「妹妹出嫁太捨不得了，但看到東霖這麼疼妳，我就放心了！永遠幸福喔！」'
          },
          {
            id: 'm-b-bride',
            name: '芷鈞 (新娘)',
            role: '美麗女主角',
            tag: '絕美閃亮新娘',
            avatar: '👰',
            avatarBg: 'linear-gradient(135deg, #f43f5e, #be123c)',
            title: '溫柔聰慧・今晚全場最閃亮新娘',
            quote: '「謝謝爸爸媽媽、哥哥姊姊把我捧在手心疼愛，今天我帶著滿滿的愛與東霖攜手共度一生！」'
          }
        ]
      }
    ]
  }
};
