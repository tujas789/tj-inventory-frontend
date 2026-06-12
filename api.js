/* api.js — helpers กลาง ($ esc) + state + API layer (ADR-0002) + demo dispatcher (แตกจาก index.html — T-030) */
/* ============================================================ */
const $ = id => document.getElementById(id);
// [T-020] escape ทุกค่าจากผู้ใช้/ชีตก่อนฉีดเข้า innerHTML (ชื่อสินค้า/ล็อต = input คน → กัน XSS)
const esc = s => String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let CURRENT = null;
const recent = [];
let busy = false;

/* ============================================================
   API LAYER — frontend แยกจาก Apps Script (ADR-0002)
   ★ ไฟล์นี้เปิดตรงๆ (file://) หรือ host ก็ได้ แล้ว fetch ไป Apps Script เป็น API
   เหตุผลที่ไม่ใช้ HtmlService + google.script.run: HtmlService เสิร์ฟใน sandbox
   iframe → สั่งพิมพ์ฉลาก @page ไม่ทำงาน (หมุน 90°) — ดู JOURNAL 2026-06-03

   ▼▼▼ วาง URL /exec จริงตรงนี้ (Apps Script → Deploy → Web app → /exec) ▼▼▼ */
const API_URL = 'https://script.google.com/macros/s/AKfycbxpmNPzFf3s4CGMdXlEUpk_b0L6tkYxEg8sSYl7TR5yVCT16w5yCH2CXDPogF-DpjJZ/exec';
/* ▲▲▲ ────────────────────────────────────────────────────────── ▲▲▲
   โหมดเดโม: เติม ?demo ท้าย URL ตอนเปิดไฟล์ → ใช้ข้อมูลตัวอย่างใน memory (ไม่ยิง server)
   ============================================================ */
const IS_DEMO = /[?&]demo(=|&|$)/.test(location.search) || /PASTE_EXEC_URL/.test(API_URL);

// GET = อ่าน (action + params ผ่าน query) | POST = เขียน (JSON body)
// ★ ไม่ตั้ง Content-Type เอง → body กลายเป็น text/plain → เป็น "simple request" → ไม่มี CORS preflight
//   (เคล็ดลับนี้คือกุญแจให้ fetch คุย Apps Script ได้โดยไม่ติด CORS — ดู BactBud)
function apiGet(action, params){
  if(IS_DEMO) return DEMO.call(action, params||{});
  const q=new URLSearchParams(Object.assign({action}, params||{}));
  return fetch(API_URL+'?'+q.toString()).then(r=>r.json());
}
function apiPost(payload){
  if(IS_DEMO) return DEMO.call(payload.action, payload);
  // [T-014] แนบ session token อัตโนมัติ + token ตาย (auth:false) → เด้งกลับหน้า login จุดเดียว
  if(CURRENT && CURRENT.token && !payload.token) payload.token = CURRENT.token;
  return fetch(API_URL, {method:'POST', body:JSON.stringify(payload)}).then(r=>r.json())
    .then(res=>{ if(res && res.auth===false) forceRelogin(); return res; });
}

/* ===== DEMO dispatcher (ทำงานเมื่อ IS_DEMO) — ข้อมูลตัวอย่างปลอมใน memory =====
   คืนค่าเป็น Promise เหมือน fetch จริง → call site ใช้ .then()/.catch() ได้เหมือนกัน */
