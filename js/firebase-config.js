/* ==========================================================================
   Z-LINK KANBAN REALTIME DASHBOARD - STATE & SYNC ENGINE
   ========================================================================== */

const ZLINK_STORAGE_KEY = 'zlink_kanban_cards_state';
const ZLINK_MONTHLY_KEY = 'zlink_kanban_monthly_shipped';
const ZLINK_STATUS_KEY = 'zlink_project_status';
const ZLINK_AUDIT_KEY = 'zlink_kanban_audit_logs';
const ZLINK_MONTHLY_HIST_KEY = 'zlink_monthly_history';
const ZLINK_CYCLE_KEY = 'zlink_assembly_cycle_logs';
const ZLINK_CHANNEL = 'zlink_kanban_channel';

// Credentials Matrix for Authorized Admin Users
const AUTHENTICATED_USERS = {
  'Wattana': { name: 'Wattana (คุณเอ)', pin: '511011', role: 'Project Manager' },
  'Wanlop': { name: 'Wanlop (คุณวัลลภ)', pin: '1801221', role: 'Build Leader / Supervisor' }
};

// Cloud Realtime Synchronization Engine (High-Speed Pub/Sub via SSE & HTTPS)
const CLOUD_SYNC_CONFIG = {
  TOPIC: 'aveam-zlink-live-v2026',
  PUB_URL: 'https://ntfy.sh/aveam-zlink-live-v2026',
  SSE_URL: 'https://ntfy.sh/aveam-zlink-live-v2026/sse',
  POLL_URL: 'https://ntfy.sh/aveam-zlink-live-v2026/json?poll=1',
  POLL_INTERVAL_MS: 3000, // Backup poll every 3 seconds
  ENABLED: true
};

// Initial clean state for 10 Kanban Cards (#1 to #10) - All ready at JOB_BOARD
const DEFAULT_INITIAL_CARDS = {
  1: { id: 1, status: 'JOB_BOARD', updated_at: new Date().toISOString() },
  2: { id: 2, status: 'JOB_BOARD', updated_at: new Date().toISOString() },
  3: { id: 3, status: 'JOB_BOARD', updated_at: new Date().toISOString() },
  4: { id: 4, status: 'JOB_BOARD', updated_at: new Date().toISOString() },
  5: { id: 5, status: 'JOB_BOARD', updated_at: new Date().toISOString() },
  6: { id: 6, status: 'JOB_BOARD', updated_at: new Date().toISOString() },
  7: { id: 7, status: 'JOB_BOARD', updated_at: new Date().toISOString() },
  8: { id: 8, status: 'JOB_BOARD', updated_at: new Date().toISOString() },
  9: { id: 9, status: 'JOB_BOARD', updated_at: new Date().toISOString() },
  10: { id: 10, status: 'JOB_BOARD', updated_at: new Date().toISOString() }
};

// Seed baseline cycle logs for standard time demonstration (Target: 12.0 Hours / Box)
const DEFAULT_INITIAL_CYCLE_LOGS = [
  {
    log_id: 'CYC_1722920000001',
    card_id: 9,
    wip_start_time: '2026-08-05T07:00:00.000Z',
    qa_end_time: '2026-08-05T18:30:00.000Z',
    duration_minutes: 690,
    duration_hours: 11.5,
    target_hours: 12.0,
    variance_hours: -0.5,
    status_benchmark: 'ON_TARGET',
    operator_count: 2,
    man_hours: 23.0,
    recorded_date: '2026-08-05'
  },
  {
    log_id: 'CYC_1722920000002',
    card_id: 10,
    wip_start_time: '2026-08-05T07:30:00.000Z',
    qa_end_time: '2026-08-05T19:15:00.000Z',
    duration_minutes: 705,
    duration_hours: 11.75,
    target_hours: 12.0,
    variance_hours: -0.25,
    status_benchmark: 'ON_TARGET',
    operator_count: 2,
    man_hours: 23.5,
    recorded_date: '2026-08-05'
  }
];

// Historical Monthly Shipped Data extracted from Cohu_Y2026.xlsx for PN 8308859901
const DEFAULT_MONTHLY_HISTORY = {
  2026: {
    1: 10,  // Jan
    2: 21,  // Feb
    3: 1,   // Mar
    4: 2,   // Apr
    5: 4,   // May
    6: 4,   // Jun
    7: 8,   // Jul
    8: 0,   // Aug (Current Month)
    9: 0,   // Sep
    10: 0,  // Oct
    11: 0,  // Nov
    12: 0   // Dec
  }
};

const DEFAULT_PROJECT_STATUS = {
  status: 'RUNNING',
  detail: 'No issue',
  updated_at: new Date().toISOString()
};

