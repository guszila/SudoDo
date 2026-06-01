# SudoDo - Modern Calendar & Task Management 🗓️✨

SudoDo เป็นแอปพลิเคชันจัดการตารางเวลาและกิจกรรมที่ออกแบบมาด้วยดีไซน์ **Liquid Glassmorphism** เน้นความสวยงาม ทันสมัย ใช้งานง่าย และมีความเป็น Minimalist ในตัว 

แอปนี้ไม่ได้มีแค่ฟังก์ชันปฏิทินธรรมดา แต่ยังมาพร้อมกับการติดตามรายได้จากงานพาร์ทไทม์ และคำนวณประกันสังคม เหมาะสำหรับฟรีแลนซ์ หรือผู้ที่ต้องการจัดการชีวิตให้เป็นระเบียบในแอปเดียว!

---

## 🌟 ฟีเจอร์หลัก (Key Features)
- **Interactive Calendar:** ปฏิทินแสดงงานและกิจกรรม พร้อมสีสันแยกวันหยุด/วันหยุดสุดสัปดาห์อย่างชัดเจน
- **Task Management:** เพิ่ม ลบ แก้ไข งานได้ง่ายๆ (แบ่งความสำคัญ สูง/กลาง/ต่ำ)
- **Part-Time Tracking:** ระบบบันทึกงานพาร์ทไทม์ พร้อมติดตามรายได้ (รายชั่วโมง/รายวัน)
- **Income History:** กราฟสถิติสรุปรายได้ ย้อนดูประวัติการทำงานได้
- **Social Security Calculator:** หน้าคำนวณประกันสังคมแบบง่าย
- **Multi-Theme & Dark Mode:** รองรับทั้งโหมดสว่างและโหมดมืด พร้อมสีสันธีมที่เลือกเปลี่ยนได้
- **Multi-Language:** รองรับภาษาไทยและภาษาอังกฤษ 🇹🇭 🇬🇧
- **Cloud Sync:** บันทึกข้อมูลขึ้นคลาวด์แบบเรียลไทม์ผ่าน Firebase

---

## 🚀 วิธีการใช้งานและการติดตั้ง (How to run)

### ข้อกำหนดเบื้องต้น (Prerequisites)
- Node.js (เวอร์ชัน 18 ขึ้นไป)
- บัญชี Firebase สำหรับใช้งาน Database และ Authentication

### ขั้นตอนการติดตั้ง
1. โคลนโปรเจกต์ลงมาที่เครื่อง
   ```bash
   git clone <repository-url>
   cd SudoDo
   ```

2. ติดตั้ง Dependencies ทั้งหมด
   ```bash
   npm install
   ```

3. ตั้งค่า Firebase (สร้างไฟล์ `.env` ที่ root ของโปรเจกต์)
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. รันเซิร์ฟเวอร์สำหรับพัฒนา (Development Server)
   ```bash
   npm run dev
   ```
   > จากนั้นเปิดเบราว์เซอร์ไปที่ `http://localhost:5173`

5. สำหรับการ Build ขึ้น Production
   ```bash
   npm run build
   ```

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack & Libraries)

โปรเจกต์นี้ถูกสร้างขึ้นด้วยเทคโนโลยีล่าสุด เพื่อให้ได้แอปพลิเคชันที่รวดเร็ว ลื่นไหล และสวยงาม:

### Core Frameworks
- **[React 19](https://react.dev/):** ไลบรารีหลักสำหรับการสร้าง User Interface
- **[Vite 8](https://vitejs.dev/):** เครื่องมือ Build tool ที่รวดเร็วสุดๆ สำหรับโปรเจกต์ React
- **[Capacitor 8](https://capacitorjs.com/):** แพลตฟอร์มสำหรับแปลงเว็บให้กลายเป็น Mobile App (iOS / Android)

### Styling & UI
- **[Tailwind CSS 4](https://tailwindcss.com/):** Utility-first CSS framework สำหรับจัดการความสวยงามทั้งหมด
- **[Framer Motion](https://www.framer.com/motion/):** ใช้สร้าง Animation และ Transition ระดับเทพ ลื่นไหลสมูทสุดๆ
- **[Lucide React](https://lucide.dev/):** ชุดไอคอนสวยๆ สไตล์ Minimal

### Data & State Management
- **[Firebase 12](https://firebase.google.com/):** จัดการระบบล็อกอิน (Authentication) และฐานข้อมูล (Firestore Database) แบบเรียลไทม์
- **React Context API:** ใช้จัดการ State การตั้งค่าต่างๆ ทั่วทั้งแอป เช่น ธีม, ภาษา และข้อมูลงาน

### Core Components / Utils
- **[React Big Calendar](https://github.com/jquense/react-big-calendar):** ปฏิทินหลักของแอปพลิเคชัน (Customized แบบจัดเต็ม)
- **[Date-fns](https://date-fns.org/):** จัดการฟังก์ชันที่เกี่ยวกับวันที่และเวลาทั้งหมด
- **[Recharts](https://recharts.org/):** สร้างกราฟและแผนภูมิสวยๆ ในหน้าประวัติรายได้
- **Vite PWA:** รองรับการติดตั้งเป็นแอปพลิเคชันบนมือถือและคอมพิวเตอร์ (Progressive Web App)

---

> **Note:** โปรเจกต์นี้ให้ความสำคัญกับ UI/UX อย่างมาก ทุกปุ่มและทุกหน้าต่างถูกออกแบบด้วยแนวคิด Liquid Glass & Neon Glow เพื่อประสบการณ์การใช้งานที่แปลกใหม่ไม่น่าเบื่อ!
