/* ==========================================================================
   Z-LINK KANBAN REALTIME DASHBOARD - MOBILE SCANNER CONTROLLER (scan.html)
   ========================================================================== */

let selectedCardId = 1;
let pendingNextStatus = null; // Track status pending confirmation (Save flow)
let lastActionState = null;   // Track single-use undo: { cardId, fromStatus, toStatus, canUndo }

document.addEventListener('DOMContentLoaded', () => {
  // Parse card number from URL parameter ?card=X
  const urlParams = new URLSearchParams(window.location.search);
  const cardParam = urlParams.get('card');
  if (cardParam && !isNaN(cardParam) && cardParam >= 1 && cardParam <= 10) {
    selectedCardId = parseInt(cardParam, 10);
  }

  renderMobileUI();

  // Listen for realtime updates from state engine (Cloud / Local)
  if (window.zlinkState) {
    window.zlinkState.onStateChange(() => {
      renderMobileUI();
    });
  }
});

// Render Mobile Scanner UI
function renderMobileUI() {
  const cardData = window.zlinkState.getCard(selectedCardId);
  const cardIdElem = document.getElementById('mobileCardId');
  const statusPillElem = document.getElementById('mobileStatusPill');
  const actionContainer = document.getElementById('actionButtonContainer');
  const undoContainer = document.getElementById('undoButtonContainer');

  if (cardIdElem) cardIdElem.textContent = `CARD #${selectedCardId}`;

  // Status configuration mapping
  const statusConfig = {
    JOB_BOARD: {
      label: 'อยู่ Job Board (รอประกอบ)',
      pillBg: 'rgba(148, 163, 184, 0.2)',
      pillColor: '#94a3b8',
      btnText: '▶ เลื่อนสถานะไป: กำลังประกอบ (WIP)',
      btnClass: 'btn-wip',
      nextStatus: 'WIP_ASSEMBLY',
      nextLabel: 'WIP Assembly (กำลังประกอบ)'
    },
    WIP_ASSEMBLY: {
      label: 'กำลังประกอบ (WIP)',
      pillBg: 'rgba(56, 189, 248, 0.2)',
      pillColor: '#38bdf8',
      btnText: '🔍 เลื่อนสถานะไป: ส่งตรวจ QA / แพ็กงาน',
      btnClass: 'btn-qa',
      nextStatus: 'QA_PACKING',
      nextLabel: 'QA & Packing (ตรวจเช็ค QA)'
    },
    QA_PACKING: {
      label: 'รอตรวจ QA / แพ็กงาน',
      pillBg: 'rgba(251, 191, 36, 0.2)',
      pillColor: '#fbbf24',
      btnText: `📦 เลื่อนสถานะไป: วางบนชั้น FG Slot #${selectedCardId}`,
      btnClass: 'btn-fg',
      nextStatus: 'FG_SHELF',
      nextLabel: `ชั้นวาง FG Slot #${selectedCardId}`
    },
    FG_SHELF: {
      label: `อยู่บนชั้น FG Slot #${selectedCardId}`,
      pillBg: 'rgba(52, 211, 153, 0.2)',
      pillColor: '#34d399',
      btnText: '🚚 เลื่อนสถานะไป: Shipping ตัดจัดส่ง (Shipped)',
      btnClass: 'btn-shipped',
      nextStatus: 'SHIPPED',
      nextLabel: 'จัดส่งแล้ว (Shipped)'
    },
    SHIPPED: {
      label: 'จัดส่งแล้ว (กำลังคืนการ์ดเข้า Board)',
      pillBg: 'rgba(167, 139, 250, 0.2)',
      pillColor: '#a78bfa',
      btnText: '🔄 กำลังรีเซ็ตกลับเข้า Job Board...',
      btnClass: 'btn-wip',
      nextStatus: 'JOB_BOARD',
      nextLabel: 'Job Board (รอประกอบ)'
    }
  };

  const statusLabelsMap = {
    JOB_BOARD: 'Job Board (รอประกอบ)',
    WIP_ASSEMBLY: 'WIP Assembly (กำลังประกอบ)',
    QA_PACKING: 'QA & Packing (ตรวจเช็ค QA)',
    FG_SHELF: `ชั้น FG Slot #${selectedCardId}`,
    SHIPPED: 'จัดส่งแล้ว (Shipped)'
  };

  const config = statusConfig[cardData.status] || statusConfig.JOB_BOARD;

  if (statusPillElem) {
    statusPillElem.textContent = config.label;
    statusPillElem.style.background = config.pillBg;
    statusPillElem.style.color = config.pillColor;
  }

  if (actionContainer) {
    // Check WIP limit rule: max 10 WIP cards concurrent
    const cardsObj = window.zlinkState.getCards();
    const wipCount = Object.values(cardsObj).filter(c => c.status === 'WIP_ASSEMBLY').length;
    const isWIPLimitReached = (cardData.status === 'JOB_BOARD' && wipCount >= 10);

    if (isWIPLimitReached) {
      actionContainer.innerHTML = `
        <button class="btn-action-primary" style="background: #475569; color: #94a3b8; cursor: not-allowed;" disabled>
          ⚠️ WIP เต็มแล้ว (สูงสุด 10 งาน)
        </button>
        <div style="font-size: 0.8rem; color: #fbbf24; text-align: center; margin-top: 0.75rem;">
          กรุณาเคลียร์งานใน WIP ให้เสร็จก่อนหยิบการ์ดใบใหม่
        </div>
      `;
    } else if (pendingNextStatus) {
      // Step 2: Show Confirmation Box with SAVE button
      const targetLabel = statusLabelsMap[pendingNextStatus] || pendingNextStatus;
      const currentLabel = statusLabelsMap[cardData.status] || cardData.status;

      actionContainer.innerHTML = `
        <div class="confirm-action-box">
          <div style="font-size: 0.88rem; color: #94a3b8; margin-bottom: 0.6rem; font-weight: 600;">
            ยืนยันการเปลี่ยนสถานะของ <strong style="color: #38bdf8;">CARD #${selectedCardId}</strong>
          </div>
          <div class="confirm-status-flow">
            <span class="confirm-from-badge">${currentLabel}</span>
            <span class="confirm-arrow">➔</span>
            <span class="confirm-to-badge">${targetLabel}</span>
          </div>
          <div class="confirm-btn-group">
            <button class="btn-save-confirm" onclick="confirmSaveAction()">
              <span>💾</span> <span>ยืนยันบันทึกข้อมูล (Save)</span>
            </button>
            <button class="btn-cancel-confirm" onclick="cancelPendingAction()">
              <span>❌ ยกเลิก (Cancel)</span>
            </button>
          </div>
        </div>
      `;
    } else {
      // Step 1: Default Action Button to choose next state
      actionContainer.innerHTML = `
        <button class="btn-action-primary ${config.btnClass}" onclick="selectNextStatus('${config.nextStatus}')">
          ${config.btnText}
        </button>
      `;
    }
  }

  // Render Undo Button (Single-use ONLY right after pressing top action button and saving)
  if (undoContainer) {
    const isUndoAvailable = (
      !pendingNextStatus &&
      lastActionState &&
      lastActionState.cardId === selectedCardId &&
      lastActionState.canUndo === true
    );

    if (isUndoAvailable) {
      const prevLabel = statusLabelsMap[lastActionState.fromStatus] || lastActionState.fromStatus;
      undoContainer.innerHTML = `
        <button class="btn-undo-action active-undo" onclick="handleUndoAction()">
          ↩️ ถอนคำสั่งเมื่อครู่ (คืนกลับไป ${prevLabel})
        </button>
      `;
    } else {
      undoContainer.innerHTML = `
        <button class="btn-undo-action disabled" disabled>
          ↩️ ถอนคำสั่ง (กดได้ 1 ครั้งเฉพาะหลังบันทึก)
        </button>
      `;
    }
  }

  renderQuickSelectorGrid();
}

