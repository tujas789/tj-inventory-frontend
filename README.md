# TJ Inventory — Frontend

หน้าเว็บ client ของระบบจัดการสต๊อกน้ำยา (เบิกจ่าย / รับเข้า / สต๊อก / หมดอายุ)
โหลดบนมือถือ/เครื่องสแกน แล้ว `fetch` ไป Apps Script เป็น API

**โครงไฟล์ (T-030):** `index.html` (โครง) · `style.css` (ธีม) · `app-text.js` (ข้อความ UI) · `api.js` (API layer + เดโม) · `app.js` (logic ทุกแท็บ)
⚠️ ลำดับ script สำคัญ (app-text → api → app, ท้าย body) · แก้ css/js ต้อง bump `?v=` ใน index.html

- **Backend:** Google Apps Script Web App (ดู `API_URL` ใน `api.js`)
- **สถาปัตยกรรม:** ADR-0002 (แยก frontend + fetch, ไม่ใช้ HtmlService)
- **โหมดเดโม:** เติม `?demo` ท้าย URL → ใช้ข้อมูลตัวอย่างใน memory (ไม่ยิง server)

> repo นี้ public เพื่อ host บน GitHub Pages — มีแค่ client code (ไม่มีความลับ)
> source เต็มของโปรเจกต์ (docs/gas) เก็บแยกในเครื่อง
