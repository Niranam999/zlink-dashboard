# Z-Link Kanban Realtime Production Dashboard Design Specification

**Date:** 2026-08-05  
**Author:** Antigravity AI (Pair Programming withคุณเอ / วรรธนะ)  
**Company Context:** Aveam (เอเวียม) - Sub-Assembly of Z-Link Products  
**Target Platform:** GitHub Pages (Accessible via Smart TV, PC Monitor, Mobile Smartphones)

---

## 1. Overview & Objectives

ระบบ **Z-Link Kanban Realtime Production Dashboard** ถูกออกแบบมาเพื่อติดตามสถานะการประกอบผลิตภัณฑ์ประเภท **Z-Link** ในโรงงาน Aveam แบบ Real-time ผ่านการ์ดสั่งงาน Kanban จำนวน 10 ใบ (#1 ถึง #10)

### Key Requirements
1. **หน้าจอหลัก (TV Monitor & PC Monitor):** แสดงผล Kanban Board แบบ 5 คอลัมน์ ไหลจากซ้ายไปขวา ตัวหนังสือและสถานะสีคมชัดมองเห็นจากระยะไกลบนจอ TV
2. **การอัปเดตสถานะหน้างาน (Mobile 1-Tap Scan):** พนักงานใช้มือถือสแกน QR Code ประจำการ์ด (#1 - #10) เพื่อกดเปลี่ยนสถานะถัดไปผ่านปุ่ม 1-Tap Action ปุ่มเดียว
3. **ระบบการหมุนรอบการ์ด (Kanban Loop):** 
   - การ์ด #1 ถึง #10 วนลูปจาก `Job Board` -> `WIP Assembly` (สูงสุด 2 งานพร้อมกัน) -> `QA & Packing` -> `FG Shelf` -> `Shipped`
   - เมื่อ Shipping สแกน `Shipped` ระบบจะเก็บบันทึกเพิ่มยอดสะสมจัดส่งประจำเดือน (Monthly Cumulative Shipped) และคืนการ์ดกลับไปยังคอลัมน์ `Job Board` อัตโนมัติ
4. **TV Carousel Auto-Rotation (`tv-carousel.html`):** หน้าเว็บตัวกลางสำหรับเปิดบน TV เพื่อวนสลับระหว่างหน้า **Assembly Progress Daily Report** (โฮสต์บน GitHub Pages) กับหน้า **Z-Link Realtime Dashboard** (แสดงผล 1 นาที) โดยสลับหน้าอย่างนุ่มนวลแบบเรียลไทม์

---

## 2. System Architecture & Tech Stack

```
[ Mobile Smartphone Scanner ] ──(1-Tap Action Update)──┐
                                                      │
[ Assembly Progress Daily Report ] ──┐                ▼
                                    ├──> [ Firebase / Cloud Realtime Sync ]
[ Z-Link Dashboard (index.html) ] ──┤                │
                                    │                ▼
[ TV Carousel (tv-carousel.html) ] ─┴─────> [ TV & PC Screens ]
```

* **Frontend Framework:** Single-Page Web Application (HTML5, Vanilla CSS3 with Glassmorphism Dark Mode Design System, Modern ES6+ JavaScript)
* **Hosting:** GitHub Pages (Static Web Hosting)
* **Realtime State Synchronization:** Cloud Realtime State Sync (Firebase Realtime Database / Supabase Free Tier) ร่วมกับ `BroadcastChannel` และ `localStorage` เพื่อรองรับทั้งการทำงานแบบ LAN และเข้าดูจากภายนอกบริษัทผ่านอินเทอร์เน็ต
* **Device Compatibility:** Smart TV Browsers, Desktop Chrome/Edge, Mobile Safari/Chrome (iOS & Android)

---

## 3. Data Model & State Lifecycle

### 3.1 Card Object Model
มีป้ายการ์ดถาวรทั้งหมด 10 ใบ (`card_id`: 1 ถึง 10)

```json
{
  "card_id": 3,
  "status": "WIP_ASSEMBLY",
  "updated_at": "2026-08-05T20:20:00Z",
  "updated_by": "Assembly Team"
}
```

### 3.2 Status State Machine
| Status Code | Description | Visual Color Badge | Primary Action Button on Mobile |
| :--- | :--- | :--- | :--- |
| `JOB_BOARD` | การ์ดแขวนอยู่ที่บอร์ดหน้าห้องประกอบ รอหยิบไปทำ | ⚪ Grey / Neutral | `[ ▶ เริ่มประกอบ (Move to WIP) ]` |
| `WIP_ASSEMBLY` | อยู่ในห้องประกอบ (จำกัดสูงสุด 2 งานพร้อมกัน) | 🔵 Blue / Neon Cyan | `[ 🔍 ส่งตรวจ QA / แพ็กงาน ]` |
| `QA_PACKING` | ประกอบเสร็จ รอ/กำลังตรวจ QA & แพ็กกล่อง | 🟡 Yellow / Warning | `[ 📦 วางบนชั้น FG Slot #X ]` |
| `FG_SHELF` | ผ่าน QA แพ็กใส่กล่อง วางบนชั้น FG Slot 1-10 | 🟢 Green / Success | `[ 🚚 Shipping จัดส่งสินค้า ]` |
| `SHIPPED` | Shipping จัดส่งสินค้าแล้ว -> คืนการ์ดกลับสู่ `JOB_BOARD` ออโต้ | 🔴 Purple / Shipped | Auto-reset to `JOB_BOARD` + Increment Monthly Shipped Total |

### 3.3 Monthly Cumulative Shipped Counter
* เก็บค่ายอดจัดส่งสะสมประจำเดือน (`monthly_shipped_count`) ในฐานข้อมูล Realtime DB
* รีเซ็ตเป็น 0 อัตโนมัติเมื่อขึ้นเดือนใหม่ (หรือกดรีเซ็ตด้วยตนเองผ่าน Admin Panel)

---

## 4. UI / UX Detailed Specifications

### 4.1 TV & PC Dashboard (`index.html`)
* **Theme:** Sleek Dark Mode (Background: `#0f172a`, Glassmorphic Cards: `rgba(30, 41, 59, 0.7)`, Neon Accent Borders)
* **Header Area:**
  * System Title: `Z-LINK ASSEMBLY REALTIME DASHBOARD`
  * Live Clock & Date Indicator
  * KPI Badges:
    * 📦 **FG Ready:** `X / 10` Boxes
    * ⚙️ **Active WIP:** `Y / 2` Jobs
    * 🚚 **Monthly Cumulative Shipped:** `Z` Boxes
* **Main Kanban Board (5 Columns Layout):**
  1. **📋 Job Board (บอร์ดแขวนรอประกอบ):** แสดง Card #1 - #10 ที่ยังไม่ได้หยิบไปประกอบ
  2. **⚙️ WIP Assembly (กำลังประกอบ):** คอลัมน์เน้นพิเศษ รองรับสูงสุด 2 งาน
  3. **🔍 QA & Packing (ตรวจเช็ค QA):** งานที่รอ/กำลังตรวจสอบ
  4. **📦 FG Shelf (ชั้นวางสินค้า 10 ช่อง):** แสดง Layout 10 ช่อง (Grid 1-10) สอดคล้องกับชั้นวางจริง
  5. **🚚 Shipped (จัดส่งแล้ว):** แสดง Feed ประวัติการส่งล่าสุด + ยอดรวมสะสมประจำเดือน

### 4.2 Mobile Scanner UI (`scan.html`)
* **URL Format:** `scan.html?card=3` หรือเปิดสแกนผ่านกล้องในมือถือ
* **Display Elements:**
  * หมายเลขการ์ดตัวใหญ่ชัดเจน: **CARD #3**
  * สถานะปัจจุบันของการ์ด
  * ปุ่มกดเปลี่ยนสถานะใหญ่สะดุดตา (1-Tap Action Button)
  * ปุ่มสำรอง (Dropdown / Quick Card Selector) หากต้องการสลับเลือกการ์ดใบอื่น

### 4.3 TV Carousel Wrapper Page (`tv-carousel.html`)
* หน้าต่างควบคุมการแสดงผลบน TV Monitor
* ฝัง `<iframe>` 2 ชุด:
  - Frame 1: **Assembly Progress Daily Report** (URL บน GitHub Pages)
  - Frame 2: **Z-Link Realtime Dashboard**
* ตั้งเวลาสลับหน้าอัตโนมัติ (Default: Daily Report จนครบรอบ -> สลับโชว์ Z-Link 1 นาที -> วนสลับกลับ)
* Transition การสลับหน้าจางเข้า-ออก (Smooth Cross-fade Animation)

---

## 5. Verification & Testing Plan

1. **Mobile Scan & 1-Tap Action Verification:**
   - ทดสอบสแกน QR Code ของการ์ดแต่ละใบ (#1 ถึง #10)
   - ยืนยันว่าเมื่อกดปุ่มบนมือถือ สถานะเปลี่ยนถูกต้องและอัปเดตไปที่ Dashboard ภายใน 1 วินาที
2. **Limit Rules Verification:**
   - ทดสอบหยิบงานเข้า WIP เมื่อมี WIP ครบ 2 งานแล้ว
3. **FG Shelf & Shipping Cycle Loop Verification:**
   - ยืนยันว่าเมื่อสแกน `Shipped` การ์ดใบนั้นถูกรีเซ็ตกลับไปที่คอลัมน์ `Job Board` และยอดจัดส่งสะสมประจำเดือนเพิ่มขึ้น 1
4. **TV Carousel Auto-Rotation Verification:**
   - เปิดหน้า `tv-carousel.html` บนเบราว์เซอร์ ทดสอบการสลับหน้าระหว่าง Daily Report กับ Z-Link Dashboard ว่าทำงานนุ่มนวลตลอดการวนลูป