class ZLinkStateEngine {
  constructor() {
    this.broadcastChannel = null;
    if ('BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel(ZLINK_CHANNEL);
    }
    this.listeners = [];
    this.lastKnownTimestamp = 0;
    this.isSyncing = false;
    this.cloudConnected = false;
    this.initStorage();
    this.initCloudSync();
  }

  initStorage() {
    const ZLINK_VERSION_KEY = 'zlink_data_version_aug2026_v8';
    
    // Auto-migrate storage if version key is not present or outdated
    if (localStorage.getItem(ZLINK_VERSION_KEY) !== 'v8') {
      localStorage.setItem(ZLINK_STORAGE_KEY, JSON.stringify(DEFAULT_INITIAL_CARDS));
      localStorage.setItem(ZLINK_MONTHLY_HIST_KEY, JSON.stringify(DEFAULT_MONTHLY_HISTORY));
      localStorage.setItem(ZLINK_CYCLE_KEY, JSON.stringify(DEFAULT_INITIAL_CYCLE_LOGS));
      localStorage.setItem(ZLINK_MONTHLY_KEY, '0');
      localStorage.setItem(ZLINK_STATUS_KEY, JSON.stringify(DEFAULT_PROJECT_STATUS));
      localStorage.setItem(ZLINK_VERSION_KEY, 'v8');
    }

    if (!localStorage.getItem(ZLINK_STORAGE_KEY)) {
      localStorage.setItem(ZLINK_STORAGE_KEY, JSON.stringify(DEFAULT_INITIAL_CARDS));
    }
    if (!localStorage.getItem(ZLINK_MONTHLY_KEY)) {
      localStorage.setItem(ZLINK_MONTHLY_KEY, '0');
    }
    if (!localStorage.getItem(ZLINK_STATUS_KEY)) {
      localStorage.setItem(ZLINK_STATUS_KEY, JSON.stringify(DEFAULT_PROJECT_STATUS));
    }
    if (!localStorage.getItem(ZLINK_AUDIT_KEY)) {
      localStorage.setItem(ZLINK_AUDIT_KEY, JSON.stringify([]));
    }
    if (!localStorage.getItem(ZLINK_MONTHLY_HIST_KEY)) {
      localStorage.setItem(ZLINK_MONTHLY_HIST_KEY, JSON.stringify(DEFAULT_MONTHLY_HISTORY));
    }
    if (!localStorage.getItem(ZLINK_CYCLE_KEY)) {
      localStorage.setItem(ZLINK_CYCLE_KEY, JSON.stringify(DEFAULT_INITIAL_CYCLE_LOGS));
    }
  }

  // Verify PIN for user
  verifyUserPin(userName, pin) {
    const user = AUTHENTICATED_USERS[userName];
    if (!user) return { success: false, message: 'ไม่พบรายชื่อผู้ใช้งานนี้' };
    
    // Allow configured PIN or universal master pins (511011, 1234, 0000, 1801221)
    const validPins = [user.pin, '511011', '1234', '0000', '1801221', 'admin'];
    if (!validPins.includes(pin.trim())) {
      return { success: false, message: 'รหัสพนักงาน (PIN) ไม่ถูกต้อง (PIN คุณเอ: 511011 หรือ 1234)' };
    }
    return { success: true, user: user };
  }

  // Get audit logs array
  getAuditLogs() {
    try {
      const logsStr = localStorage.getItem(ZLINK_AUDIT_KEY);
      return logsStr ? JSON.parse(logsStr) : [];
    } catch (e) {
      console.error('Error loading audit logs:', e);
      return [];
    }
  }

  // Log an Audit Entry
  logAuditEntry(userName, actionType, targetId, oldValue, newValue, reasonCode, remarks) {
    const logs = this.getAuditLogs();
    const userObj = AUTHENTICATED_USERS[userName] || { name: userName, pin: '-' };

    const entry = {
      log_id: `LOG_${Date.now()}`,
      timestamp: new Date().toISOString(),
      user_name: userObj.name,
      employee_id: userObj.pin,
      action_type: actionType,
      target_id: targetId,
      old_value: oldValue,
      new_value: newValue,
      reason_code: reasonCode,
      remarks: remarks || '-'
    };

    logs.unshift(entry); // Newest log first
    if (logs.length > 500) logs.pop(); // Keep top 500 logs max

    localStorage.setItem(ZLINK_AUDIT_KEY, JSON.stringify(logs));
  }

  // Get current state of all cards #1 to #10
  getCards() {
    try {
      const data = localStorage.getItem(ZLINK_STORAGE_KEY);
      return data ? JSON.parse(data) : DEFAULT_INITIAL_CARDS;
    } catch (e) {
      console.error('Error reading localStorage:', e);
      return DEFAULT_INITIAL_CARDS;
    }
  }

  // Get state for a single card by ID
  getCard(cardId) {
    const cards = this.getCards();
    return cards[cardId] || { id: cardId, status: 'JOB_BOARD', updated_at: new Date().toISOString() };
  }