const DEMO = (function(){
  const today = new Date();
  const pad = n => String(n).padStart(2,'0');
  const pad6 = n => String(n).padStart(6,'0');
  const ymd = d => d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  const addDays = n => { const d=new Date(today); d.setDate(d.getDate()+n); return ymd(d); };
  const daysBetween = (a,b)=> Math.round((Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/86400000);

  const users = [
    {user_id:'admin',   display_name:'ผู้ดูแลระบบ (เดโม)', role:'admin'},
    {user_id:'somchai', display_name:'สมชาย คลัง (เดโม)',  role:'staff'},
  ];
  const products = [
    {product_id:'P0001', name:'น้ำยาล้างคราบ A', vendor_barcode:'8850123456789', unit_of_measure:'ขวด'},
    {product_id:'P0002', name:'น้ำยาเคลือบเงา B', vendor_barcode:'8850987654321', unit_of_measure:'แกลลอน'},
  ];
  const lots = [
    {lot_id:'L000012', product_id:'P0001', lot_no:'LOT-2026-A', expiry_date:addDays(10)},   // ใกล้หมด
    {lot_id:'L000005', product_id:'P0002', lot_no:'LOT-2025-X', expiry_date:addDays(-13)},  // หมดอายุแล้ว
    {lot_id:'L000020', product_id:'P0001', lot_no:'LOT-2027-B', expiry_date:addDays(300)},  // ยังอีกนาน (ไม่เตือน)
  ];
  const units = [];
  const seed = (lot_id, product_id, n, start) => {
    for(let i=0;i<n;i++){ units.push({unit_barcode:String(start+i).padStart(8,'0'), lot_id, product_id, status:'in_stock'}); }
  };
  seed('L000012','P0001',5,1); seed('L000005','P0002',4,101); seed('L000020','P0001',8,201);
  let seqUnit=900, seqTxn=50, seqProd=2, seqLot=20;
  const nameOf  = pid => (products.find(p=>p.product_id===pid)||{}).name || pid;
  const lotNoOf = lid => (lots.find(l=>l.lot_id===lid)||{}).lot_no || lid;

  // [T-033] ประวัติการปริ้นตัวอย่าง (ลองพิมพ์ซ้ำได้)
  const printJobs=[
    {job_id:'PJ000001', lot_id:'L000012', product_id:'P0001', qty:3,
     unit_barcodes:['00000001','00000002','00000003'],
     received_at:ymd(today)+' 09:00', created_by:'somchai'},
    {job_id:'PJ000002', lot_id:'L000020', product_id:'P0001', qty:2,
     unit_barcodes:['00000201','00000202'],
     received_at:addDays(-1)+' 15:00', created_by:'somchai'},
  ];
  let seqJob=2;

  const handlers = {
    getUsers(){ return {ok:true, users:users.map(u=>({...u}))}; },
    verifyPin(p){
      const u=users.find(x=>x.user_id===(p&&p.user_id));   // เดโม: PIN อะไรก็ได้
      return u ? {ok:true, user_id:u.user_id, display_name:u.display_name, role:u.role,
                  token:'DEMO-TOKEN', expires:Date.now()+86400000}   // [T-014] ให้ flow เหมือนจริง
               : {ok:false, error:'ไม่พบผู้ใช้ (เดโม)'};
    },
    checkToken(){ return {ok:true}; },   // [T-014]
    logout(){ return {ok:true}; },       // [T-014]
    getProducts(){ return {ok:true, products:products.map(p=>({...p}))}; },
    lookupByVendorBarcode(p){
      const found=products.filter(x=>x.vendor_barcode===String(p.vendor_barcode).trim());
      return {ok:true, products:found.map(x=>({...x}))};
    },
    receiveForUI(p){
      let pid=p.product_id, pname;
      if(!pid){
        if(!p.new_product||!p.new_product.name) return {ok:false,error:'กรุณาเลือกชนิด (เดโม)'};
        pid='P'+String(++seqProd).padStart(4,'0');
        products.push({product_id:pid, name:p.new_product.name, vendor_barcode:p.new_product.vendor_barcode||'', unit_of_measure:p.new_product.unit_of_measure||''});
        pname=p.new_product.name;
      } else pname=nameOf(pid);
      const lid='L'+String(++seqLot).padStart(6,'0');
      lots.push({lot_id:lid, product_id:pid, lot_no:p.lot_no||'', expiry_date:p.expiry_date});
      const codes=[];
      for(let i=0;i<Number(p.qty);i++){ const c=String(++seqUnit).padStart(8,'0');
        units.push({unit_barcode:c, lot_id:lid, product_id:pid, status:'in_stock'}); codes.push(c); }
      // [T-033] รับเข้า = บันทึกประวัติการปริ้นอัตโนมัติ (เหมือน backend จริง)
      const now=new Date();
      const recvAt=ymd(today)+' '+String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
      const jid='PJ'+String(++seqJob).padStart(6,'0');
      printJobs.push({job_id:jid, lot_id:lid, product_id:pid, qty:codes.length, unit_barcodes:codes.slice(),
        received_at:recvAt, created_by:p.user||'demo'});
      return {ok:true, product_id:pid, product_name:pname, lot_id:lid, unit_barcodes:codes,
        txn_id:'T'+String(++seqTxn).padStart(8,'0'), received_at:recvAt+':00+07:00', print_job_id:jid};
    },
    listPrintJobs(){   // [T-033] ประวัติใหม่→เก่า + join ชื่อ/วันหมดอายุเหมือน backend
      const expOf=lid=>(lots.find(l=>l.lot_id===lid)||{}).expiry_date||'';
      const jobs=printJobs.map(j=>({...j, unit_barcodes:j.unit_barcodes.slice(), product_name:nameOf(j.product_id), lot_no:lotNoOf(j.lot_id), expiry_date:expOf(j.lot_id)}))
        .sort((a,b)=>a.received_at>b.received_at?-1:1);
      return {ok:true, jobs:jobs.slice(0,50), total:jobs.length};
    },
    issueForUI(p){
      const u=units.find(x=>x.unit_barcode===String(p.unit_barcode).trim());
      if(!u) return {ok:false,error:'ไม่พบ barcode นี้ (เดโม)'};
      if(u.status!=='in_stock') return {ok:false,error:'ถูกเบิกไปแล้ว (เดโม)'};
      u.status='issued';
      return {ok:true, unit_barcode:u.unit_barcode, product_id:u.product_id, product_name:nameOf(u.product_id), lot_id:u.lot_id, lot_no:lotNoOf(u.lot_id), txn_id:'T-DEMO'};
    },
    stockByProduct(){
      const counts={}; let total=0;
      units.forEach(u=>{ if(u.status==='in_stock'){ counts[u.product_id]=(counts[u.product_id]||0)+1; total++; } });
      const rows=products.map(p=>({product_id:p.product_id, name:p.name, in_stock:counts[p.product_id]||0}));
      return {ok:true, rows, total};
    },
    stockByLot(p){
      const pid=String(p.product_id);
      const counts={};
      units.forEach(u=>{ if(u.product_id===pid && u.status==='in_stock') counts[u.lot_id]=(counts[u.lot_id]||0)+1; });
      const ls=lots.filter(l=>l.product_id===pid).map(l=>({lot_id:l.lot_id, lot_no:l.lot_no, expiry_date:l.expiry_date, in_stock:counts[l.lot_id]||0}));
      ls.sort((a,b)=>(a.expiry_date||'')<(b.expiry_date||'')?-1:1);   // FEFO
      return {ok:true, product_id:pid, warn_days:60, lots:ls, total:ls.reduce((s,l)=>s+l.in_stock,0)};  // [T-022] เดโม = Config default
    },
    getUnitsByLot(p){   // [T-018] รายชิ้นในล็อต (เดโม: ชิ้นที่เบิกแล้วใส่ user/วันที่จำลอง)
      const lid=String(p.lot_id);
      const us=units.filter(u=>u.lot_id===lid).map(u=>({
        unit_barcode:u.unit_barcode, status:u.status, received_at:'',
        issued_at:u.status==='issued'?ymd(today)+' 09:00':'',
        issued_by:u.status==='issued'?'demo':'',
      }));
      us.sort((a,b)=> a.status!==b.status ? (a.status==='in_stock'?-1:1) : (a.unit_barcode<b.unit_barcode?-1:1));
      return {ok:true, lot_id:lid, in_stock:us.filter(u=>u.status==='in_stock').length, units:us};
    },
    expiringLots(p){
      const warn=(p&&p.warn_days!=null&&p.warn_days!=='')?Number(p.warn_days):60;
      const todayStr=ymd(today);
      const counts={}; units.forEach(u=>{ if(u.status==='in_stock') counts[u.lot_id]=(counts[u.lot_id]||0)+1; });
      const rows=[]; let ec=0,wc=0;
      lots.forEach(l=>{
        const inStock=counts[l.lot_id]||0; if(inStock<=0) return;
        const dl=daysBetween(todayStr, l.expiry_date); if(dl>warn) return;
        const level=dl<0?'expired':'warn'; if(level==='expired')ec++; else wc++;
        rows.push({lot_id:l.lot_id, lot_no:l.lot_no, product_id:l.product_id, product_name:nameOf(l.product_id), expiry_date:l.expiry_date, in_stock:inStock, days_left:dl, level});
      });
      rows.sort((a,b)=>a.days_left-b.days_left);
      return {ok:true, today:todayStr, warn_days:warn, rows, expired_count:ec, warn_count:wc};
    },
  };

  // ป้ายมุมจอบอกว่าอยู่โหมดเดโม (กันสับสนกับของจริง)
  if(IS_DEMO){
    document.addEventListener('DOMContentLoaded', ()=>{
      const tag=document.createElement('div');
      tag.textContent='🧪 โหมดทดลอง — ข้อมูลตัวอย่าง (ยิงเบิกลอง U-DEMO-000001)';
      tag.style.cssText='position:fixed;left:8px;bottom:8px;z-index:200;background:#f6465d;color:#fff;font-size:11px;font-weight:700;padding:5px 11px;border-radius:999px;opacity:.92;box-shadow:0 2px 8px rgba(0,0,0,.4)';
      document.body.appendChild(tag);
    });
  }

  return { call(action, params){
    return new Promise((resolve,reject)=>{
      setTimeout(()=>{                       // จำลอง latency เล็กน้อย
        const h=handlers[action];
        if(!h){ reject(new Error('demo: ไม่รู้จัก action '+action)); return; }
        try{ resolve(h(params||{})); }catch(e){ reject(e); }
      }, 150);
    });
  }};
})();
