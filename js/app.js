/* ==========================================================================
   Z-LINK KANBAN REALTIME DASHBOARD - MAIN APP CONTROLLER (index.html)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initClock();
  renderDashboard();
  initAdminModal();

  // Listen to realtime updates from State Engine
  if (window.zlinkState) {
    window.zlinkState.onStateChange(() => {
      renderDashboard();
      if (isAdminModalOpen()) {
        renderAuditLogTable();
      }
    });
  }
});

// Live Clock Update
function initClock() {
  const timeElem = document.getElementById('liveTime');
  const dateElem = document.getElementById('liveDate');

  function update() {
    const now = new Date();
    if (timeElem) {
      timeElem.textContent = now.toLocaleTimeString('th-TH', { hour12: false });
    }
    if (dateElem) {
      dateElem.textContent = now.toLocaleDateString('th-TH', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  }
  update();
  setInterval(update, 1000);
}

// Render Dashboard Columns & KPI Header
function renderDashboard() {
  const cardsObj = window.zlinkState.getCards();
  const monthlyShipped = window.zlinkState.getMonthlyShipped();
  const yearlyTotalShipped = window.zlinkState.getYearlyTotalShipped(2026);
  const cardsList = Object.values(cardsObj);

  // Categorize cards by status (Job Board is sorted FIFO by updated_at ascending so newly returned cards go to the end)
  const jobBoardCards = cardsList
    .filter(c => c.status === 'JOB_BOARD')
    .sort((a, b) => {
      const timeA = new Date(a.updated_at).getTime();
      const timeB = new Date(b.updated_at).getTime();
      if (timeA !== timeB) {
        return timeA - timeB;
      }
      return a.id - b.id;
    });
  const wipCards = cardsList.filter(c => c.status === 'WIP_ASSEMBLY');
  const qaCards = cardsList.filter(c => c.status === 'QA_PACKING');
  const fgCards = cardsList.filter(c => c.status === 'FG_SHELF');
  const shippedCards = cardsList.filter(c => c.status === 'SHIPPED');

  // Update KPI Header Values
  updateKPI('kpiFGCount', `${fgCards.length} / 10`);
  updateKPI('kpiWIPCount', `${wipCards.length} / 2`);
  updateKPI('kpiShippedCount', `${monthlyShipped} กล่อง`);
  updateKPI('kpiYearlyShippedCount', `${yearlyTotalShipped} กล่อง`);
  updateKPI('operatorCount', '2');

  // Update Assembly Project Status (RUNNING, ISSUE, NO_PRODUCTION)
  const projStatus = window.zlinkState.getProjectStatus();
  updateProjectStatusUI(projStatus);

  // Update Column Badges
  updateBadge('badgeJobBoard', jobBoardCards.length);
  updateBadge('badgeWIP', `${wipCards.length}/2`);
  updateBadge('badgeQA', qaCards.length);
  updateBadge('badgeFG', `${fgCards.length}/10`);
  updateBadge('badgeShipped', monthlyShipped);

  // Render Columns
  renderCardContainer('colJobBoard', jobBoardCards, 'No jobs pending');
  renderCardContainer('colWIP', wipCards, 'No active WIP assembly');
  renderCardContainer('colQA', qaCards, 'No jobs in QA inspection');
  renderFGShelfGrid('colFGShelf', fgCards);
  renderShippedFeed('colShipped', shippedCards, monthlyShipped);

  // Render Dynamic Shipment Chart
  renderShipmentChart();
}

// Render Dynamic SVG Shipment Trend Chart for 2026
function renderShipmentChart() {
  const container = document.getElementById('shipmentChartContainer');
  if (!container || !window.zlinkState) return;

  const monthlyData = window.zlinkState.getMonthlyHistory(2026);
  const monthKeys = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonthNum = new Date().getMonth() + 1; // 8 for August

  // Calculate dynamic max height scale (minimum 10)
  const maxVal = Math.max(...Object.values(monthlyData), 10);
  const scaleMax = Math.ceil(maxVal / 5) * 5 || 25;

  // Update Y-Axis Labels
  const yAxisElem = document.getElementById('shipmentYAxis');
  if (yAxisElem) {
    yAxisElem.innerHTML = `
      <span>${scaleMax}</span>
      <span>${Math.round(scaleMax / 2)}</span>
      <span>0</span>
    `;
  }

  // Calculate points for 12 months (x: 18 to 482 across 500 width)
  // x spacing: (482 - 18) / 11 = 42.1818
  const points = monthKeys.map((m, idx) => {
    const qty = monthlyData[m] || 0;
    const x = 18 + idx * 42.1818;
    const y = 58 - (qty / scaleMax) * 48; // top margin 10, bottom margin 58
    return { x, y: Math.max(10, Math.min(58, y)), qty, monthNum: m, label: monthLabels[idx] };
  });

  // Filter active points up to current month (Jan - Aug) for trend line
  const activePoints = points.filter(p => p.monthNum <= currentMonthNum);

  // Construct SVG Line Path ONLY for active months (Jan - Aug)
  const pathD = activePoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  // Construct Area Gradient Path ONLY for active months
  let areaD = '';
  if (activePoints.length > 0) {
    const firstPt = activePoints[0];
    const lastPt = activePoints[activePoints.length - 1];
    areaD = `${pathD} L ${lastPt.x.toFixed(1)} 58 L ${firstPt.x.toFixed(1)} 58 Z`;
  }

  // Construct SVG Data Circles & Text Labels INSIDE SVG for 100% exact alignment
  let circlesHTML = '';
  let labelsHTML = '';

  points.forEach(p => {
    const isCurrent = (p.monthNum === currentMonthNum);
    const isFuture = (p.monthNum > currentMonthNum);

    if (!isFuture) {
      const strokeColor = isCurrent ? '#fbbf24' : '#34d399';
      const fillColor = isCurrent ? '#fbbf24' : '#34d399';
      const radius = isCurrent ? 5.5 : 4;

      circlesHTML += `
        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${radius}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${isCurrent ? 2.5 : 0}" />
        ${isCurrent ? `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="9" fill="none" stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="2,2" />` : ''}
      `;
    }

    const textColor = isCurrent ? '#fbbf24' : (isFuture ? '#475569' : '#94a3b8');
    const fontWeight = isCurrent ? '800' : '600';

    labelsHTML += `
      <text x="${p.x.toFixed(1)}" y="78" text-anchor="middle" fill="${textColor}" font-size="11.5" font-weight="${fontWeight}" font-family="Outfit, Prompt, sans-serif">${p.label}</text>
    `;
  });

  const svgHTML = `
    <svg viewBox="0 0 500 85" preserveAspectRatio="none" class="shipment-svg-chart" style="width: 100%; height: 85px; overflow: visible;">
      <defs>
        <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#34d399" stop-opacity="0.35" />
          <stop offset="100%" stop-color="#34d399" stop-opacity="0.0" />
        </linearGradient>
      </defs>
      <line x1="0" y1="10" x2="500" y2="10" stroke="rgba(255,255,255,0.08)" stroke-dasharray="3,3" />
      <line x1="0" y1="34" x2="500" y2="34" stroke="rgba(255,255,255,0.08)" stroke-dasharray="3,3" />
      <line x1="0" y1="58" x2="500" y2="58" stroke="rgba(255,255,255,0.08)" stroke-dasharray="3,3" />
      ${areaD ? `<path d="${areaD}" fill="url(#trendGradient)" />` : ''}
      ${pathD ? `<path d="${pathD}" fill="none" stroke="#34d399" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />` : ''}
      ${circlesHTML}
      ${labelsHTML}
    </svg>
  `;

  container.innerHTML = svgHTML;
}

// Render Project Status Card (RUNNING = Cyan, ISSUE = Red, NO_PRODUCTION = Green)
function updateProjectStatusUI(projStatus) {
  const statusTextElem = document.getElementById('projectStatusText');
  const statusDetailElem = document.getElementById('projectStatusDetail');
  const cardElem = document.getElementById('projectStatusCard');

  if (!statusTextElem || !statusDetailElem) return;

  const status = projStatus ? projStatus.status : 'RUNNING';
  const detail = projStatus ? projStatus.detail : 'No issue';

  statusTextElem.textContent = status === 'NO_PRODUCTION' ? 'NO PRODUCTION' : status;
  statusDetailElem.textContent = detail;

  if (status === 'RUNNING') {
    statusTextElem.style.color = '#38bdf8'; // Cyan / Blue font
    if (cardElem) cardElem.style.borderColor = 'rgba(56, 189, 248, 0.4)';
  } else if (status === 'ISSUE') {
    statusTextElem.style.color = '#f43f5e'; // Red font
    if (cardElem) cardElem.style.borderColor = 'rgba(244, 63, 94, 0.5)';
  } else if (status === 'NO_PRODUCTION') {
    statusTextElem.style.color = '#34d399'; // Green font
    if (cardElem) cardElem.style.borderColor = 'rgba(52, 211, 153, 0.4)';
  }
}

function updateKPI(id, val) {
  const elem = document.getElementById(id);
  if (elem) elem.textContent = val;
}

function updateBadge(id, count) {
  const elem = document.getElementById(id);
  if (elem) elem.textContent = count;
}

// Generic Card Container Renderer
function renderCardContainer(containerId, cards, emptyMessage) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (cards.length === 0) {
    container.className = 'cards-container';
    container.innerHTML = `<div class="empty-column-msg">${emptyMessage}</div>`;
    return;
  }

  const isJobBoard = (containerId === 'colJobBoard');
  if (isJobBoard) {
    container.className = 'cards-container cards-grid-2col';
    container.innerHTML = cards.map(card => createCardHTML(card, true)).join('');
  } else {
    container.className = 'cards-container';
    container.innerHTML = cards.map(card => createCardHTML(card, false)).join('');
  }
}

// Generate Kanban Card HTML
function createCardHTML(card, isCompact = false) {
  const statusClasses = {
    JOB_BOARD: 'card-job-board',
    WIP_ASSEMBLY: 'card-wip',
    QA_PACKING: 'card-qa',
    FG_SHELF: 'card-fg',
    SHIPPED: 'card-shipped'
  };

  const statusLabels = {
    JOB_BOARD: 'รอประกอบ',
    WIP_ASSEMBLY: 'กำลังประกอบ (WIP)',
    QA_PACKING: 'รอตรวจ QA / แพ็ก',
    FG_SHELF: 'พร้อมส่งบนชั้น FG',
    SHIPPED: 'จัดส่งเรียบร้อย'
  };

  const formattedTime = card.updated_at
    ? new Date(card.updated_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    : '-';

  if (isCompact) {
    return `
      <div class="kanban-card ${statusClasses[card.status] || ''} card-compact">
        <div class="card-compact-header">
          <div class="card-compact-brand">
            <span>🎴</span>
            <span class="card-compact-title">CARD</span>
          </div>
          <div class="card-compact-bignum">#${card.id}</div>
        </div>
        <div class="card-compact-status">${statusLabels[card.status] || card.status}</div>
        <div class="card-time">
          <span>⏱️ อัปเดตล่าสุด: ${formattedTime} น.</span>
        </div>
      </div>
    `;
  }

  return `
    <div class="kanban-card ${statusClasses[card.status] || ''}">
      <div class="card-top">
        <div class="card-number-tag">
          <span>🎴 CARD #${card.id}</span>
        </div>
        <span class="card-status-badge">${statusLabels[card.status] || card.status}</span>
      </div>
      <div class="card-body">
        <div class="card-info-row">
          <span>ความจุ: 1 กล่อง (FG Slot #${card.id})</span>
        </div>
        <div class="card-time">
          <span>⏱️ อัปเดตล่าสุด: ${formattedTime} น.</span>
        </div>
      </div>
    </div>
  `;
}

// Special 10-Slot Grid View Renderer for Column 4 (FG Shelf)
function renderFGShelfGrid(containerId, activeFGCards) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const fgCardIds = new Set(activeFGCards.map(c => c.id));
  let gridHTML = '<div class="fg-shelf-grid">';

  for (let slot = 1; slot <= 10; slot++) {
    const isOccupied = fgCardIds.has(slot);
    gridHTML += `
      <div class="fg-slot-cell ${isOccupied ? 'occupied' : ''}">
        <div class="fg-slot-number">SLOT #${slot}</div>
        <div class="fg-box-icon">${isOccupied ? '📦' : '⬜'}</div>
        <div style="font-size: 0.7rem; font-weight: 700; color: ${isOccupied ? '#34d399' : '#64748b'}">
          ${isOccupied ? `กล่อง CARD #${slot}` : 'ว่าง'}
        </div>
      </div>
    `;
  }

  gridHTML += '</div>';
  container.innerHTML = gridHTML;
}

// Special Renderer for Column 5 (Shipped)
function renderShippedFeed(containerId, shippedCards, monthlyTotal) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let html = `
    <div class="kanban-card card-shipped" style="background: rgba(167, 139, 250, 0.12); border-color: rgba(167, 139, 250, 0.4); text-align: center;">
      <div style="font-size: 0.85rem; color: #a78bfa; font-weight: 700;">ยอดจัดส่งสะสมประจำเดือน</div>
      <div style="font-size: 2.2rem; font-weight: 800; color: #ffffff; line-height: 1.2;">${monthlyTotal} <span style="font-size: 1rem;">กล่อง</span></div>
      <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 0.2rem;">(Monthly Cumulative Total)</div>
    </div>
  `;

  if (shippedCards.length > 0) {
    html += shippedCards.map(c => createCardHTML(c)).join('');
  } else {
    html += `<div class="empty-column-msg" style="margin-top: 0.85rem;">รอรายการตัดจัดส่งจาก Shipping</div>`;
  }

  container.innerHTML = html;
}

/* ==========================================================================
   ADMIN OVERRIDE CONTROL PANEL MODAL CONTROLLER
   ========================================================================== */