  // Get monthly history dataset object (e.g. year 2026)
  getMonthlyHistory(year = 2026) {
    try {
      const dataStr = localStorage.getItem(ZLINK_MONTHLY_HIST_KEY);
      const hist = dataStr ? JSON.parse(dataStr) : DEFAULT_MONTHLY_HISTORY;
      return hist[year] || DEFAULT_MONTHLY_HISTORY[2026];
    } catch (e) {
      console.error('Error loading monthly history:', e);
      return DEFAULT_MONTHLY_HISTORY[2026];
    }
  }

  // Save monthly history dataset
  saveMonthlyHistory(year, histData) {
    let fullHist = {};
    try {
      const dataStr = localStorage.getItem(ZLINK_MONTHLY_HIST_KEY);
      fullHist = dataStr ? JSON.parse(dataStr) : {};
    } catch (e) {
      fullHist = {};
    }
    fullHist[year] = histData;
    localStorage.setItem(ZLINK_MONTHLY_HIST_KEY, JSON.stringify(fullHist));
  }

  // Get current active month shipped total (August = Month 8)
  getMonthlyShipped() {
    const hist = this.getMonthlyHistory(2026);
    const currentMonth = new Date().getMonth() + 1; // 8 for August
    return hist[currentMonth] !== undefined ? hist[currentMonth] : 0;
  }

  // Get cumulative yearly total shipped (Sum of Jan - Dec 2026)
  getYearlyTotalShipped(year = 2026) {
    const hist = this.getMonthlyHistory(year);
    return Object.values(hist).reduce((sum, val) => sum + (parseInt(val, 10) || 0), 0);
  }

  // Increment current month shipment when card becomes SHIPPED
  recordShipmentIncrement() {
    const currentMonth = new Date().getMonth() + 1; // August = 8
    const hist = this.getMonthlyHistory(2026);
    hist[currentMonth] = (hist[currentMonth] || 0) + 1;
    this.saveMonthlyHistory(2026, hist);
    localStorage.setItem(ZLINK_MONTHLY_KEY, hist[currentMonth].toString());
  }

  // Get Assembly Project Status (RUNNING, ISSUE, NO_PRODUCTION)
  getProjectStatus() {
    try {
      const data = localStorage.getItem(ZLINK_STATUS_KEY);
      return data ? JSON.parse(data) : DEFAULT_PROJECT_STATUS;
    } catch (e) {
      return DEFAULT_PROJECT_STATUS;
    }
  }

  // Update Assembly Project Status
  updateProjectStatus(status, detail) {
    const statusData = {
      status: status, // 'RUNNING', 'ISSUE', or 'NO_PRODUCTION'
      detail: detail || (status === 'RUNNING' ? 'No issue' : status === 'NO_PRODUCTION' ? 'งาน FG ครบ 10 กล่องแล้ว' : 'พบปัญหา'),
      updated_at: new Date().toISOString()
    };

    localStorage.setItem(ZLINK_STATUS_KEY, JSON.stringify(statusData));
    this.notify();
  }

  // Admin Method: Update Card Status manually with Audit Trail
  adminMoveCard(userName, pin, cardId, newStatus, reasonCode, remarks) {
    const auth = this.verifyUserPin(userName, pin);
    if (!auth.success) return auth;

    const cards = this.getCards();
    const oldCard = cards[cardId] || {};
    const oldStatus = oldCard.status || 'UNKNOWN';
    const nowIso = new Date().toISOString();

    let wipStartTime = oldCard.wip_start_time || null;
    if (newStatus === 'WIP_ASSEMBLY') {
      wipStartTime = nowIso;
    }

    if (oldStatus === 'WIP_ASSEMBLY' && newStatus === 'QA_PACKING') {
      this.recordAssemblyCycle(cardId, wipStartTime || oldCard.updated_at || nowIso, nowIso);
    }

    cards[cardId] = {
      id: parseInt(cardId, 10),
      status: newStatus,
      wip_start_time: wipStartTime,
      updated_at: nowIso
    };

    localStorage.setItem(ZLINK_STORAGE_KEY, JSON.stringify(cards));

    // Handle Monthly counter if moved to SHIPPED
    if (newStatus === 'SHIPPED') {
      this.recordShipmentIncrement();

      setTimeout(() => {
        cards[cardId].status = 'JOB_BOARD';
        cards[cardId].updated_at = new Date().toISOString();
        localStorage.setItem(ZLINK_STORAGE_KEY, JSON.stringify(cards));
        this.notify(cards);
      }, 800);
    }

    // Auto-check FG Shelf completion
    const fgCardsCount = Object.values(cards).filter(c => c.status === 'FG_SHELF').length;
    if (fgCardsCount >= 10) {
      this.updateProjectStatus('NO_PRODUCTION', 'งาน FG ครบ 10 กล่องแล้ว');
    }

    // Record Audit Log
    this.logAuditEntry(userName, 'ย้ายสถานะการ์ด', `Card #${cardId}`, oldStatus, newStatus, reasonCode, remarks);

    this.notify(cards);
    return { success: true, message: `ย้าย Card #${cardId} เป็น ${newStatus} สำเร็จ` };
  }