// Step 1: Select Next Status (Enters Pending / Confirmation State)
function selectNextStatus(nextStatus) {
  pendingNextStatus = nextStatus;
  renderMobileUI();
}

// Cancel Pending Action
function cancelPendingAction() {
  pendingNextStatus = null;
  renderMobileUI();
}

// Step 2: Confirm and Save Action (Commit to Realtime DB and State Engine)
function confirmSaveAction() {
  if (!pendingNextStatus) return;

  const currentCard = window.zlinkState.getCard(selectedCardId);
  const targetStatus = pendingNextStatus;

  // Record action history for single-use undo
  lastActionState = {
    cardId: selectedCardId,
    fromStatus: currentCard.status,
    toStatus: targetStatus,
    canUndo: true
  };

  // Update card status in StateEngine (pushes to Cloud and saves locally)
  window.zlinkState.updateCardStatus(selectedCardId, targetStatus);
  pendingNextStatus = null;

  renderMobileUI();
  showToast(`✅ บันทึก Card #${selectedCardId} เรียบร้อย!`);
}

// Handle Undo Action Click (Rewind state once and consume undo capability)
function handleUndoAction() {
  if (!lastActionState || !lastActionState.canUndo || lastActionState.cardId !== selectedCardId) return;

  const targetPrevStatus = lastActionState.fromStatus;
  
  // Consume undo capability (single-use only!)
  lastActionState.canUndo = false;

  window.zlinkState.updateCardStatus(selectedCardId, targetPrevStatus);
  pendingNextStatus = null;
  renderMobileUI();
  showToast(`↩️ ถอนคำสั่งเมื่อครู่เรียบร้อย! คืน Card #${selectedCardId} กลับสถานะเดิม`);
}

