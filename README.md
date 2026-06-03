# TJ Inventory — Frontend

หน้าเว็บ client ของระบบจัดการสต๊อกน้ำยา (เบิกจ่าย / รับเข้า / หมดอายุ)
ไฟล์เดียวจบ (`index.html`) — โหลดบนมือถือ/เครื่องสแกน แล้ว `fetch` ไป Apps Script เป็น API

- **Backend:** Google Apps Script Web App (ดู `API_URL` ใน `index.html`)
- **สถาปัตยกรรม:** ADR-0002 (แยก frontend + fetch, ไม่ใช้ HtmlService)
- **โหมดเดโม:** เติม `?demo` ท้าย URL → ใช้ข้อมูลตัวอย่างใน memory (ไม่ยิง server)

> repo นี้ public เพื่อ host บน GitHub Pages — มีแค่ client code (ไม่มีความลับ)
> source เต็มของโปรเจกต์ (docs/gas) เก็บแยกในเครื่อง