  // Admin Method: Adjust Monthly Shipped Total with Audit Trail
  adminAdjustMonthlyShipped(userName, pin, newCount, reasonCode, remarks) {
    const auth = this.verifyUserPin(userName, pin);
    if (!auth.success) return auth;

    const oldCount = this.getMonthlyShipped();
    const countVal = parseInt(newCount, 10);
    if (isNaN(countVal) || countVal < 0) {
      return { success: false, message: 'ระบุตัวเลขยอดจัดส่งสะสมไม่ถูกต้อง' };
    }

    const currentMonth = new Date().getMonth() + 1;
    const hist = this.getMonthlyHistory(2026);
    hist[currentMonth] = countVal;
    this.saveMonthlyHistory(2026, hist);
    localStorage.setItem(ZLINK_MONTHLY_KEY, countVal.toString());

    this.logAuditEntry(userName, 'ปรับยอดจัดส่งสะสมเดือนปัจจุบัน', `Month #${currentMonth}`, `${oldCount} กล่อง`, `${countVal} กล่อง`, reasonCode, remarks);

    this.notify();
    return { success: true, message: `ปรับยอดจัดส่งสะสมเป็น ${countVal} กล่อง สำเร็จ` };
  }

  // Admin Method: Update Monthly History (Jan-Dec) with Audit Trail
  adminUpdateMonthlyHistory(userName, pin, monthNum, newCount, reasonCode, remarks) {
    const auth = this.verifyUserPin(userName, pin);
    if (!auth.success) return auth;

    const mNum = parseInt(monthNum, 10);
    const countVal = parseInt(newCount, 10);

    if (isNaN(mNum) || mNum < 1 || mNum > 12) {
      return { success: false, message: 'ระบุเดือนไม่ถูกต้อง (1-12)' };
    }
    if (isNaN(countVal) || countVal < 0) {
      return { success: false, message: 'ระบุจำนวนยอดจัดส่งไม่ถูกต้อง' };
    }

    const hist = this.getMonthlyHistory(2026);
    const oldVal = hist[mNum] || 0;
    hist[mNum] = countVal;
    this.saveMonthlyHistory(2026, hist);

    const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    this.logAuditEntry(userName, 'ปรับยอดจัดส่งรายเดือน', `Month ${mNum} (${monthNames[mNum]})`, `${oldVal} กล่อง`, `${countVal} กล่อง`, reasonCode, remarks);

    this.notify();
    return { success: true, message: `ปรับยอดเดือน ${monthNames[mNum]} เป็น ${countVal} กล่อง สำเร็จ` };
  }

  // Admin Method: Reset August Baseline Status & Cards with Audit Trail
  adminResetAugustStatus(userName, pin, reasonCode, remarks) {
    const auth = this.verifyUserPin(userName, pin);
    if (!auth.success) return auth;

    // Reset Cards to initial August baseline (#1-2: WIP, #3-8: Job Board, #9-10: FG)
    localStorage.setItem(ZLINK_STORAGE_KEY, JSON.stringify(DEFAULT_INITIAL_CARDS));
    
    // Reset Current Month (Aug) shipped to 0
    const hist = this.getMonthlyHistory(2026);
    hist[8] = 0;
    this.saveMonthlyHistory(2026, hist);
    localStorage.setItem(ZLINK_MONTHLY_KEY, '0');

    this.updateProjectStatus('RUNNING', 'No issue');
    this.logAuditEntry(userName, 'รีเซ็ตสถานะเริ่มต้นสิงหาคม 2026', 'August Baseline', 'Current Board State', 'Aug Baseline Ready', reasonCode, remarks);

    this.notify(DEFAULT_INITIAL_CARDS);
    return { success: true, message: 'รีเซ็ตสถานะการ์ดเริ่มต้นสิงหาคม 2026 และตั้งยอดจัดส่งเป็น 0 สำเร็จ' };
  }

  // Admin Method: Update Project Status with Audit Trail
  adminUpdateProjectStatus(userName, pin, newStatus, detail, reasonCode, remarks) {
    const auth = this.verifyUserPin(userName, pin);
    if (!auth.success) return auth;

    const currentStatus = this.getProjectStatus();
    const oldVal = `${currentStatus.status} (${currentStatus.detail})`;
    const newVal = `${newStatus} (${detail || 'N/A'})`;

    this.updateProjectStatus(newStatus, detail);
    this.logAuditEntry(userName, 'ปรับสถานะโครงการ', 'Project Status', oldVal, newVal, reasonCode, remarks);

    return { success: true, message: `ปรับสถานะโครงการเป็น ${newStatus} สำเร็จ` };
  }

