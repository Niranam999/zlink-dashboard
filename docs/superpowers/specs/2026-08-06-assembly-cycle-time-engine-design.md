# Design Specification: Assembly Cycle Time & Standard Time Analytics Engine

**Date:** 2026-08-06  
**Target Standard Time (ST):** `8.0 Hours / Box` (480 minutes per box)  
**Standard:** ISO 9001:2015 Process Capability, Cycle Time Analysis & Line Balancing  

---

## 1. Overview & Objectives
To monitor assembly line stability, evaluate operator productivity, and establish the true empirical Standard Time (ST) for Z-Link module assembly, this feature implements an automated background timestamp tracking engine.

The engine measures exact elapsed time between receiving a job at **WIP_ASSEMBLY** (`Start Time`) and handing off the completed assembly to **QA_PACKING** (`End Time`).

---

## 2. Calculation Formulas & Indicators

### 2.1 Cycle Time & Man-Hours Formulas
$$\text{Duration (Minutes)} = \frac{\text{Timestamp}_{\text{QA\_PACKING}} - \text{Timestamp}_{\text{WIP\_ASSEMBLY}}}{60,000}$$

$$\text{Actual Duration (Hours)} = \frac{\text{Duration (Minutes)}}{60}$$

$$\text{Total Man-Hours} = \text{Actual Duration (Hours)} \times \text{Operator Count (Default: 2 Persons)}$$

### 2.2 Standard Time Performance Benchmark (8.0 Hours Target)
- **🟢 On Target (`<= 8.0` Hours):** Assembly completed within standard time allocation.
- **🔴 Over Target (`> 8.0` Hours):** Assembly exceeded standard time allocation (displays variance `+X.X hrs`).

---

## 3. Storage Schema (`zlink_assembly_cycle_logs`)

Stored in `localStorage` and synchronized via `BroadcastChannel`:
```json
{
  "log_id": "CYC_1722927000123",
  "card_id": 1,
  "wip_start_time": "2026-08-06T08:00:00.000Z",
  "qa_end_time": "2026-08-06T15:30:00.000Z",
  "duration_minutes": 450,
  "duration_hours": 7.50,
  "target_hours": 8.0,
  "variance_hours": -0.50,
  "status_benchmark": "ON_TARGET",
  "operator_count": 2,
  "man_hours": 15.0,
  "recorded_date": "2026-08-06"
}
```

---

## 4. State Engine API (`js/firebase-config.js`)
- `getAssemblyCycleLogs()`: Retrieves all recorded assembly cycle logs.
- `recordWipStartTime(cardId)`: Sets start timestamp on card when entering `WIP_ASSEMBLY`.
- `recordQaCompletion(cardId)`: Computes cycle time, logs record, and evaluates 8.0-hour benchmark when entering `QA_PACKING`.
- `getAssemblyAnalytics()`: Computes `avgHours`, `minHours`, `maxHours`, `totalCompleted`, `onTimeRate`.
- `exportAssemblyCycleExcel()`: Downloads UTF-8 BOM CSV containing complete cycle time logs for Excel analysis.

---

## 5. UI Components & Analytics (`index.html` & `app.js`)
1. **Admin Control Panel Tab 3 (⏱️ Cycle Time Analytics):**
   - KPI metric cards: Target ST (`8.0 ชม.`), Actual Avg (`X.X ชม.`), Min/Max (`X.X / X.X ชม.`), Total Completed Boxes.
   - Realtime table showing past completed assembly cycles with performance badges.
   - Download Button: `📊 Export Assembly Cycle Time (CSV/Excel)`.
2. **Card WIP Timestamp Tooltip/Badge:**
   - Displays real-time elapsed WIP assembly time on active WIP cards (e.g. `⏱️ ประกอบไปแล้ว: 3 ชม. 15 นาที`).