// Select Card Number from Quick Selector
function selectCard(num) {
  if (lastActionState && lastActionState.cardId !== num) {
    lastActionState.canUndo = false; // Reset undo when switching cards
  }
  pendingNextStatus = null; // Clear pending state on card switch
  selectedCardId = num;
  renderMobileUI();
}

// Render Quick Card Selection Grid (Buttons 1 to 10)
function renderQuickSelectorGrid() {
  const container = document.getElementById('cardButtonsGrid');
  if (!container) return;

  let html = '';
  for (let i = 1; i <= 10; i++) {
    const isActive = (i === selectedCardId);
    html += `
      <button class="btn-card-num ${isActive ? 'active' : ''}" onclick="selectCard(${i})">
        #${i}
      </button>
    `;
  }
  container.innerHTML = html;
}

// Simple Toast Notification
function showToast(msg) {
  const existingToast = document.querySelector('.mobile-toast-notification');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.className = 'mobile-toast-notification';
  toast.style.cssText = `
    position: fixed;
    bottom: 2rem;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(16, 185, 129, 0.95);
    color: #ffffff;
    padding: 0.8rem 1.5rem;
    border-radius: 30px;
    font-weight: 700;
    font-size: 0.9rem;
    box-shadow: 0 10px 25px rgba(0,0,0,0.3);
    z-index: 10000;
    animation: cardFadeIn 0.3s ease;
    white-space: nowrap;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

// Assembly Project Status Handler (RUNNING, ISSUE, NO_PRODUCTION)
function setAssemblyStatus(status, detail) {
  window.zlinkState.updateProjectStatus(status, detail);
  const statusNames = {
    RUNNING: '🔵 RUNNING (รันงานปกติ)',
    ISSUE: '🔴 ISSUE (พบปัญหา)',
    NO_PRODUCTION: '🟢 NO PRODUCTION (หยุดผลิต)'
  };
  showToast(`อัปเดตสถานะโครงการเป็น ${statusNames[status] || status}`);
  highlightActiveStatusButton(status);
}

function openIssueModal() {
  const modal = document.getElementById('issueModal');
  const input = document.getElementById('issueInput');
  if (input) input.value = '';
  if (modal) modal.style.display = 'flex';
}

function closeIssueModal() {
  const modal = document.getElementById('issueModal');
  if (modal) modal.style.display = 'none';
}

function submitIssueDetail() {
  const input = document.getElementById('issueInput');
  const issueText = input ? input.value.trim() : '';

  if (!issueText) {
    showToast('⚠️ กรุณากรอกรายละเอียดปัญหา');
    return;
  }

  setAssemblyStatus('ISSUE', issueText);
  closeIssueModal();
}

function highlightActiveStatusButton(currentStatus) {
  const btnRun = document.getElementById('btnStatusRunning');
  const btnIssue = document.getElementById('btnStatusIssue');
  const btnNoProd = document.getElementById('btnStatusNoProd');

  [btnRun, btnIssue, btnNoProd].forEach(btn => {
    if (btn) btn.classList.remove('active-status-selected');
  });

  if (currentStatus === 'RUNNING' && btnRun) btnRun.classList.add('active-status-selected');
  if (currentStatus === 'ISSUE' && btnIssue) btnIssue.classList.add('active-status-selected');
  if (currentStatus === 'NO_PRODUCTION' && btnNoProd) btnNoProd.classList.add('active-status-selected');
}

// Exit Application Actions
function handleExitApp() {
  const modal = document.getElementById('exitModal');
  if (modal) {
    modal.style.display = 'flex';
  } else {
    confirmExitApp();
  }
}

function closeExitModal() {
  const modal = document.getElementById('exitModal');
  if (modal) modal.style.display = 'none';
}

function confirmExitApp() {
  closeExitModal();
  window.close();

  setTimeout(() => {
    try {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        showToast('ℹ️ ปิดแท็บนี้บนเบราว์เซอร์ของคุณได้เลยครับ');
      }
    } catch (e) {
      showToast('ℹ️ ปิดแท็บนี้บนเบราว์เซอร์ของคุณได้เลยครับ');
    }
  }, 100);
}

// Reset Board Action for Mobile (Protected by Admin PIN)
function handleMobileResetBoard() {
  const modal = document.getElementById('resetPinModal');
  const input = document.getElementById('adminResetPinInput');
  const err = document.getElementById('resetPinError');
  if (err) err.style.display = 'none';
  if (input) input.value = '';
  if (modal) {
    modal.style.display = 'flex';
    setTimeout(() => {
      if (input) input.focus();
    }, 150);
  }
}

function closeResetPinModal() {
  const modal = document.getElementById('resetPinModal');
  if (modal) modal.style.display = 'none';
}

function submitAdminResetWithPin() {
  const input = document.getElementById('adminResetPinInput');
  const err = document.getElementById('resetPinError');
  const pin = input ? input.value.trim() : '';

  if (!pin) {
    if (err) {
      err.textContent = '❌ กรุณากรอกรหัสผ่าน Admin (PIN)';
      err.style.display = 'block';
    }
    return;
  }

  // Verify PIN with State Engine (Wattana 511011 or 1234)
  const auth = window.zlinkState.verifyUserPin('Wattana', pin);
  if (!auth.success) {
    if (err) {
      err.textContent = '❌ รหัสผ่าน PIN ไม่ถูกต้อง เฉพาะผู้มีอำนาจเท่านั้น';
      err.style.display = 'block';
    }
    return;
  }

  // Authorized! Perform clean reset
  closeResetPinModal();
  window.zlinkState.resetBoard();
  selectedCardId = 1;
  pendingNextStatus = null;
  lastActionState = null;
  renderMobileUI();
  showToast('✅ ยืนยันรหัสผ่านสำเร็จ! รีเซ็ตกระดานเรียบร้อยแล้ว');
}