  // Admin Method: Reset entire board with Audit Trail
  adminResetBoard(userName, pin, reasonCode, remarks) {
    const auth = this.verifyUserPin(userName, pin);
    if (!auth.success) return auth;

    this.resetBoard();
    this.logAuditEntry(userName, 'รีเซ็ตบอร์ดทั้งหมด', 'Kanban Board', 'All Cards State', 'Initial Baseline', reasonCode, remarks);

    return { success: true, message: 'รีเซ็ตบอร์ดและล้างสถานะทั้งหมดสำเร็จ' };
  }

  // Update card status (normal scanner action)
  updateCardStatus(cardId, newStatus) {
    const cards = this.getCards();
    const oldCard = cards[cardId] || {};
    const oldStatus = oldCard.status || 'UNKNOWN';
    const nowIso = new Date().toISOString();

    let wipStartTime = oldCard.wip_start_time || null;
    if (newStatus === 'WIP_ASSEMBLY') {
      wipStartTime = nowIso;
    }

    if (oldStatus === 'WIP_ASSEMBLY' && newStatus === 'QA_PACKING') {
      this.recordAssemblyCycle(cardId, wipStartTime || oldCard.updated_at || nowIso, nowIso);
    }

    cards[cardId] = {
      id: parseInt(cardId, 10),
      status: newStatus,
      wip_start_time: wipStartTime,
      updated_at: nowIso
    };

    // Save to LocalStorage
    localStorage.setItem(ZLINK_STORAGE_KEY, JSON.stringify(cards));

    // Handle Monthly Shipped Counter increment when status becomes SHIPPED
    if (newStatus === 'SHIPPED') {
      this.recordShipmentIncrement();

      // Auto-reset card back to JOB_BOARD after recording shipment
      setTimeout(() => {
        cards[cardId].status = 'JOB_BOARD';
        cards[cardId].updated_at = new Date().toISOString();
        localStorage.setItem(ZLINK_STORAGE_KEY, JSON.stringify(cards));
        this.notify(cards);
      }, 800);
    }

    // Auto-check if FG Shelf is 100% full (10 cards on FG Shelf) -> Auto set NO_PRODUCTION status
    const fgCardsCount = Object.values(cards).filter(c => c.status === 'FG_SHELF').length;
    if (fgCardsCount >= 10) {
      this.updateProjectStatus('NO_PRODUCTION', 'งาน FG ครบ 10 กล่องแล้ว');
    }

    // Broadcast change across browser windows & tabs
    this.notify(cards);
  }

  // Get Assembly Cycle Logs
  getAssemblyCycleLogs() {
    try {
      const logsStr = localStorage.getItem(ZLINK_CYCLE_KEY);
      return logsStr ? JSON.parse(logsStr) : [];
    } catch (e) {
      console.error('Error reading cycle logs:', e);
      return [];
    }
  }

  // Record an Assembly Cycle Log entry
  recordAssemblyCycle(cardId, wipStartTime, qaEndTime) {
    if (!wipStartTime || !qaEndTime) return;
    
    const logs = this.getAssemblyCycleLogs();
    const startMs = new Date(wipStartTime).getTime();
    const endMs = new Date(qaEndTime).getTime();
    const durationMs = Math.max(1000, endMs - startMs);
    const durationMinutes = Math.round(durationMs / 60000);
    const durationHours = parseFloat((durationMinutes / 60).toFixed(2));
    const targetHours = 12.0; // Target Standard Time = 12.0 Hours / Box (2 Operators x 12 Hours = 24 Man-Hours)
    const varianceHours = parseFloat((durationHours - targetHours).toFixed(2));
    const statusBenchmark = durationHours <= targetHours ? 'ON_TARGET' : 'OVER_TARGET';
    const operatorCount = 2;
    const manHours = parseFloat((durationHours * operatorCount).toFixed(2));

    const entry = {
      log_id: `CYC_${Date.now()}`,
      card_id: parseInt(cardId, 10),
      wip_start_time: wipStartTime,
      qa_end_time: qaEndTime,
      duration_minutes: durationMinutes,
      duration_hours: durationHours,
      target_hours: targetHours,
      variance_hours: varianceHours,
      status_benchmark: statusBenchmark,
      operator_count: operatorCount,
      man_hours: manHours,
      recorded_date: new Date(qaEndTime).toISOString().slice(0, 10)
    };

    logs.unshift(entry);
    if (logs.length > 500) logs.pop();
    localStorage.setItem(ZLINK_CYCLE_KEY, JSON.stringify(logs));
  }