function isAdminModalOpen() {
  const overlay = document.getElementById('adminModalOverlay');
  return overlay && overlay.style.display !== 'none';
}

function initAdminModal() {
  const openBtn = document.getElementById('btnOpenAdminModal');
  const closeBtn = document.getElementById('btnCloseAdminModal');
  const cancelBtn = document.getElementById('btnCancelAdminForm');
  const overlay = document.getElementById('adminModalOverlay');

  const tabBtnAction = document.getElementById('tabBtnAction');
  const tabBtnAudit = document.getElementById('tabBtnAudit');
  const tabBtnCycle = document.getElementById('tabBtnCycle');
  const tabContentAction = document.getElementById('tabContentAction');
  const tabContentAudit = document.getElementById('tabContentAudit');
  const tabContentCycle = document.getElementById('tabContentCycle');

  const actionTypeSelect = document.getElementById('adminActionType');
  const form = document.getElementById('adminOverrideForm');
  const exportAuditCsvBtn = document.getElementById('btnExportAuditCSV');
  const exportMonthlyExcelBtn = document.getElementById('btnExportMonthlyExcel');
  const exportCycleExcelBtn = document.getElementById('btnExportCycleExcel');

  if (!openBtn || !overlay) return;

  // Open Modal
  openBtn.addEventListener('click', () => {
    overlay.style.display = 'flex';
    switchAdminTab('action');
    hideAdminAlert();
  });

  // Close Modal
  function closeModal() {
    overlay.style.display = 'none';
    if (form) form.reset();
    hideAdminAlert();
  }

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  // Close on Backdrop Click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Tab Switcher
  if (tabBtnAction && tabBtnAudit) {
    tabBtnAction.addEventListener('click', () => switchAdminTab('action'));
    tabBtnAudit.addEventListener('click', () => switchAdminTab('audit'));
    if (tabBtnCycle) tabBtnCycle.addEventListener('click', () => switchAdminTab('cycle'));
  }

  function switchAdminTab(tabName) {
    [tabBtnAction, tabBtnAudit, tabBtnCycle].forEach(btn => btn && btn.classList.remove('active'));
    [tabContentAction, tabContentAudit, tabContentCycle].forEach(content => content && content.classList.remove('active'));

    if (tabName === 'action') {
      if (tabBtnAction) tabBtnAction.classList.add('active');
      if (tabContentAction) tabContentAction.classList.add('active');
    } else if (tabName === 'audit') {
      if (tabBtnAudit) tabBtnAudit.classList.add('active');
      if (tabContentAudit) tabContentAudit.classList.add('active');
      renderAuditLogTable();
    } else if (tabName === 'cycle') {
      if (tabBtnCycle) tabBtnCycle.classList.add('active');
      if (tabContentCycle) tabContentCycle.classList.add('active');
      renderCycleTimeAnalytics();
    }
  }

  // Action Type Dynamic Subfield Switcher
  if (actionTypeSelect) {
    actionTypeSelect.addEventListener('change', updateSubfieldVisibility);
    updateSubfieldVisibility(); // initial state
  }

  function updateSubfieldVisibility() {
    const type = actionTypeSelect.value;

    const subMoveCard = document.getElementById('subfieldMoveCard');
    const subNewStatus = document.getElementById('subfieldNewStatus');
    const subAdjustShipped = document.getElementById('subfieldAdjustShipped');
    const subMonthlyHistMonth = document.getElementById('subfieldMonthlyHistMonth');
    const subMonthlyHistQty = document.getElementById('subfieldMonthlyHistQty');
    const subProjStatus = document.getElementById('subfieldProjStatus');
    const subProjDetail = document.getElementById('subfieldProjDetail');
    const subResetAugNotice = document.getElementById('subfieldResetAugNotice');
    const subResetNotice = document.getElementById('subfieldResetNotice');

    // Hide all
    if (subMoveCard) subMoveCard.style.display = 'none';
    if (subNewStatus) subNewStatus.style.display = 'none';
    if (subAdjustShipped) subAdjustShipped.style.display = 'none';
    if (subMonthlyHistMonth) subMonthlyHistMonth.style.display = 'none';
    if (subMonthlyHistQty) subMonthlyHistQty.style.display = 'none';
    if (subProjStatus) subProjStatus.style.display = 'none';
    if (subProjDetail) subProjDetail.style.display = 'none';
    if (subResetAugNotice) subResetAugNotice.style.display = 'none';
    if (subResetNotice) subResetNotice.style.display = 'none';

    if (type === 'MOVE_CARD') {
      if (subMoveCard) subMoveCard.style.display = 'flex';
      if (subNewStatus) subNewStatus.style.display = 'flex';
    } else if (type === 'ADJUST_SHIPPED') {
      if (subAdjustShipped) subAdjustShipped.style.display = 'flex';
      const inputShipped = document.getElementById('adminInputNewShipped');
      if (inputShipped && window.zlinkState) {
        inputShipped.value = window.zlinkState.getMonthlyShipped();
      }
    } else if (type === 'UPDATE_MONTHLY_HIST') {
      if (subMonthlyHistMonth) subMonthlyHistMonth.style.display = 'flex';
      if (subMonthlyHistQty) subMonthlyHistQty.style.display = 'flex';
      const monthSel = document.getElementById('adminSelectMonth');
      const inputQty = document.getElementById('adminInputMonthlyQty');
      if (monthSel && inputQty && window.zlinkState) {
        const hist = window.zlinkState.getMonthlyHistory(2026);
        inputQty.value = hist[monthSel.value] || 0;
        monthSel.onchange = () => {
          inputQty.value = hist[monthSel.value] || 0;
        };
      }
    } else if (type === 'UPDATE_STATUS') {
      if (subProjStatus) subProjStatus.style.display = 'flex';
      if (subProjDetail) subProjDetail.style.display = 'flex';
    } else if (type === 'RESET_AUG_BASELINE') {
      if (subResetAugNotice) subResetAugNotice.style.display = 'flex';
    } else if (type === 'RESET_BOARD') {
      if (subResetNotice) subResetNotice.style.display = 'flex';
    }
  }

  // Form Submit Handler
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      hideAdminAlert();

      const user = document.getElementById('adminUserSelect').value;
      const pin = document.getElementById('adminUserPin').value;
      const actionType = actionTypeSelect.value;
      const reasonCode = document.getElementById('adminReasonCode').value;
      const remarks = document.getElementById('adminRemarks').value;

      if (!pin) {
        showAdminAlert('กรุณากรอกรหัสพนักงาน (PIN)', 'error');
        return;
      }

      let res = { success: false, message: 'เกิดข้อผิดพลาดในการดำเนินการ' };

      if (actionType === 'MOVE_CARD') {
        const cardId = document.getElementById('adminSelectCardId').value;
        const newStatus = document.getElementById('adminSelectNewStatus').value;
        res = window.zlinkState.adminMoveCard(user, pin, cardId, newStatus, reasonCode, remarks);
      } else if (actionType === 'ADJUST_SHIPPED') {
        const newShipped = document.getElementById('adminInputNewShipped').value;
        res = window.zlinkState.adminAdjustMonthlyShipped(user, pin, newShipped, reasonCode, remarks);
      } else if (actionType === 'UPDATE_MONTHLY_HIST') {
        const mNum = document.getElementById('adminSelectMonth').value;
        const mQty = document.getElementById('adminInputMonthlyQty').value;
        res = window.zlinkState.adminUpdateMonthlyHistory(user, pin, mNum, mQty, reasonCode, remarks);
      } else if (actionType === 'UPDATE_STATUS') {
        const status = document.getElementById('adminSelectProjStatus').value;
        const detail = document.getElementById('adminInputProjDetail').value;
        res = window.zlinkState.adminUpdateProjectStatus(user, pin, status, detail, reasonCode, remarks);
      } else if (actionType === 'RESET_AUG_BASELINE') {
        if (!confirm('ยืนยันตั้งค่าสถานะเริ่มต้นการ์ดสิงหาคม 2026 (#1-2 WIP, #3-8 Job Board, #9-10 FG) ใช่หรือไม่?')) return;
        res = window.zlinkState.adminResetAugustStatus(user, pin, reasonCode, remarks);
      } else if (actionType === 'RESET_BOARD') {
        if (!confirm('ยืนยันล้างสถานะและรีเซ็ตกระดานทั้งหมดกลับสู่เริ่มต้นใช่หรือไม่?')) return;
        res = window.zlinkState.adminResetBoard(user, pin, reasonCode, remarks);
      }

      if (res.success) {
        showAdminAlert(`✅ ${res.message}`, 'success');
        document.getElementById('adminUserPin').value = '';
        document.getElementById('adminRemarks').value = '';
        renderDashboard();
      } else {
        showAdminAlert(`❌ ${res.message}`, 'error');
      }
    });
  }

  // Export Audit CSV Button
  if (exportAuditCsvBtn) {
    exportAuditCsvBtn.addEventListener('click', () => {
      window.zlinkState.exportAuditLogsCSV();
    });
  }

  // Export Monthly Excel Button
  if (exportMonthlyExcelBtn) {
    exportMonthlyExcelBtn.addEventListener('click', () => {
      window.zlinkState.exportMonthlyShipmentExcel();
    });
  }

  // Export Assembly Cycle Excel Button
  if (exportCycleExcelBtn) {
    exportCycleExcelBtn.addEventListener('click', () => {
      window.zlinkState.exportAssemblyCycleExcel();
    });
  }
}

