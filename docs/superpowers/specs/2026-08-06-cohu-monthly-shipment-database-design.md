# Design Specification: Z-LINK Monthly Shipment Database & Dynamic Chart Engine

**Date:** 2026-08-06  
**Target Contract Part Number:** `8308859901` (`OPTN,Z-LINKS,4 CHK ASSEMBLES`)  
**Data Source:** `Cohu_Y2026.xlsx` (Column D: Part Number, Column G: Inv Date, Column J: Shipped Qty)  
**Standard:** ISO 9001:2015 Production Metrics & Traceability  

---

## 1. Initial Operational Baseline (August 2026)

### 🎴 10-Kanban Cards Initial Placement
- **`WIP_ASSEMBLY` (กำลังประกอบ - 2 ใบ):** Card #1, Card #2 (ความจุเต็ม 2/2)
- **`JOB_BOARD` (รอประกอบ - 6 ใบ):** Card #3, Card #4, Card #5, Card #6, Card #7, Card #8
- **`QA_PACKING` (รอตรวจ QA - 0 ใบ):** ไม่มี
- **`FG_SHELF` (พร้อมส่งบนชั้น FG - 2 ใบ):** Card #9 (Slot #9), Card #10 (Slot #10)
- **`SHIPPED` (จัดส่งแล้ว - 0 ใบ):** ยอดจัดส่งเดือน ส.ค. 2026 ตั้งต้นที่ 0 กล่อง

---

## 2. Verified Historical Baseline (PN 8308859901 - Year 2026)
Extracted directly from `Cohu_Y2026.xlsx` for Contract Part Number `8308859901`:

| Month | Month Name | Shipped Qty (กล่อง/ชุด) | Invoices & Details |
| :---: | :--- | :---: | :--- |
| **M1** | January (ม.ค.) | **10** | Inv: 9942 (2), 9943 (2), 9958 (2), 9985 (4) |
| **M2** | February (ก.พ.) | **21** | Inv: 10002 (4), 10010 (2), 10021 (2), 10023 (4), 10027 (4), 10032 (3), 10037 (2) |
| **M3** | March (มี.ค.) | **1** | Inv: 10056 (1) |
| **M4** | April (เม.ย.) | **2** | Inv: 10116 (2) |
| **M5** | May (พ.ค.) | **4** | Inv: 10126 (4) |
| **M6** | June (มิ.ย.) | **4** | Inv: 10194 (4) |
| **M7** | July (ก.ค.) | **8** | Inv: 10223 (4), 10253 (2), 10254 (2) |
| **M8** | **August (ส.ค.)** | **0** | **เดือนปัจจุบัน (พร้อมรับสแกนงานผลิตจริงประจำเดือน ส.ค. 2026)** |
| **M9** | September (ก.ย.) | **0** | - |
| **M10** | October (ต.ค.) | **0** | - |
| **M11** | November (พ.ย.) | **0** | - |
| **M12** | December (ธ.ค.) | **0** | - |

- **Y2026 Cumulative Total (Jan - Jul):** **50 กล่อง**
- **Current Month (Aug 2026):** **0 กล่อง** (รีเซ็ตพร้อมเริ่มกะการผลิตจริง)

---

## 3. System Architecture & Components

### 3.1 Card Initial State Schema (`zlink_kanban_cards_state`)
```json
{
  "1": { "id": 1, "status": "WIP_ASSEMBLY" },
  "2": { "id": 2, "status": "WIP_ASSEMBLY" },
  "3": { "id": 3, "status": "JOB_BOARD" },
  "4": { "id": 4, "status": "JOB_BOARD" },
  "5": { "id": 5, "status": "JOB_BOARD" },
  "6": { "id": 6, "status": "JOB_BOARD" },
  "7": { "id": 7, "status": "JOB_BOARD" },
  "8": { "id": 8, "status": "JOB_BOARD" },
  "9": { "id": 9, "status": "FG_SHELF" },
  "10": { "id": 10, "status": "FG_SHELF" }
}
```

### 3.2 Monthly Storage Schema (`zlink_monthly_history`)
```json
{
  "2026": {
    "1": 10, "2": 21, "3": 1, "4": 2,
    "5": 4,  "6": 4,  "7": 8, "8": 0,
    "9": 0, "10": 0, "11": 0, "12": 0
  }
}
```

### 3.3 Dynamic SVG Chart Rendering (`js/app.js`)
- Dynamic SVG path calculations based on `zlink_monthly_history`.
- Glowing dots for each month and active highlight for August.

### 3.4 Admin Management & Export
- **Monthly Baseline Editor:** Admin Panel option to edit any month's quantity (Jan-Dec) with full Audit Logging.
- **Reset August Baseline:** 1-Click reset for August cards and counters.
- **Export Monthly Excel Database:** Downloads CSV containing full monthly shipping records for PN 8308859901.