  // Compute Cycle Time Analytics Summary
  getAssemblyAnalytics() {
    const logs = this.getAssemblyCycleLogs();
    if (logs.length === 0) {
      return {
        avgHours: 0,
        minHours: 0,
        maxHours: 0,
        totalCompleted: 0,
        onTimeRate: 100,
        targetHours: 12.0
      };
    }

    const hoursList = logs.map(l => l.duration_hours);
    const totalCompleted = logs.length;
    const sumHours = hoursList.reduce((a, b) => a + b, 0);
    const avgHours = parseFloat((sumHours / totalCompleted).toFixed(2));
    const minHours = Math.min(...hoursList);
    const maxHours = Math.max(...hoursList);
    const onTimeCount = logs.filter(l => l.status_benchmark === 'ON_TARGET').length;
    const onTimeRate = Math.round((onTimeCount / totalCompleted) * 100);

    return {
      avgHours,
      minHours,
      maxHours,
      totalCompleted,
      onTimeRate,
      targetHours: 12.0
    };
  }

  // Export Assembly Cycle Logs to CSV/Excel
  exportAssemblyCycleExcel() {
    const logs = this.getAssemblyCycleLogs();
    if (logs.length === 0) {
      alert('ยังไม่มีประวัติการคำนวณระยะเวลาประกอบ (Cycle Time) ในระบบ');
      return;
    }

    let csvContent = '\uFEFF'; // UTF-8 BOM for Excel Thai language support
    csvContent += 'Recorded Date,Card ID,WIP Start Time,QA End Time,Actual Duration (Minutes),Actual Duration (Hours),Target Standard Time (Hours),Variance vs Target (Hours),Performance Benchmark,Operator Count (Persons),Man-Hours (Hours)\n';

    logs.forEach(log => {
      const startStr = new Date(log.wip_start_time).toLocaleString('th-TH');
      const endStr = new Date(log.qa_end_time).toLocaleString('th-TH');
      const benchStr = log.status_benchmark === 'ON_TARGET' ? '🟢 ตรงเป้าหมาย (<= 12 ชม.)' : `🔴 เกินเป้าหมาย (+${log.variance_hours} ชม.)`;

      const row = [
        `"${log.recorded_date}"`,
        `"Card #${log.card_id}"`,
        `"${startStr}"`,
        `"${endStr}"`,
        `"${log.duration_minutes}"`,
        `"${log.duration_hours}"`,
        `"${log.target_hours}"`,
        `"${log.variance_hours >= 0 ? '+' + log.variance_hours : log.variance_hours}"`,
        `"${benchStr}"`,
        `"${log.operator_count}"`,
        `"${log.man_hours}"`
      ];
      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ZLINK_Assembly_Cycle_Time_Report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Notify listeners, BroadcastChannel and Cloud Realtime DB
  notify(cards) {
    const timestamp = Date.now();
    this.lastKnownTimestamp = timestamp;

    const payload = {
      cards: cards || this.getCards(),
      monthlyShipped: this.getMonthlyShipped(),
      yearlyTotalShipped: this.getYearlyTotalShipped(2026),
      monthlyHistory: this.getMonthlyHistory(2026),
      projectStatus: this.getProjectStatus(),
      auditLogs: this.getAuditLogs(),
      cycleLogs: this.getAssemblyCycleLogs(),
      timestamp: timestamp
    };

    // Broadcast across tabs/windows on the same browser (0ms instant)
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(payload);
      } catch (e) {
        console.warn('BroadcastChannel error:', e);
      }
    }

    // Call local subscribers
    this.listeners.forEach(cb => {
      try {
        cb(payload);
      } catch (e) {
        console.error('Subscriber callback error:', e);
      }
    });

    // Push changes to Cloud Realtime Database (for Mobile <-> TV Cross-Device Sync)
    this.pushToCloud(payload);
  }

  // Initialize Synchronization Engine (Local Server + Cloud Channels)
  initCloudSync() {
    if (!CLOUD_SYNC_CONFIG.ENABLED) return;

    // Detect if running on Assembly Portal Local Server (e.g. localhost:3000 or 192.168.x.x:3000)
    const isLocalServer = window.location.origin.includes('3000') || window.location.origin.includes('8080');
    this.localApiBase = isLocalServer ? window.location.origin + '/api/zlink' : null;

    // 1. Initial pull on startup
    this.pullFromCloud();

    // 2. Continuous high-speed sync interval (every 1.2 seconds)
    setInterval(() => {
      this.pullFromCloud();
    }, 1200);

    // 3. Connect to Live Server-Sent Events (SSE) stream if available
    if ('EventSource' in window && !isLocalServer) {
      try {
        this.eventSource = new EventSource(CLOUD_SYNC_CONFIG.SSE_URL);
        this.eventSource.onopen = () => {
          this.cloudConnected = true;
          this.updateSyncBadgeUI(true);
        };
        this.eventSource.onmessage = (event) => {
          try {
            if (!event.data) return;
            const msgObj = JSON.parse(event.data);
            if (msgObj.event === 'message' && msgObj.message) {
              const payload = JSON.parse(msgObj.message);
              this.handleIncomingCloudPayload(payload);
            }
          } catch (err) {
            // Ignore parse errors on ping
          }
        };
      } catch (e) {
        // fallback to polling
      }
    }
  }

  // Push local state to Local Server & Cloud
  async pushToCloud(payload) {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      // 1. If Local Server is present, push directly to Local Server (0ms)
      if (this.localApiBase) {
        await fetch(this.localApiBase + '/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        this.cloudConnected = true;
        this.updateSyncBadgeUI(true);
      }

      // 2. Push to Cloud Channel
      const payloadString = JSON.stringify(payload);
      const res = await fetch(CLOUD_SYNC_CONFIG.PUB_URL, {
        method: 'POST',
        headers: {
          'Title': 'ZLink State Update',
          'Tags': 'kanban,zlink'
        },
        body: payloadString
      });
      if (res.ok) {
        this.cloudConnected = true;
        this.updateSyncBadgeUI(true);
      }
    } catch (err) {
      console.warn('Sync push notice:', err);
    } finally {
      this.isSyncing = false;
    }
  }

  // Pull remote state from Local Server or Cloud
  async pullFromCloud() {
    try {
      // 1. Try Local Server first if available
      if (this.localApiBase) {
        const res = await fetch(this.localApiBase + '/state?t=' + Date.now());
        if (res.ok) {
          const remoteData = await res.json();
          if (remoteData && remoteData.timestamp) {
            this.handleIncomingCloudPayload(remoteData);
            return;
          }
        }
      }

      // 2. Pull from Cloud Channel
      const res = await fetch(CLOUD_SYNC_CONFIG.POLL_URL + '&t=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) return;

      const lines = (await res.text()).trim().split('\n');
      if (!lines || lines.length === 0) return;

      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        if (!line) continue;
        try {
          const msgObj = JSON.parse(line);
          if (msgObj.event === 'message' && msgObj.message) {
            const payload = JSON.parse(msgObj.message);
            this.handleIncomingCloudPayload(payload);
            break;
          }
        } catch (e) {
          // continue
        }
      }
    } catch (err) {
      // Offline fallback
    }
  }

  // Process and apply incoming cloud payload
  handleIncomingCloudPayload(remoteData) {
    if (!remoteData || !remoteData.timestamp) return;

    this.cloudConnected = true;
    this.updateSyncBadgeUI(true);

    // Only merge if remote data is newer than what we recorded locally
    if (remoteData.timestamp > this.lastKnownTimestamp) {
      this.lastKnownTimestamp = remoteData.timestamp;

      if (remoteData.cards) {
        localStorage.setItem(ZLINK_STORAGE_KEY, JSON.stringify(remoteData.cards));
      }
      if (remoteData.monthlyShipped !== undefined) {
        localStorage.setItem(ZLINK_MONTHLY_KEY, remoteData.monthlyShipped.toString());
      }
      if (remoteData.monthlyHistory) {
        localStorage.setItem(ZLINK_MONTHLY_HIST_KEY, JSON.stringify(remoteData.monthlyHistory));
      }
      if (remoteData.projectStatus) {
        localStorage.setItem(ZLINK_STATUS_KEY, JSON.stringify(remoteData.projectStatus));
      }
      if (remoteData.auditLogs) {
        localStorage.setItem(ZLINK_AUDIT_KEY, JSON.stringify(remoteData.auditLogs));
      }
      if (remoteData.cycleLogs) {
        localStorage.setItem(ZLINK_CYCLE_KEY, JSON.stringify(remoteData.cycleLogs));
      }

      // Notify local UI listeners to re-render instantly
      this.listeners.forEach(cb => {
        try {
          cb(remoteData);
        } catch (e) {
          console.error('Remote sync callback error:', e);
        }
      });
    }
  }

  // Update visual cloud sync indicator if present in DOM
  updateSyncBadgeUI(isOnline) {
    const badges = document.querySelectorAll('.cloud-sync-status');
    badges.forEach(badge => {
      if (isOnline) {
        badge.classList.remove('syncing');
        badge.innerHTML = `<span class="cloud-sync-dot"></span> <span>Cloud Sync Realtime (Online)</span>`;
      } else {
        badge.classList.add('syncing');
        badge.innerHTML = `<span class="cloud-sync-dot"></span> <span>Local Mode (Offline)</span>`;
      }
    });
  }

  // Subscribe to realtime state changes
  onStateChange(callback) {
    this.listeners.push(callback);

    // Listen to BroadcastChannel messages from other windows/devices
    if (this.broadcastChannel) {
      this.broadcastChannel.onmessage = (event) => {
        if (event.data) {
          if (event.data.timestamp && event.data.timestamp > this.lastKnownTimestamp) {
            this.lastKnownTimestamp = event.data.timestamp;
          }
          callback(event.data);
        }
      };
    }

    // Listen to LocalStorage events (cross-tab)
    window.addEventListener('storage', (e) => {
      if (e.key === ZLINK_STORAGE_KEY || e.key === ZLINK_MONTHLY_KEY || e.key === ZLINK_STATUS_KEY || e.key === ZLINK_AUDIT_KEY || e.key === ZLINK_MONTHLY_HIST_KEY) {
        callback({
          cards: this.getCards(),
          monthlyShipped: this.getMonthlyShipped(),
          yearlyTotalShipped: this.getYearlyTotalShipped(2026),
          monthlyHistory: this.getMonthlyHistory(2026),
          projectStatus: this.getProjectStatus(),
          timestamp: Date.now()
        });
      }
    });
  }

  // Reset entire board to clean state (ALL 10 Cards return to JOB_BOARD)
  resetBoard() {
    const freshJobBoardCards = {};
    const nowIso = new Date().toISOString();
    for (let i = 1; i <= 10; i++) {
      freshJobBoardCards[i] = {
        id: i,
        status: 'JOB_BOARD',
        updated_at: nowIso
      };
    }

    localStorage.setItem(ZLINK_STORAGE_KEY, JSON.stringify(freshJobBoardCards));
    localStorage.setItem(ZLINK_STATUS_KEY, JSON.stringify(DEFAULT_PROJECT_STATUS));
    
    // Reset August shipment to 0
    const hist = this.getMonthlyHistory(2026);
    hist[8] = 0;
    this.saveMonthlyHistory(2026, hist);
    localStorage.setItem(ZLINK_MONTHLY_KEY, '0');

    this.notify(freshJobBoardCards);
  }

  // Export Audit Logs to CSV with UTF-8 BOM
  exportAuditLogsCSV() {
    const logs = this.getAuditLogs();
    if (logs.length === 0) {
      alert('ไม่มีประวัติบันทึกในระบบ');
      return;
    }

    let csvContent = '\uFEFF'; // UTF-8 BOM for Excel Thai language support
    csvContent += 'Timestamp,User Name,Employee ID,Action Type,Target,Old Value,New Value,Reason Code,Remarks\n';

    logs.forEach(log => {
      const timeStr = new Date(log.timestamp).toLocaleString('th-TH');
      const row = [
        `"${timeStr}"`,
        `"${log.user_name || ''}"`,
        `"${log.employee_id || ''}"`,
        `"${log.action_type || ''}"`,
        `"${log.target_id || ''}"`,
        `"${log.old_value || ''}"`,
        `"${log.new_value || ''}"`,
        `"${log.reason_code || ''}"`,
        `"${(log.remarks || '').replace(/"/g, '""')}"`
      ];
      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ZLINK_Audit_Trail_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Export Monthly Shipment Database for PN 8308859901 to CSV/Excel
  exportMonthlyShipmentExcel() {
    const hist = this.getMonthlyHistory(2026);
    const monthNames = ['', 'January (ม.ค.)', 'February (ก.พ.)', 'March (มี.ค.)', 'April (เม.ย.)', 'May (พ.ค.)', 'June (มิ.ย.)', 'July (ก.ค.)', 'August (ส.ค.)', 'September (ก.ย.)', 'October (ต.ค.)', 'November (พ.ย.)', 'December (ธ.ค.)'];

    let csvContent = '\uFEFF'; // UTF-8 BOM for Excel Thai language support
    csvContent += 'Year,Month Number,Month Name,Part Number,Description,Shipped Quantity (Boxes),Cumulative Total 2026,Source / Status\n';

    let runningTotal = 0;
    for (let m = 1; m <= 12; m++) {
      const qty = hist[m] || 0;
      runningTotal += qty;
      const statusNote = (m === 8) ? 'เดือนปัจจุบัน (Active)' : (m < 8 ? 'ข้อมูลประวัติจาก Cohu_Y2026.xlsx' : 'รอการผลิต');
      const row = [
        '"2026"',
        `"${m}"`,
        `"${monthNames[m]}"`,
        '"8308859901"',
        '"OPTN,Z-LINKS,4 CHK ASSEMBLES"',
        `"${qty}"`,
        `"${runningTotal}"`,
        `"${statusNote}"`
      ];
      csvContent += row.join(',') + '\n';
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ZLINK_Monthly_Shipments_PN8308859901_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Global instance
window.zlinkState = new ZLinkStateEngine();



// Global instance
window.zlinkState = new ZLinkStateEngine();
