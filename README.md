# 🏮 闔家盛宴・跨螢幕同步互動系統 (Feast Sync Display)

一套專為聚會宴席、展演發布會打造的**跨螢幕即時同步與互動系統**。
主控端（Master）進行切換操作時，所有從屬端（Slave / 客人手機或螢幕）會**毫秒級即時鏡像同步**，並可開放客人進行菜單點選、人氣票選、幸運輪盤抽獎與星級評價！

---

## ✨ 核心特色亮點

1. ⚡ **毫秒級雙向即時同步**：基於 Node.js + WebSocket (Socket.IO) 全雙工架構，翻頁、選項切換無縫同步。
2. 📱 **免裝 App・掃碼即用**：賓客只需使用手機相機掃描現場 QR Code，即可連入並同步顯示。
3. 👑 **強大主控指揮台 (`/master.html`)**：
   - 即時鏡像預覽螢幕（同步顯示賓客端畫面）。
   - 鍵盤快速翻頁（`←` / `→` / `Space` 空白鍵）。
   - 「允許作答／鎖定螢幕」一鍵切換。
   - 「公開開榜／隱藏統計」一鍵廣播即時票數百分比。
   - 🎊 全場施放彩色慶祝彩帶。
   - 🎡 同步啟動幸運大轉盤抽獎。
   - 📢 全場緊急跑馬燈廣播通知。
4. 🗳️ **豐富的互動模式**：
   - **展示卡片**：高畫質美饌美照、標題、說明。
   - **菜單點選**：開胃前菜、主廚大菜、湯品甜點分類勾選，並可備註個人喜好。
   - **即時人氣投票**：單選／多選即時票選，主控公開後動態長條圖開榜。
   - **幸運大輪盤**：主控端一鍵旋轉，所有手機同時旋轉並開出大獎。
   - **星級評價與祝福**：1~5 顆星滿意度評分與留言板。
5. ☁️ **完全相容 Render 雲端部署**：已預先設定好動態 PORT 綁定與 `render.yaml`，免配置一鍵上線。

---

## 🚀 本地快速啟動測試

1. **安裝依賴套件**：
   ```bash
   npm install
   ```

2. **啟動伺服器**：
   ```bash
   npm start
   ```

3. **開啟瀏覽器**：
   - 入口導航頁：[http://localhost:3000/](http://localhost:3000/)
   - 主控端（控制台）：[http://localhost:3000/master.html](http://localhost:3000/master.html) *(預設密碼：`8888`)*
   - 從屬端（賓客端）：[http://localhost:3000/slave.html](http://localhost:3000/slave.html)

> 💡 **測試小技巧**：在電腦上左右各開一個瀏覽器視窗（左邊開 `master.html`，右邊開 `slave.html`），操作左邊翻頁或開榜，右邊會即時響應！

---

## 🌐 部署至 Render.com 步驟教學

本專案完全針對 Render 進行優化，依照以下步驟即可免費部署上線：

### 步驟 1：建立 GitHub 儲存庫並推動程式碼
在專案目錄下執行：
```bash
git init
git add .
git commit -m "feat: initial feast sync display system"
git branch -M main
git remote add origin https://github.com/您的帳號/您的專案名.git
git push -u origin main
```

### 步驟 2：登入 Render.com 建立服務
1. 前往 [Render Dashboard](https://dashboard.render.com/)，點擊 **New +** ➔ 選擇 **Web Service**。
2. 連結剛剛建立的 GitHub 專案。
3. 設定參數：
   - **Name**: `feast-sync` (或自訂名稱)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
4. *(選填)* **環境變數 Environment Variables**：
   - `MASTER_PIN`: 自訂您的主控端密碼（未填預設為 `8888`）
5. 點擊 **Create Web Service**，等待 1~2 分鐘建立完成！
6. 取得您的專屬網址：例如 `https://feast-sync-xxxx.onrender.com`。

---

## 📱 現場活動使用方式

1. **投影機／大螢幕**：以筆電開啟 `master.html`，投影出即時展示或雙螢幕操作。
2. **賓客手機**：主控端點擊右上角 **「📱 賓客連線碼」**，將 QR Code 投射至大螢幕或列印於桌卡上，賓客掃碼即可立刻加入互動！
3. **主控管理**：
   - 上菜時切換至菜單頁。
   - 活動時切換至人氣菜色票選，按下「向賓客公開統計」讓大家看見票數滾動。
   - 抽獎時按下「啟動同步旋轉」，全場手機轉盤同步開獎，歡樂滿分！
