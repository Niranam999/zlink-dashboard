# Design Specification: Z-LINK Admin Override & Audit Trail System

**Date:** 2026-08-06  
**Project:** Z-LINK Kanban Realtime Dashboard  
**Target Standard:** ISO 9001:2015 & IATF 16949 Quality Management System Compliance  

---

## 1. Overview & Purpose
In production sub-assembly operations at Aveam, operational anomalies such as QA rejections, scan omissions, damaged physical Kanban cards, or inventory count discrepancies require manual intervention by authorized project managers or supervisors. 

To ensure complete operational integrity, governance, and audit traceability, this feature introduces an **Admin Override Control Panel** with built-in **Employee ID Authentication** and **Realtime Audit Trail Logging**.

---

## 2. Authorized Users & Authentication Matrix
Access to the Admin Control Panel requires selecting an authorized user profile and authenticating with their unique Employee ID as a PIN code.

| Name | Role | Employee ID (PIN) |
| :--- | :--- | :--- |
| **Wattana** | Program / Project Manager (คุณเอ) | `511011` |
| **Wanlop** | Build Leader / Supervisor (คุณวัลลภ) | `1801221` |

---

## 3. UI Component Specifications (`index.html` & `css/`)

### 3.1 Header Control Button
- A stylized action button `⚙️ Admin Override` placed on the main dashboard header navigation bar.
- Clicking the button opens the **Admin Control Panel Modal**.

### 3.2 Admin Control Panel Modal (2-Tab Interface)

#### Tab 1: ⚙️ ดำเนินการแก้ไข (Override Action Form)
1. **User Selection:** Dropdown selector [`Wattana (511011)`, `Wanlop (1801221)`].
2. **Employee ID Verification:** Password field requiring exact Employee ID PIN.
3. **Action Type Selection:**
   - **Move Card Status:** Select target card (`Card #1` - `Card #10`) and target status (`JOB_BOARD`, `WIP_ASSEMBLY`, `QA_PACKING`, `FG_SHELF`, `SHIPPED`).
   - **Adjust Monthly Shipped:** Input field to modify cumulative shipped total.
   - **Update Project Status:** Select status (`RUNNING`, `ISSUE`, `NO_PRODUCTION`) and detail string.
   - **Reset Board:** Reset all card states to `JOB_BOARD` with 2-step confirmation prompt.
4. **Reason Code Dropdown:**
   - `[QA_REJECT]` QA Inspection Failed (Rework in WIP)
   - `[SCAN_ERROR]` QR Scan Omitted / Execution Error
   - `[INVENTORY_ADJUST]` Physical Inventory Audit Correction
   - `[CARD_REPLACEMENT]` Card Cycle Reset / Physical Card Damaged
   - `[SHIFT_RESET]` Shift Change Initialization
   - `[OTHER]` Custom Reason
5. **Remarks Field:** Optional text input for specific operational notes.
6. **Submit Button:** Performs validation, updates state engine, appends audit log entry, and broadcasts realtime update across open tabs/screens.

#### Tab 2: 📋 ประวัติการแก้ไข (Audit Log History)
- Realtime table rendering the 50 most recent audit log entries.
- Table Columns: `Timestamp` | `User (ID)` | `Action Type` | `Details (Old ➔ New)` | `Reason & Remarks`.
- **CSV Export Button (`📥 Export CSV`):** Generates and downloads a complete UTF-8 BOM CSV file of all recorded audit logs for ISO/IATF external audits.

---

## 4. Data Model & State Engine Updates (`js/firebase-config.js`)

### 4.1 Storage Keys
- `zlink_kanban_cards_state`: Current card statuses object.
- `zlink_kanban_monthly_shipped`: Cumulative monthly count integer.
- `zlink_project_status`: Project health state object.
- **`zlink_kanban_audit_logs` (NEW):** JSON array of audit log objects stored in `localStorage` and synced via `BroadcastChannel`.

### 4.2 Audit Log Schema
```json
{
  "log_id": "LOG_1722926900123",
  "timestamp": "2026-08-06T13:32:00.000Z",
  "user_name": "Wattana",
  "employee_id": "511011",
  "action_type": "MOVE_CARD",
  "target_id": "Card #4",
  "old_value": "QA_PACKING",
  "new_value": "WIP_ASSEMBLY",
  "reason_code": "QA_REJECT",
  "remarks": "พบรอยขีดข่วนที่ฝาครอบ ต้องส่งทำ Rework"
}
```

### 4.3 Engine Method Extensions
- `verifyUserPin(userName, pin)`: Validates input against authorized credentials matrix.
- `adminMoveCard(user, cardId, newStatus, reasonCode, remarks)`: Atomically updates card state and logs entry.
- `adminAdjustMonthlyShipped(user, newCount, reasonCode, remarks)`: Updates shipped total and logs entry.
- `adminUpdateProjectStatus(user, status, detail, reasonCode, remarks)`: Updates status and logs entry.
- `adminResetBoard(user, reasonCode, remarks)`: Resets cards and logs entry.
- `getAuditLogs()`: Returns list of audit records.
- `exportAuditLogsCSV()`: Triggers browser download of CSV audit report.

---

## 5. Verification & Compliance Criteria
1. **Security:** Invalid Employee ID PIN prevents any state mutation and displays an alert message.
2. **Realtime Sync:** State changes and audit log updates broadcast instantly across all open browser windows (Dashboard, TV Carousel, Scanner).
3. **Traceability:** Every manual override action records exact user, timestamp, state diff, and reason code.
4. **Audit Readiness:** Exported CSV correctly encodes Thai language remarks and displays structured audit records suitable for ISO 9001 / IATF 16949 audit evidence.
