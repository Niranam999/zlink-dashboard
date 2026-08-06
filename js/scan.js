/* ==========================================================================
   Z-LINK KANBAN REALTIME DASHBOARD - MOBILE SCANNER CONTROLLER (scan.html)
   ========================================================================== */

let selectedCardId = 1;

document.addEventListener('DOMContentLoaded', () => {
  // Parse card number from URL parameter ?card=X
  const urlParams = new URLSearchParams(window.location.search);
  const cardParam = urlParams.get('card');
  if (cardParam && !isNaN(cardParam) && cardParam >= 1 && cardParam <= 10) {
    selectedCardId = parseInt(cardParam, 10);
  }

  renderMobileUI();

  // Listen for realtime updates
  if (window.zlinkState) {
    window.zlinkState.onStateChange(() => {
      renderMobileUI();
    });
  }
});

let pendingNextStatus = 'WIP_ASSEMBLY';
let isSaving = false;

let lastActionState = null; // Track single-use undo: { cardId, fromStatus, toStatus, canUndo }

// Render Mobile Scanner UI
function renderMobileUI() {
  const cardData = window.zlinkState.getCard(selectedCardId);
  const cardIdElem = document.getElementById('mobileCardId');
  const statusPillElem = document.getElementById('mobileStatusPill');
  const actionContainer = document.getElementById('actionButtonContainer');
  const undoContainer = document.getElementById('undoButtonContainer');

  if (cardIdElem) cardIdElem.textContent = `CARD #${selectedCardId}`;

  // Render Status Badge & Action Button based on state machine
  const statusConfig = {
    JOB_BOARD: {
      label: 'อยู่ Job Board (รอประกอบ)',
      pillBg: 'rgba(148, 163, 184, 0.2)',
      pillColor: '#94a3b8',
      btnText: '▶ เริ่มประกอบ (Move to WIP)',
      btnClass: 'btn-wip',
      nextStatus: 'WIP_ASSEMBLY'
    },
    WIP_ASSEMBLY: {
      label: 'กำลังประกอบ (WIP)',
      pillBg: 'rgba(56, 189, 248, 0.2)',
      pillColor: '#38bdf8',
      btnText: '🔍 ส่งตรวจ QA / แพ็กงาน',
      btnClass: 'btn-qa',
      nextStatus: 'QA_PACKING'
    },
    QA_PACKING: {
      label: 'รอตรวจ QA / แพ็กงาน',
      pillBg: 'rgba(251, 191, 36, 0.2)',
      pillColor: '#fbbf24',
      btnText: `📦 วางบนชั้น FG Slot #${selectedCardId}`,
      btnClass: 'btn-fg',
      nextStatus: 'FG_SHELF'
    },
    FG_SHELF: {
      label: `อยู่บนชั้น FG Slot #${selectedCardId}`,
      pillBg: 'rgba(52, 211, 153, 0.2)',
      pillColor: '#34d399',
      btnText: '🚚 Shipping จัดส่งสินค้า (Shipped)',
      btnClass: 'btn-shipped',
      nextStatus: 'SHIPPED'
    },
    SHIPPED: {
      label: 'จัดส่งแล้ว (กำลังคืนการ์ดเข้า Board)',
      pillBg: 'rgba(167, 139, 250, 0.2)',
      pillColor: '#a78bfa',
      btnText: '🔄 กำลังรีเซ็ตกลับเข้า Job Board...',
      btnClass: 'btn-wip',
      nextStatus: 'JOB_BOARD'
    }
  };

  const statusLabelsMap = {
    JOB_BOARD: 'Job Board (รอประกอบ)',
    WIP_ASSEMBLY: 'WIP Assembly (กำลังประกอบ)',
    QA_PACKING: 'QA & Packing (ตรวจเช็ค QA)',
    FG_SHELF: 'ชั้น FG Shelf',
    SHIPPED: 'จัดส่งแล้ว'
  };

  const config = statusConfig[cardData.status] || statusConfig.JOB_BOARD;

  if (statusPillElem) {
    statusPillElem.textContent = config.label;
    statusPillElem.style.background = config.pillBg;
    statusPillElem.style.color = config.pillColor;
  }

  if (actionContainer) {
    // Check WIP limit rule: max 2 WIP cards concurrent
    const cardsObj = window.zlinkState.getCards();
    const wipCount = Object.values(cardsObj).filter(c => c.status === 'WIP_ASSEMBLY').length;
    const isWIPLimitReached = (cardData.status === 'JOB_BOARD' && wipCount >= 2);

    if (isWIPLimitReached) {
      actionContainer.innerHTML = `
        <button class="btn-action-primary" style="background: #475569; color: #94a3b8; cursor: not-allowed;" disabled>
          ⚠️ WIP เต็มแล้ว (สูงสุด 2 งาน)
        </button>
        <div style="font-size: 0.8rem; color: #fbbf24; text-align: center; margin-top: 0.75rem;">
          กรุณาเคลียร์งานใน WIP ให้เสร็จก่อนหยิบการ์ดใบใหม่
        </div>
      `;
    } else {
      actionContainer.innerHTML = `
        <button class="btn-action-primary ${config.btnClass}" onclick="handleOneTapAction('${config.nextStatus}')">
          ${config.btnText}
        </button>
      `;
    }
  }

  // Render Undo Button (Single-use ONLY right after pressing top action button)
  if (undoContainer) {
    const isUndoAvailable = (
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
          ↩️ ถอนคำสั่ง (กดได้ 1 ครั้งเฉพาะหลังกดปุ่มด้านบน)
        </button>
      `;
    }
  }

  renderQuickSelectorGrid();
}

// Handle 1-Tap Action Click (Forward state & enable single-use undo)
function handleOneTapAction(nextStatus) {
  const currentCard = window.zlinkState.getCard(selectedCardId);

  // Record action history for single-use undo
  lastActionState = {
    cardId: selectedCardId,
    fromStatus: currentCard.status,
    toStatus: nextStatus,
    canUndo: true
  };

  window.zlinkState.updateCardStatus(selectedCardId, nextStatus);
  showToast(`✅ อัปเดต Card #${selectedCardId} เรียบร้อย!`);
}

// Handle Undo Action Click (Rewind state once and consume undo capability)
function handleUndoAction() {
  if (!lastActionState || !lastActionState.canUndo || lastActionState.cardId !== selectedCardId) return;

  const targetPrevStatus = lastActionState.fromStatus;
  
  // Consume undo capability (single-use only!)
  lastActionState.canUndo = false;

  window.zlinkState.updateCardStatus(selectedCardId, targetPrevStatus);
  showToast(`↩️ ถอนคำสั่งเมื่อครู่เรียบร้อย! คืน Card #${selectedCardId} กลับสถานะเดิม`);
}

// Select Card Number
function selectCard(num) {
  if (lastActionState && lastActionState.cardId !== num) {
    lastActionState.canUndo = false; // Reset undo when switching cards
  }
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
  const toast = document.createElement('div');
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
