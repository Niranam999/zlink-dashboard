# TV Carousel Auto-Rotation Integration Design Specification

**Date:** 2026-08-06  
**Author:** Antigravity AI (Pair Programming withคุณเอ / วรรธนะ)  
**Company Context:** Aveam (เอเวียม) - Sub-Assembly of Z-Link Products  
**Target Platform:** GitHub Pages (Accessible via Smart TV, PC Monitor, Mobile Smartphones)

---

## 1. Overview & Objectives

ระบบ **TV Display Auto-Rotation Carousel** ถูกออกแบบมาเพื่อเปิดแสดงผลบนหน้าจอทีวี (Smart TV) หรือจอมอนิเตอร์ในโรงงาน Aveam แบบต่อเนื่องตลอดวัน โดยทำหน้าที่วนสลับระหว่าง 2 แดชบอร์ดสำคัญ:
1. **Assembly Progress Daily Report:** `https://niranam999.github.io/aveam-daily-assembly-dashboard/dashboard.html` (แสดง 180 วินาที / 3 นาที)
2. **Z-Link Realtime Kanban Dashboard:** `index.html` (แสดง 60 วินาที / 1 นาที)

---

## 2. Technical Architecture & Integration

```
                            ┌────────────────────────────────────────────────────────┐
                            │                    TV CAROUSEL CONTROLLER              │
                            │                      (tv-carousel.html)                │
                            └───────────────────────────┬────────────────────────────┘
                                                        │
                         ┌──────────────────────────────┴──────────────────────────────┐
                         ▼                                                            ▼
    ┌────────────────────────────────────────┐                  ┌────────────────────────────────────────┐
    │              FRAME 0                   │                  │                FRAME 1                 │
    │    Assembly Progress Daily Report      │                  │    Z-Link Realtime Kanban Dashboard    │
    │  (External GitHub Pages Live Stream)   │                  │             (index.html)               │
    └────────────────────────────────────────┘                  └────────────────────────────────────────┘
```

### 2.1 Smooth Frame Switcher (Dual iframe Overlay)
* ใช้โครงสร้าง `iframe` คู่ 2 เฟรม ซ้อนทับกัน (Absolute Position Overlay)
* โหลดข้อมูลหน้าเว็บเตรียมไว้ล่วงหน้า (Pre-loaded) ทำให้เมื่อถึงเวลานับถอยหลังสลับหน้า จะปรับคลาส `.active` สลับค่า `opacity` และ `visibility` ได้อย่างนุ่มนวล โดยไม่มีอาการกระพริบหรือหน้าจอขาว (Zero White Flash)

### 2.2 Navigation Integration
* เพิ่มปุ่ม **`📺 เปิดโหมด TV แสดงผลวนสลับ`** ที่แถบ Header Control Panel ของ [`index.html`](file:///d:/AVEAM/Antigravity2/Z-LINK%20dashboard/index.html)
* ปุ่มกดเปิดลิงก์ไปยัง `tv-carousel.html` ในแท็บใหม่ พร้อมรองรับคำสั่ง Fullscreen Mode บนเบราว์เซอร์

---

## 3. Configuration & Timing Specifications

| Parameter | Configuration Value | Description |
| :--- | :--- | :--- |
| `DAILY_REPORT_URL` | `https://niranam999.github.io/aveam-daily-assembly-dashboard/dashboard.html` | URL สำหรับดึงหน้า Daily Report มาแสดงใน Frame 0 |
| `DAILY_REPORT_DURATION` | `180` (seconds) | เวลาแสดงผลหน้า Daily Assembly Report (3 นาที) |
| `ZLINK_DURATION` | `60` (seconds) | เวลาแสดงผลหน้า Z-Link Kanban Dashboard (1 นาที) |
| `TRANSITION_EFFECT` | CSS `fade` (0.6s ease-in-out) | เอฟเฟกต์การจางเข้า-ออกขณะสลับเฟรม |

---

## 4. File Modification Plan

1. **[`tv-carousel.html`](file:///d:/AVEAM/Antigravity2/Z-LINK%20dashboard/tv-carousel.html)**
   - ตั้งค่า `src` ของ `frameDailyReport` เป็น `https://niranam999.github.io/aveam-daily-assembly-dashboard/dashboard.html`
   - ปรับปรุงโครงสร้าง HTML & Metadata ให้รองรับการทำงานอัตโนมัติบน Smart TV Browsers

2. **[`js/tv-carousel.js`](file:///d:/AVEAM/Antigravity2/Z-LINK%20dashboard/js/tv-carousel.js)**
   - อัปเดต `CONFIG.DAILY_REPORT_URL` ด้วย URL จริง
   - ปรับปรุงฟังก์ชัน `switchFrame()` และ `tick()` ให้มี Error Handling กรณี iframe โหลดไม่สำเร็จหรือตัดการเชื่อมต่อ

3. **[`index.html`](file:///d:/AVEAM/Antigravity2/Z-LINK%20dashboard/index.html)**
   - เพิ่มปุ่มกด **`📺 TV Carousel Mode`** ที่ส่วนหัว Header (สไตล์ Glassmorphism Gradient Button) เพื่อให้ผู้ใช้สามารถคลิกเปิด TV Mode ได้จากหน้าหลักทันที

---

## 5. Verification & Acceptance Criteria

1. เปิด `tv-carousel.html` แล้วหน้า **Daily Assembly Dashboard** ปรากฏเรียบร้อยในเฟรมแรก
2. แถบ Progress bar ด้านบนวิ่งนับถอยหลัง 180 วินาที จากนั้นสลับไปหน้า **Z-Link Realtime Dashboard** เป็นเวลา 60 วินาทีแบบเรียลไทม์
3. การสลับหน้าจอราบรื่น ไม่มีสะดุดหรือหน้าขาว
4. ปุ่มเปิด TV Mode บนหน้า `index.html` กดแล้วเปิด `tv-carousel.html` ได้ถูกต้อง
