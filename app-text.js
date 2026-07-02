/* app-text.js — APP_TEXT + t()/tf()/applyAppText() (แตกจาก index.html — T-030) */
/* ============================================================
   APP_TEXT — รวมข้อความ UI ทั้งหมดไว้จุดเดียว
   ============================================================ */
const APP_TEXT = {
  app: {
    title: 'TJ Inventory',
    brand: '🧴 TJ Inventory',
  },
  login: {
    subtitle:        'เลือกชื่อ แล้วใส่ PIN เพื่อเข้าใช้งาน',
    userLabel:       'ชื่อผู้ใช้',
    pinLabel:        'PIN',
    pinPlaceholder:  '••••',
    loginBtn:        'เข้าใช้งาน',
    loadingUsers:    'กำลังโหลด...',
    noUsers:         '— ไม่มีผู้ใช้ในระบบ —',
    pickUser:        'เลือกชื่อก่อน',
    enterPin:        'ใส่ PIN ก่อน',
    failed:          'เข้าไม่ได้',
    loadUsersFailTpl:'โหลดรายชื่อไม่ได้: {msg}',
    sessionExpired:  'เซสชันหมดอายุ — กรุณา login ใหม่',   // [T-014]
  },
  header: { logout: 'ออก' },
  issue: {
    title:       '📤 เบิกจ่าย — ยิง barcode ตัดสต๊อกทันที',
    placeholder: 'ยิง / พิมพ์ unit_barcode แล้ว Enter',
    submitBtn:   'ตัดสต๊อก (Enter)',
    camBtn:      '📷 ใช้กล้อง',
    camBtnClose: '✖ ปิดกล้อง',
    okTpl:       '✅ ตัดสต๊อก: {name}',
    scannedTpl:  '📷 สแกนได้: {code} — กด “ตัดสต๊อก” เพื่อยืนยัน',
    failed:      'เบิกไม่สำเร็จ',
    failTpl:     '❌ {msg}',
  },
  recent: {
    title:     '🕘 เบิกล่าสุด (เซสชันนี้)',
    empty:     'ยังไม่มีการเบิก',
    lotPrefix: 'Lot',
  },
  cam: { openFailTpl: 'เปิดกล้องไม่ได้: {msg}' },
  common: {
    errorTpl: 'ผิดพลาด: {msg}',
    loading:  'กำลังโหลด...',
    loadFail: 'โหลดไม่สำเร็จ',
  },
  tabs: {
    issue:   '📤 เบิก',
    receive: '📥 รับเข้า',
    stock:   '📊 สต๊อก',
    expiry:  '⏰ หมดอายุ',
  },
  // badge อายุล็อต — ใช้ร่วมแท็บสต๊อก + หมดอายุ (T-022: เกณฑ์มาจาก Config จุดเดียว)
  badge: {
    expiredTpl: 'หมดอายุแล้ว {n} วัน',
    warnTpl:    'เหลือ {n} วัน',
    leftTpl:    'เหลือ {n} วัน',
  },
  receive: {
    productTitle:       '📦 เลือกชนิดน้ำยา',
    vbcLabel:           'ยิง barcode กล่อง (ค้นหาชนิดอัตโนมัติ)',
    vbcPlaceholder:     'ยิง / พิมพ์ barcode กล่อง แล้ว Enter',
    camBtn:             '📷 ใช้กล้องมือถือ',
    camBtnClose:        '✖ ปิดกล้อง',
    scannedTpl:         '📷 สแกนได้: {code} — กำลังค้นหาชนิด...',
    pickLabel:          'หรือเลือกจากรายการ',
    loadingProducts:    '— กำลังโหลด... —',
    noProducts:         '— ยังไม่มีชนิดน้ำยา —',
    pickProduct:        '— เลือกชนิด —',
    loadProductsFailTpl:'โหลดชนิดน้ำยาไม่ได้: {msg}',
    newProductBtn:      '➕ สร้างชนิดใหม่',
    newProductHead:     'ชนิดใหม่ — กรอกข้อมูลด้านล่าง',
    nameLabel:          'ชื่อน้ำยา *',
    namePlaceholder:    'เช่น น้ำยาล้างคราบ A',
    uomLabel:           'หน่วยนับ *',
    uomPlaceholder:     'เช่น ขวด / แกลลอน / ลัง',
    newVbcLabel:        'barcode กล่อง (vendor) — ถ้ามี',
    newVbcPlaceholder:  'barcode ข้างกล่องจากผู้ขาย (optional)',
    lotTitle:           '📋 รายละเอียดล็อต',
    lotNoLabel:         'เลขล็อต (ข้างกล่อง) — ถ้ามี',
    lotNoPlaceholder:   'เช่น LOT-2026-A',
    expiryLabel:        'วันหมดอายุ *',
    qtyLabel:           'จำนวนที่รับเข้า *',
    submitBtn:          '📥 รับเข้า',
    searchFail:         'ค้นหาไม่ได้',
    searchFailTpl:      'ค้นหาไม่ได้: {msg}',
    notFound:           'ไม่พบชนิดนี้ — กรุณากรอกชนิดใหม่',
    foundTpl:           'พบ: {name}',
    foundManyTpl:       'พบ {n} ชนิด — กรุณาเลือก',
    needExpiry:         'กรุณาระบุวันหมดอายุ',
    needQty:            'กรุณาระบุจำนวน ≥ 1',
    qtyMaxTpl:          'รับได้สูงสุด {max} ชิ้นต่อครั้ง — ถ้ามากกว่านี้ให้แบ่งรับหลายรอบ',
    needName:           'กรุณาใส่ชื่อน้ำยา',
    needUom:            'กรุณาใส่หน่วยนับ',
    needProduct:        'กรุณาเลือกชนิดน้ำยา',
    failed:             'รับเข้าไม่สำเร็จ',
    okTpl:              '✅ รับเข้า {n} ชิ้น สำเร็จ',
    resultTitle:        '✅ รับเข้าสำเร็จ',
    resultMetaTpl:      'Lot {lot} &nbsp;·&nbsp; รับเข้า {n} ชิ้น &nbsp;·&nbsp; txn {txn}',
    barcodeListHead:    'unit_barcode ที่สร้าง:',
    printBtn:           '🖨️ พิมพ์ฉลาก',
    printBtnTpl:        '🖨️ พิมพ์ฉลาก {n} ดวง',
    sampleLabel:        'ตัวอย่างฉลาก (อัปเดตตามที่กรอก)',   // [T-033]
    historyLink:        '🕘 ประวัติการปริ้น ↗',               // [T-033]
    nextBtn:            '🔄 รับเข้าชุดถัดไป',
  },
  print: {
    noLabels:   'ไม่มีฉลากให้พิมพ์',
    libMissing: 'โหลดตัวสร้าง barcode ไม่ได้ (เช็กเน็ต)',
    qrMissing:  'โหลดตัว QR ไม่ได้ (เช็กเน็ต) — ยังไม่พิมพ์ เพราะฉลากจะขาด QR',
    failTpl:    'พิมพ์ไม่สำเร็จ: {msg}',
  },
  // [T-033] หน้าประวัติการปริ้น (print-history.html — ใช้ APP_TEXT ร่วมกัน)
  printq: {
    title:      '🕘 ประวัติการปริ้น',
    refreshBtn: '🔄 รีเฟรช',
    summaryTpl: 'ทั้งหมด <b>{n}</b> รายการ (โชว์ล่าสุด {shown})',
    empty:      'ยังไม่มีประวัติ — รับเข้าจากแอปหลักแล้วรายการจะมาอยู่ที่นี่',
    metaTpl:    'รับ {recv} · Lot {lot} · {n} ดวง · โดย {user}',
    reprintBtn: '🖨️ พิมพ์ซ้ำ',
    loadFail:   'โหลดรายการไม่ได้',
    backLink:   '← กลับหน้าแอป',
  },
  stock: {
    title:             '📊 สต๊อกคงเหลือ',
    refreshBtn:        '🔄 รีเฟรช',
    searchPlaceholder: '🔍 ค้นหาชนิดน้ำยา...',
    summaryTpl:        'รวม <b>{total}</b> ชิ้น ใน <b>{kinds}</b> ชนิด',
    empty:             'ยังไม่มีสต๊อกในระบบ',
    unit:              'ชิ้น',
    lotsLoading:       'กำลังโหลดรายล็อต...',
    lotsLoadFail:      'โหลดรายล็อตไม่ได้',
    lotsHead:          'รายล็อต (หมดอายุก่อน → หลัง) — กดที่ล็อตเพื่อดูรายชิ้น',
    noLots:            '— ไม่มีล็อต —',
    lotExpiryTpl:      '· หมดอายุ {exp}',
    unitsLoading:      'กำลังโหลดรายชิ้น...',
    unitsLoadFail:     'โหลดรายชิ้นไม่ได้',
    noUnits:           '— ไม่มีชิ้นในล็อตนี้ —',
    unitInStock:       '✔ ในสต๊อก',
    unitIssuedTpl:     'เบิกแล้ว · {user} · {date}',
  },
  expiry: {
    title:      '⏰ ล็อตใกล้หมดอายุ',
    refreshBtn: '🔄 รีเฟรช',
    summaryTpl: 'เกณฑ์เตือน ≤ <b>{warn}</b> วัน &nbsp;·&nbsp; 🔴 หมดอายุแล้ว <b>{expired}</b> &nbsp;·&nbsp; 🟡 ใกล้หมด <b>{warnCount}</b>',
    emptyTpl:   '🎉 ไม่มีล็อตใกล้หมดอายุ (ภายใน {warn} วัน)',
    metaTpl:    'Lot {lot} • หมดอายุ {exp} • คงเหลือ {n} ชิ้น',
  },
};

function t(path){ return path.split('.').reduce((o,k)=>(o&&o[k]!==undefined)?o[k]:undefined, APP_TEXT); }
function tf(tpl, vars){ return String(tpl).replace(/\{(\w+)\}/g,(_,k)=>vars[k]!==undefined?vars[k]:'{'+k+'}'); }
function applyAppText(){
  document.querySelectorAll('[data-text]').forEach(el=>{ const v=t(el.getAttribute('data-text')); if(typeof v==='string') el.textContent=v; });
  document.querySelectorAll('[data-text-placeholder]').forEach(el=>{ const v=t(el.getAttribute('data-text-placeholder')); if(typeof v==='string') el.placeholder=v; });
  if(APP_TEXT.app.title) document.title=APP_TEXT.app.title;
}