function showAdminAlert(msg, type) {
  const box = document.getElementById('adminAlertBox');
  if (!box) return;
  box.textContent = msg;
  box.className = `admin-alert-box ${type}`;
}

function hideAdminAlert() {
  const box = document.getElementById('adminAlertBox');
  if (!box) return;
  box.className = 'admin-alert-box';
  box.style.display = 'none';
}

// Render Audit Log Table inside Tab 2
function renderAuditLogTable() {
  const tbody = document.getElementById('auditLogTableBody');
  if (!tbody || !window.zlinkState) return;

  const logs = window.zlinkState.getAuditLogs();

  if (logs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: #64748b; padding: 1.5rem;">
          ยังไม่มีประวัติการแก้ไขรายการในระบบ
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = logs.slice(0, 50).map(log => {
    const timeStr = new Date(log.timestamp).toLocaleString('th-TH', {
      year: '2-digit',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    return `
      <tr>
        <td style="white-space: nowrap; font-size: 0.78rem; color: #94a3b8;">${timeStr} น.</td>
        <td style="font-weight: 700; color: #fbbf24;">${log.user_name} <span style="font-size: 0.72rem; color: #64748b;">(ID: ${log.employee_id})</span></td>
        <td style="font-weight: 600;">${log.action_type}</td>
        <td>
          <span style="color: #94a3b8;">${log.target_id}:</span> 
          <span style="color: #f472b6;">${log.old_value}</span> ➔ <span style="color: #34d399; font-weight: 700;">${log.new_value}</span>
        </td>
        <td>
          <span class="audit-badge reason">${log.reason_code}</span>
          <div style="font-size: 0.75rem; color: #cbd5e1; margin-top: 0.2rem;">${log.remarks}</div>
        </td>
      </tr>
    `;
  }).join('');
}

// Render Assembly Cycle Time Analytics inside Tab 3
function renderCycleTimeAnalytics() {
  const tbody = document.getElementById('cycleTableBody');
  const kpiAvg = document.getElementById('cycleKpiAvg');
  const kpiMinMax = document.getElementById('cycleKpiMinMax');
  const kpiOnTime = document.getElementById('cycleKpiOnTime');

  if (!tbody || !window.zlinkState) return;

  const analytics = window.zlinkState.getAssemblyAnalytics();
  const logs = window.zlinkState.getAssemblyCycleLogs();

  if (kpiAvg) kpiAvg.textContent = `${analytics.avgHours} ชม.`;
  if (kpiMinMax) kpiMinMax.textContent = `${analytics.minHours} / ${analytics.maxHours} ชม.`;
  if (kpiOnTime) kpiOnTime.textContent = `${analytics.onTimeRate}%`;

  if (logs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: #64748b; padding: 1.5rem;">
          ยังไม่มีประวัติการคำนวณระยะเวลาประกอบ (Cycle Time) ในระบบ
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = logs.slice(0, 50).map(log => {
    const startStr = new Date(log.wip_start_time).toLocaleString('th-TH', {
      hour: '2-digit', minute: '2-digit'
    });
    const endStr = new Date(log.qa_end_time).toLocaleString('th-TH', {
      hour: '2-digit', minute: '2-digit'
    });
    const isTargetMet = (log.status_benchmark === 'ON_TARGET');
    const badgeBg = isTargetMet ? 'rgba(52, 211, 153, 0.15)' : 'rgba(244, 63, 94, 0.15)';
    const badgeColor = isTargetMet ? '#34d399' : '#fb7185';
    const badgeText = isTargetMet ? `🟢 ตรงเป้า (${log.duration_hours}h)` : `🔴 เกินเป้า (+${log.variance_hours}h)`;

    return `
      <tr>
        <td style="white-space: nowrap; font-size: 0.78rem; color: #94a3b8;">${log.recorded_date}</td>
        <td><strong style="color: #38bdf8;">Card #${log.card_id}</strong></td>
        <td style="white-space: nowrap;">${startStr} น.</td>
        <td style="white-space: nowrap;">${endStr} น.</td>
        <td><strong>${log.duration_hours} ชม.</strong> <span style="font-size: 0.75rem; color: #64748b;">(${log.duration_minutes}m)</span></td>
        <td><span style="background: ${badgeBg}; color: ${badgeColor}; padding: 0.2rem 0.55rem; border-radius: 12px; font-weight: 700; font-size: 0.78rem;">${badgeText}</span></td>
        <td><strong>${log.man_hours} Man-Hrs</strong></td>
      </tr>
    `;
  }).join('');
}


