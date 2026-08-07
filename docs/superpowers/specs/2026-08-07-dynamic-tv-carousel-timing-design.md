# Dynamic TV Carousel Timing Design Specification

**Date:** 2026-08-07  
**Author:** Antigravity AI (Pair Programming withคุณเอ / วรรธนะ)  
**Company Context:** Aveam (เอเวียม) - Sub-Assembly Operations  
**Target Platform:** GitHub Pages (TV Display Mode)

---

## 1. Overview & Business Rationale

เดิมทีระบบ **TV Display Auto-Rotation Carousel** (`tv-carousel.html`) กำหนดเวลาแสดงผลแบบตายตัว (Fixed Duration: Daily Report 180s, Z-Link 60s) 

แต่เนื่องจากใน **Daily Assembly Report Dashboard** จะมีสไลด์หมุนวนแสดงความคืบหน้าของงานประกอบแต่ละชิ้นที่อยู่ในสถานะ **`In Progress`** สไลด์ละ **15 วินาที**

ดังนั้น เพื่อให้หน้า Daily Report แสดงผลวนจนครบรอบพอดีก่อนที่จะสลับไปหน้า Z-Link Dashboard จึงต้องเปลี่ยนระบบเป็น **Dynamic Timing Calculation**:
- **เวลาแสดง Daily Assembly Report:** `(จำนวนงาน In Progress) × 15 วินาที` (ขั้นต่ำ 30 วินาที)
- **เวลาแสดง Z-Link Realtime Dashboard:** `30 วินาที` คงที่

---

## 2. Dynamic Calculation Formula & Rules

$$\text{Daily Report Duration} = \max(30, \text{In-Progress Jobs Count} \times 15 \text{ seconds})$$
$$\text{Z-Link Duration} = 30 \text{ seconds (Fixed)}$$

### Example Scenarios:
1. **มีงาน In Progress 8 งาน:** 
   - Daily Report = $8 \times 15 = 120$ วินาที (2 นาที)
   - Z-Link = 30 วินาที
   - รวม 1 ลูปใหญ่ = 150 วินาที (2.5 นาที)

2. **มีงาน In Progress 4 งาน:**
   - Daily Report = $4 \times 15 = 60$ วินาที (1 นาที)
   - Z-Link = 30 วินาที

3. **ไม่มีงาน In Progress (0 งาน) หรือมี 1 งาน:**
   - Daily Report = 30 วินาที (ขั้นต่ำ Safe Fallback)
   - Z-Link = 30 วินาที

---

## 3. Technical Data Sync Architecture

```
[ Daily Assembly Report ] ──(postMessage / projects_data.json)──► [ tv-carousel.js ]
                                                                       │
                                                                       ▼
                                                       Dynamic Timer Calculation:
                                                       - Daily = (In Progress Jobs * 15s)
                                                       - Z-Link = 30s
```

### Data Fetching & Sync Mechanism
1. **Primary Sync (JSON Data Fetching & postMessage Listener):**
   - `js/tv-carousel.js` จะดึงข้อมูล `projects_data.json` หรือรับสัญญาณ `window.postMessage` จากหน้า Daily Report
   - นับจำนวน Object ที่มี `status === 'IN_PROGRESS'` หรือ `progress < 100`
2. **Real-time Re-calculation:**
   - เมื่อสลับกลับมาที่หน้า Daily Report ในแต่ละรอบ `js/tv-carousel.js` จะคำนวณนับจำนวนงานใหม่ทุกครั้ง ทำให้ระยะเวลาปรับเปลี่ยนตามการอัปเดตงานจริงหน้างาน

---

## 4. File Modification Plan

1. **[`js/tv-carousel.js`](file:///d:/AVEAM/Antigravity2/Z-LINK%20dashboard/js/tv-carousel.js)**
   - เพิ่มฟังก์ชัน `fetchInProgressJobCount()` เพื่อดึงและนับจำนวนงานที่กำลังประกอบ
   - อัปเดตฟังก์ชัน `switchFrame()` ให้คำนวณ `secondsRemaining` แบบไดนามิกตามสูตร `(count * 15s)`
   - ปรับ `ZLINK_DURATION` เป็น `30` วินาที
   - เพิ่ม Listener รับ `postMessage` จากเฟรมลูก

2. **[`tv-carousel.html`](file:///d:/AVEAM/Antigravity2/Z-LINK%20dashboard/tv-carousel.html)**
   - ปรับป้าย Badge แสดงข้อความจำนวนงาน In-Progress เช่น `📺 TV Display: Daily Report (8 งาน - 120s)` เพื่อให้ทีมงานบน Shop Floor ทราบจำนวนงานได้ชัดเจน

---

## 5. Verification & Acceptance Criteria

1. ทดสอบเมื่อมีงาน In Progress 8 งาน -> Daily Report แสดงผล 120 วินาที แล้วสลับไป Z-Link 30 วินาที
2. ปรับเปลี่ยนจำนวนงาน In Progress -> เวลาในรอบถัดไปปรับตามสูตร (งาน × 15s) โดยอัตโนมัติ
3. แสดงผลราบรื่น ป้าย Badge แสดงจำนวนงานและเวลานับถอยหลังตรงกับความเป็นจริง
