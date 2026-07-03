/* Ứng dụng chấm công BVANTTCS – chạy thuần HTML/CSS/JS */

// ====== Cấu hình chung ======
const TZ_VN = "Asia/Ho_Chi_Minh";
const KEY_USERS = "anttlh_users_v1";
const KEY_ATT = "anttlh_attendance_v1";
const KEY_SETTINGS = "anttlh_settings_v1";
const KEY_SESSION = "anttlh_session_v1";
const KEY_REMEMBER_CHOICE = "anttlh_remember_choice_v1"; // "save" | "nosave"
const KEY_REMEMBER_USER = "anttlh_remember_user_v1";
const KEY_REMEMBER_PASS = "anttlh_remember_pass_v1";

// IndexedDB cho ảnh (tránh giới hạn dung lượng LocalStorage)
const IDB_NAME = "anttlh_db_v1";
const IDB_STORE_IMAGES = "images";

// ====== Tiện ích DOM ======
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function uuid() {
  return (crypto.randomUUID ? crypto.randomUUID() : "id-" + Math.random().toString(16).slice(2) + Date.now());
}

function fmtVNDateTime(ms) {
  const d = new Date(ms);
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: TZ_VN,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(d);
}

function nowVNParts() {
  // Lấy ngày theo GMT+7, không phụ thuộc timezone thiết bị
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ_VN,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return { y: map.year, m: map.month, d: map.day, iso: `${map.year}-${map.month}-${map.day}` };
}

function fmtVNTime(ms) {
  const d = new Date(ms);
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: TZ_VN,
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(d);
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function splitTimeHHMM(value) {
  const s = String(value ?? "");
  const m = s.match(/^(\d{2}):(\d{2})$/);
  if (!m) return { h: "", mi: "" };
  return { h: m[1], mi: m[2] };
}

function isoToVNDate(iso) {
  // YYYY-MM-DD -> DD/MM/YYYY
  const s = String(iso ?? "");
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function vnDateToISO(vn) {
  // DD/MM/YYYY -> YYYY-MM-DD
  const s = String(vn ?? "").trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return "";
  const dd = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const yy = parseInt(m[3], 10);
  if (yy < 1900 || yy > 2100) return "";
  if (mm < 1 || mm > 12) return "";
  if (dd < 1 || dd > 31) return "";
  return `${yy}-${pad2(mm)}-${pad2(dd)}`;
}

function nhanThangVN(monthStr) {
  // monthStr: YYYY-MM
  const [y, m] = String(monthStr ?? "").split("-");
  if (!y || !m) return String(monthStr ?? "");
  return `Tháng ${m}/${y}`;
}

function setHtml(el, html) {
  el.innerHTML = html;
}

function show(el) {
  el.classList.remove("hidden");
}

function hide(el) {
  el.classList.add("hidden");
}

// ====== Modal/Thông báo ======
function openBackdrop(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = "flex";
}

function closeBackdrop(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = "none";
}

function alertBox(title, html) {
  $("#alertTitle").textContent = title ?? "Thông báo";
  $("#alertContent").innerHTML = html ?? "";
  openBackdrop("alertModal");
}

// ====== LocalStorage helpers ======
function readJson(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getSettings() {
  return readJson(KEY_SETTINGS, {
    title1: "CÔNG AN XÃ LƯƠNG HOÀ",
    title2: "BVANTTCS XÃ LƯƠNG HOÀ",
    sheetsUrl: "",
  });
}

function saveSettings(next) {
  writeJson(KEY_SETTINGS, next);
}

function getUsers() {
  return readJson(KEY_USERS, []);
}

function saveUsers(users) {
  writeJson(KEY_USERS, users);
}

function getAttendance() {
  return readJson(KEY_ATT, []);
}

function saveAttendance(att) {
  writeJson(KEY_ATT, att);
}

// ====== IndexedDB cho ảnh ======
function openIdb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE_IMAGES)) {
        db.createObjectStore(IDB_STORE_IMAGES);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPutBlob(key, blob) {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_IMAGES, "readwrite");
    tx.objectStore(IDB_STORE_IMAGES).put(blob, key);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGetBlob(key) {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_IMAGES, "readonly");
    const req = tx.objectStore(IDB_STORE_IMAGES).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbDeleteBlob(key) {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_IMAGES, "readwrite");
    tx.objectStore(IDB_STORE_IMAGES).delete(key);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

// ====== Bảo mật tối thiểu: băm mật khẩu phía trình duyệt ======
async function sha256Hex(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function hashPass(username, password) {
  // “Muối” đơn giản để tránh trùng lặp tuyệt đối
  return sha256Hex(`${username}|${password}|anttlh`);
}

// ====== Quy tắc tạo tài khoản ======
function khongDau(str) {
  return String(str ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

function taoTaiKhoanTuHoTen(fullName) {
  // Quy tắc: tên trước, họ + chữ lót sau (lấy chữ cái đầu)
  // Ví dụ: Nguyễn Văn Tài → tainv@anttlh
  const clean = khongDau(fullName).trim().replace(/\s+/g, " ");
  const parts = clean.split(" ").filter(Boolean);
  if (parts.length === 0) return null;
  const ten = parts[parts.length - 1].toLowerCase();
  const dau = parts.slice(0, -1).map(p => p[0]?.toLowerCase() ?? "").join("");
  const user = `${ten}${dau}@anttlh`.replace(/[^a-z0-9@]/g, "");
  return user;
}

function validateNewPassword(pw) {
  const s = String(pw ?? "");
  if (s.length < 8 || s.length > 10) return "Mật khẩu phải dài 8–10 ký tự.";
  if (!/[0-9]/.test(s)) return "Mật khẩu phải có ít nhất 1 chữ số.";
  if (!/[A-Z]/.test(s)) return "Mật khẩu phải có ít nhất 1 chữ viết hoa.";
  if (!/[^A-Za-z0-9]/.test(s)) return "Mật khẩu phải có ít nhất 1 ký tự đặc biệt.";
  return "";
}

// ====== Phiên đăng nhập ======
function getSession() {
  return readJson(KEY_SESSION, null);
}
function setSession(session) {
  writeJson(KEY_SESSION, session);
}
function clearSession() {
  localStorage.removeItem(KEY_SESSION);
}

function roleLabel(role) {
  if (role === "dev") return "Dev";
  if (role === "admin") return "Admin";
  return "User";
}

// ====== Đồng bộ Google Sheets (tuỳ chọn) ======
async function trySync(payload) {
  const settings = getSettings();
  const url = settings.sheetsUrl?.trim();
  if (!url) return { ok: false, skipped: true, message: "Chưa cấu hình Google Sheets." };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    // Apps Script thường trả về 200; một số trường hợp CORS có thể hạn chế, nhưng vẫn gửi được
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, error: String(e?.message ?? e) };
  }
}

// ====== Nghiệp vụ chấm công ======
function findMyRecord(att, username, isoDate) {
  return att.find(r => r.username === username && r.date === isoDate) ?? null;
}

function upsertRecord(att, record) {
  const idx = att.findIndex(r => r.id === record.id);
  if (idx >= 0) {
    att[idx] = record;
  } else {
    att.push(record);
  }
  return att;
}

function daysInMonth(dateStr) {
  // dateStr: YYYY-MM
  const [y, m] = dateStr.split("-").map(n => parseInt(n, 10));
  const last = new Date(Date.UTC(y, m, 0)); // ngày 0 của tháng sau → ngày cuối tháng
  return last.getUTCDate();
}

function isUserRoleUser(u) {
  return u.role === "user";
}

// ====== Render tabs ======
function setTabs(items) {
  const tabs = $("#tabs");
  const content = $("#tabContent");
  setHtml(tabs, "");
  setHtml(content, "");

  items.forEach((it, i) => {
    const btn = document.createElement("button");
    btn.className = "tab";
    btn.type = "button";
    btn.textContent = it.label;
    btn.setAttribute("aria-selected", i === 0 ? "true" : "false");
    btn.addEventListener("click", () => {
      $$(".tab", tabs).forEach(b => b.setAttribute("aria-selected", "false"));
      btn.setAttribute("aria-selected", "true");
      setHtml(content, "");
      it.render(content);
    });
    tabs.appendChild(btn);
  });

  // Render tab đầu tiên
  if (items[0]) items[0].render(content);
}

// ====== View: User ======
function renderUserToday(container, me) {
  const today = nowVNParts().iso;
  const att = getAttendance();
  let record = findMyRecord(att, me.username, today);
  if (!record) {
    record = {
      id: uuid(),
      username: me.username,
      fullName: me.fullName,
      date: today,
      checked: false,
      checkedAt: null,
      startTime: "",
      endTime: "",
      taskType: "",
      note: "",
      images: [], // [{key,name,type,size}]
      updatedAt: Date.now(),
    };
  }
  // Tương thích dữ liệu cũ
  record.taskType = record.taskType ?? "";

  const start = splitTimeHHMM(record.startTime);
  const end = splitTimeHHMM(record.endTime);
  const hourOpts = Array.from({ length: 24 }, (_, i) => {
    const v = pad2(i);
    return `<option value="${v}">${v} giờ</option>`;
  }).join("");
  const minuteOpts = Array.from({ length: 60 }, (_, i) => {
    const v = pad2(i);
    return `<option value="${v}">${v} phút</option>`;
  }).join("");

  const html = `
    <div class="card">
      <div class="card-header">
        <h2>Chấm công ngày ${escapeHtml(today)}</h2>
        <div class="pill" title="Giờ Việt Nam (GMT+7)"><b>Hiện tại:</b> <span id="nowTime">${escapeHtml(fmtVNTime(Date.now()))}</span></div>
      </div>
      <div class="card-body">
        <div class="row">
          <label class="pill" style="cursor:pointer; user-select:none">
            <input type="checkbox" id="chkAttend" ${record.checked ? "checked" : ""} style="width:18px;height:18px" />
            Tham gia trực, công tác
          </label>
          <div class="pill"><b>Ghi nhận lúc:</b> <span id="checkedAt">${record.checkedAt ? escapeHtml(fmtVNDateTime(record.checkedAt)) : "Chưa ghi nhận"}</span></div>
        </div>
        <div class="divider"></div>
        <div class="row">
          <div class="field" style="min-width:180px; flex:0 0 220px">
            <label>Thời gian trực (bắt đầu)</label>
            <div class="time-row">
              <select id="startH" aria-label="Giờ bắt đầu">
                <option value="">Chọn giờ</option>
                ${hourOpts}
              </select>
              <select id="startM" aria-label="Phút bắt đầu">
                <option value="">Chọn phút</option>
                ${minuteOpts}
              </select>
            </div>
          </div>
          <div class="field" style="min-width:180px; flex:0 0 220px">
            <label>Thời gian trực (kết thúc)</label>
            <div class="time-row">
              <select id="endH" aria-label="Giờ kết thúc">
                <option value="">Chọn giờ</option>
                ${hourOpts}
              </select>
              <select id="endM" aria-label="Phút kết thúc">
                <option value="">Chọn phút</option>
                ${minuteOpts}
              </select>
            </div>
          </div>
          <div class="field" style="min-width:180px; flex:0 0 220px">
            <label>Nội dung</label>
            <select id="taskType">
              <option value="" ${record.taskType === "" ? "selected" : ""}>Chọn nội dung</option>
              <option value="Tuần tra" ${record.taskType === "Tuần tra" ? "selected" : ""}>Tuần tra</option>
              <option value="Hỗ trợ công tác" ${record.taskType === "Hỗ trợ công tác" ? "selected" : ""}>Hỗ trợ công tác</option>
              <option value="Khác" ${record.taskType === "Khác" ? "selected" : ""}>Khác</option>
            </select>
          </div>
          <div class="field" style="min-width:220px; flex:1">
            <label>Ghi chú (ngắn)</label>
            <input class="input-nho" id="note" value="${escapeHtml(record.note)}" placeholder="Ghi chú ngắn (nếu có)" />
          </div>
        </div>
        <div class="divider"></div>
        <div class="row">
          <div class="field" style="min-width:280px">
            <label>Upload hình ảnh tuần tra/công tác</label>
            <input type="file" id="imgUpload" accept="image/*" multiple />
            <div class="help">Ảnh sẽ được lưu trên máy (không tự gửi lên mạng). Admin/Dev xem được ảnh khi mở trên cùng thiết bị đã chấm.</div>
          </div>
          <button class="btn btn-success" id="btnSaveToday">Lưu cập nhật</button>
          <button class="btn" id="btnRemoveToday" title="Xoá dữ liệu chấm công của ngày này">Xoá ngày này</button>
        </div>
        <div class="gallery" id="gallery"></div>
      </div>
    </div>
  `;
  setHtml(container, html);

  // Đồng hồ “hiện tại”
  const t = setInterval(() => {
    const el = $("#nowTime", container);
    if (el) el.textContent = fmtVNTime(Date.now());
  }, 1000);

  // Render ảnh
  async function renderGallery() {
    const gal = $("#gallery", container);
    if (!gal) return;
    if (!record.images?.length) {
      setHtml(gal, `<div class="help">Chưa có ảnh được tải lên.</div>`);
      return;
    }
    setHtml(gal, `<div class="help">Đang tải ảnh...</div>`);
    const items = [];
    for (const img of record.images) {
      const blob = await idbGetBlob(img.key);
      if (!blob) continue;
      const url = URL.createObjectURL(blob);
      items.push({ img, url });
    }
    if (!items.length) {
      setHtml(gal, `<div class="help">Không tìm thấy dữ liệu ảnh (có thể đã bị xoá khỏi trình duyệt).</div>`);
      return;
    }
    setHtml(
      gal,
      items
        .map(({ img, url }) => {
          const name = escapeHtml(img.name ?? "anh.jpg");
          const sizeKb = Math.round((img.size ?? 0) / 1024);
          return `
            <div class="thumb">
              <img src="${url}" alt="${name}" />
              <div class="meta">
                ${name}<br/>
                ${sizeKb} KB
                <div style="margin-top:6px; display:flex; gap:8px; flex-wrap:wrap">
                  <a class="btn btn-small" href="${url}" download="${name}" style="text-decoration:none; display:inline-block">Tải</a>
                  <button class="btn btn-small btn-danger" data-del="${escapeHtml(img.key)}">Xoá</button>
                </div>
              </div>
            </div>
          `;
        })
        .join("")
    );
    $$("[data-del]", gal).forEach(btn => {
      btn.addEventListener("click", async () => {
        const key = btn.getAttribute("data-del");
        if (!key) return;
        if (!confirm("Bạn chắc chắn muốn xoá ảnh này?")) return;
        record.images = (record.images ?? []).filter(x => x.key !== key);
        await idbDeleteBlob(key);
        await persistRecord();
        renderGallery();
      });
    });
  }

  async function persistRecord() {
    record.updatedAt = Date.now();
    const list = getAttendance();
    upsertRecord(list, record);
    saveAttendance(list);
    // Đồng bộ tuỳ chọn
    await trySync({ type: "attendance", record });
  }

  $("#chkAttend", container).addEventListener("change", async (e) => {
    record.checked = !!e.target.checked;
    record.checkedAt = record.checked ? Date.now() : null;
    $("#checkedAt", container).textContent = record.checkedAt ? fmtVNDateTime(record.checkedAt) : "Chưa ghi nhận";
    await persistRecord();
  });

  $("#btnSaveToday", container).addEventListener("click", async () => {
    const sh = $("#startH", container).value ?? "";
    const sm = $("#startM", container).value ?? "";
    const eh = $("#endH", container).value ?? "";
    const em = $("#endM", container).value ?? "";
    record.startTime = sh && sm ? `${sh}:${sm}` : "";
    record.endTime = eh && em ? `${eh}:${em}` : "";
    record.taskType = $("#taskType", container).value ?? "";
    record.note = $("#note", container).value ?? "";
    await persistRecord();
    alertBox("Đã lưu", `<div class="help">Dữ liệu chấm công ngày <b>${escapeHtml(today)}</b> đã được lưu.</div>`);
  });

  $("#btnRemoveToday", container).addEventListener("click", async () => {
    if (!confirm(`Bạn chắc chắn muốn xoá dữ liệu chấm công ngày ${today}?`)) return;
    // Xoá ảnh trong IDB
    for (const img of record.images ?? []) {
      await idbDeleteBlob(img.key);
    }
    // Xoá record trong LocalStorage
    const list = getAttendance().filter(r => !(r.username === me.username && r.date === today));
    saveAttendance(list);
    await trySync({ type: "attendance_delete", username: me.username, date: today });
    renderUserToday(container, me);
  });

  $("#imgUpload", container).addEventListener("change", async (e) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    for (const f of files) {
      const key = `img_${uuid()}`;
      await idbPutBlob(key, f);
      record.images.push({ key, name: f.name, type: f.type, size: f.size });
    }
    await persistRecord();
    e.target.value = "";
    renderGallery();
  });

  // Dọn interval khi tab đổi (container bị reset)
  const observer = new MutationObserver(() => {
    if (!document.body.contains(container)) clearInterval(t);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  renderGallery();

  // Set giá trị mặc định cho select giờ/phút
  $("#startH", container).value = start.h;
  $("#startM", container).value = start.mi;
  $("#endH", container).value = end.h;
  $("#endM", container).value = end.mi;
}

function renderUserHistory(container, me) {
  const today = nowVNParts().iso;
  const todayVN = isoToVNDate(today);
  const html = `
    <div class="card">
      <div class="card-header">
        <h2>Lịch sử chấm công cá nhân</h2>
        <div class="muted">Bạn chỉ xem được dữ liệu của chính mình.</div>
      </div>
      <div class="card-body">
        <div class="row">
          <div class="field" style="min-width:200px; flex:0 0 240px">
            <label>Từ ngày</label>
            <input inputmode="numeric" id="fromDate" value="${escapeHtml(todayVN)}" placeholder="vd: 03/07/2026" />
          </div>
          <div class="field" style="min-width:200px; flex:0 0 240px">
            <label>Đến ngày</label>
            <input inputmode="numeric" id="toDate" value="${escapeHtml(todayVN)}" placeholder="vd: 03/07/2026" />
          </div>
          <button class="btn btn-primary" id="btnLoad">Xem</button>
        </div>
        <div class="divider"></div>
        <div id="histTable"></div>
        <div class="help" style="margin-top:10px">
          Gợi ý: nếu muốn báo cáo, Admin/Dev sẽ xuất PDF phần tổng hợp.
        </div>
      </div>
    </div>
  `;
  setHtml(container, html);

  function load() {
    const from = vnDateToISO($("#fromDate", container).value);
    const to = vnDateToISO($("#toDate", container).value);
    if (!from || !to) {
      alertBox("Ngày không hợp lệ", `<div class="help">Vui lòng nhập ngày theo định dạng <b>DD/MM/YYYY</b>.</div>`);
      return;
    }
    const list = getAttendance()
      .filter(r => r.username === me.username)
      .filter(r => (!from || r.date >= from) && (!to || r.date <= to))
      .sort((a, b) => (a.date > b.date ? -1 : 1));

    const rows = list.map((r, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${escapeHtml(r.date)}</td>
        <td>${r.checked ? "Có" : "Không"}</td>
        <td>${r.checkedAt ? escapeHtml(fmtVNDateTime(r.checkedAt)) : ""}</td>
        <td>${escapeHtml(r.startTime ?? "")}</td>
        <td>${escapeHtml(r.endTime ?? "")}</td>
        <td>${escapeHtml(r.taskType ?? "")}</td>
        <td>${escapeHtml(r.note ?? "")}</td>
        <td>${(r.images?.length ?? 0)}</td>
      </tr>
    `).join("");

    $("#histTable", container).innerHTML = `
      <table>
        <thead>
          <tr>
            <th>STT</th>
            <th>Ngày</th>
            <th>Chấm công</th>
            <th>Ghi nhận lúc</th>
            <th>Bắt đầu</th>
            <th>Kết thúc</th>
            <th>Nội dung</th>
            <th>Ghi chú</th>
            <th>Ảnh</th>
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="9" class="muted">Không có dữ liệu.</td></tr>`}
        </tbody>
      </table>
    `;
  }

  $("#btnLoad", container).addEventListener("click", load);
  load();
}

// ====== View: Admin/Dev ======
function renderSummary(container, me) {
  const now = nowVNParts();
  const ym = `${now.y}-${now.m}`;
  const years = [parseInt(now.y, 10) - 1, parseInt(now.y, 10), parseInt(now.y, 10) + 1];
  const html = `
    <div class="card">
      <div class="card-header">
        <h2>Tổng hợp ngày công</h2>
        <div class="row">
          <button class="btn btn-warn btn-small" id="btnExportPdf">Xuất PDF (tiếng Việt)</button>
          <button class="btn btn-small" id="btnPrint">In/Lưu PDF (trình duyệt)</button>
        </div>
      </div>
      <div class="card-body">
        <div class="row">
          <div class="field" style="min-width:200px; flex:0 0 240px">
            <label>Chọn tháng</label>
            <div class="time-row">
              <select id="pickMonth" aria-label="Chọn tháng">
                ${Array.from({length:12}, (_,i)=> {
                  const v = pad2(i+1);
                  return `<option value="${v}" ${v===now.m ? "selected":""}>Tháng ${v}</option>`;
                }).join("")}
              </select>
              <select id="pickYear" aria-label="Chọn năm">
                ${years.map(y => `<option value="${y}" ${String(y)===now.y ? "selected":""}>Năm ${y}</option>`).join("")}
              </select>
            </div>
          </div>
          <button class="btn btn-primary" id="btnLoadSum">Tải tổng hợp</button>
          <div class="help right" id="sumNote"></div>
        </div>
        <div class="divider"></div>
        <div id="sumTable"></div>
      </div>
    </div>
  `;
  setHtml(container, html);

  function getMonthStr() {
    const y = $("#pickYear", container).value;
    const m = $("#pickMonth", container).value;
    return `${y}-${m}`;
  }

  function buildData(monthStr) {
    const users = getUsers().filter(isUserRoleUser);
    const att = getAttendance().filter(r => r.date?.startsWith(monthStr));
    const map = new Map(); // username -> count
    for (const u of users) map.set(u.username, 0);
    for (const r of att) {
      if (!r.checked) continue;
      if (!map.has(r.username)) continue;
      map.set(r.username, map.get(r.username) + 1);
    }
    const rows = users
      .slice()
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "vi"))
      .map((u, idx) => ({
        stt: idx + 1,
        fullName: u.fullName,
        username: u.username,
        days: map.get(u.username) ?? 0,
      }));
    return rows;
  }

  function renderTable(monthStr) {
    const rows = buildData(monthStr);
    const totalDays = rows.reduce((s, r) => s + (r.days ?? 0), 0);
    $("#sumNote", container).textContent = `Tổng ngày công cộng dồn: ${totalDays}`;
    $("#sumTable", container).innerHTML = `
      <table id="sumTableEl">
        <thead>
          <tr>
            <th>STT</th>
            <th>Họ và tên</th>
            <th>Tài khoản</th>
            <th>Số ngày tham gia trực/công tác</th>
          </tr>
        </thead>
        <tbody>
          ${
            rows.length
              ? rows.map(r => `
                <tr>
                  <td>${r.stt}</td>
                  <td>${escapeHtml(r.fullName)}</td>
                  <td>${escapeHtml(r.username)}</td>
                  <td>${r.days}</td>
                </tr>
              `).join("")
              : `<tr><td colspan="4" class="muted">Chưa có danh sách thành viên User.</td></tr>`
          }
        </tbody>
      </table>
    `;
  }

  async function exportPdf(monthStr) {
    const rows = buildData(monthStr);
    // Dùng cơ chế In/Lưu PDF của trình duyệt để đảm bảo hiển thị tiếng Việt + font Be Vietnam Pro
    const title = `BẢNG TỔNG HỢP CHẤM CÔNG – ${nhanThangVN(monthStr)}`;
    const bodyRows = rows.map(r => `
      <tr>
        <td>${r.stt}</td>
        <td>${escapeHtml(r.fullName)}</td>
        <td>${escapeHtml(r.username)}</td>
        <td>${r.days}</td>
      </tr>
    `).join("");

    const html = `
      <html lang="vi"><head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;700;800&display=swap" rel="stylesheet" />
        <style>
          body{font-family:"Be Vietnam Pro", Arial, sans-serif; padding:20px}
          h1{font-size:16px; margin:0 0 10px}
          .meta{font-size:12px; color:#444; margin:2px 0}
          table{width:100%; border-collapse:collapse; margin-top:10px}
          th,td{border:1px solid #999; padding:6px; font-size:12px; vertical-align:top}
          th{background:#ffcc00}
        </style>
      </head><body>
        <h1>${escapeHtml(title)}</h1>
        <div class="meta">Đơn vị: ${escapeHtml(getSettings().title1)} / ${escapeHtml(getSettings().title2)}</div>
        <div class="meta">Xuất lúc: ${escapeHtml(fmtVNDateTime(Date.now()))}</div>
        <div class="meta">Gợi ý: trong hộp thoại in, chọn <b>Lưu dưới dạng PDF</b> để xuất file PDF.</div>
        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Họ và tên</th>
              <th>Tài khoản</th>
              <th>Số ngày tham gia trực/công tác</th>
            </tr>
          </thead>
          <tbody>
            ${bodyRows || `<tr><td colspan="4">Không có dữ liệu.</td></tr>`}
          </tbody>
        </table>
        <script>window.print();<\/script>
      </body></html>
    `;
    const w = window.open("", "_blank");
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  $("#btnLoadSum", container).addEventListener("click", () => {
    renderTable(getMonthStr());
  });

  $("#btnExportPdf", container).addEventListener("click", async () => {
    await exportPdf(getMonthStr());
  });

  $("#btnPrint", container).addEventListener("click", () => {
    const el = $("#sumTableEl", container);
    if (!el) return;
    const title = `BẢNG TỔNG HỢP CHẤM CÔNG – ${nhanThangVN(getMonthStr())}`;
    const html = `
      <html lang="vi"><head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;700;800&display=swap" rel="stylesheet" />
        <style>
          body{font-family:"Be Vietnam Pro", Arial, sans-serif; padding:20px}
          h1{font-size:16px}
          table{width:100%; border-collapse:collapse; margin-top:10px}
          th,td{border:1px solid #999; padding:6px; font-size:12px}
          th{background:#ffcc00}
          .meta{font-size:12px; color:#444}
        </style>
      </head><body>
        <h1>${escapeHtml(title)}</h1>
        <div class="meta">Đơn vị: ${escapeHtml(getSettings().title1)} / ${escapeHtml(getSettings().title2)}</div>
        <div class="meta">Xuất lúc: ${escapeHtml(fmtVNDateTime(Date.now()))}</div>
        ${el.outerHTML}
        <script>window.print();<\/script>
      </body></html>
    `;
    const w = window.open("", "_blank");
    w.document.open();
    w.document.write(html);
    w.document.close();
  });

  renderTable(getMonthStr());
}

function renderDetails(container, me) {
  const now = nowVNParts();
  const today = now.iso;
  const todayVN = isoToVNDate(today);
  const users = getUsers().filter(isUserRoleUser).sort((a, b) => a.fullName.localeCompare(b.fullName, "vi"));

  const html = `
    <div class="card">
      <div class="card-header">
        <h2>Chi tiết chấm công (toàn lực lượng)</h2>
        <div class="muted">Admin/Dev xem được tất cả dữ liệu (chỉ trên thiết bị đang lưu dữ liệu).</div>
      </div>
      <div class="card-body">
        <div class="row">
          <div class="field" style="min-width:200px; flex:0 0 240px">
            <label>Từ ngày (DD/MM/YYYY)</label>
            <input inputmode="numeric" id="fromDate" value="${escapeHtml(todayVN)}" placeholder="vd: 03/07/2026" />
          </div>
          <div class="field" style="min-width:200px; flex:0 0 240px">
            <label>Đến ngày (DD/MM/YYYY)</label>
            <input inputmode="numeric" id="toDate" value="${escapeHtml(todayVN)}" placeholder="vd: 03/07/2026" />
          </div>
          <div class="field" style="min-width:220px; flex:0 0 280px">
            <label>Chọn thành viên</label>
            <select id="userPick">
              <option value="">Tất cả</option>
              ${users.map(u => `<option value="${escapeHtml(u.username)}">${escapeHtml(u.fullName)} (${escapeHtml(u.username)})</option>`).join("")}
            </select>
          </div>
          <button class="btn btn-primary" id="btnLoad">Xem</button>
        </div>
        <div class="divider"></div>
        <div id="detailTable"></div>
      </div>
    </div>
  `;
  setHtml(container, html);

  async function load() {
    const from = vnDateToISO($("#fromDate", container).value);
    const to = vnDateToISO($("#toDate", container).value);
    if (!from || !to) {
      alertBox("Ngày không hợp lệ", `<div class="help">Vui lòng nhập ngày theo định dạng <b>DD/MM/YYYY</b>.</div>`);
      return;
    }
    const pick = $("#userPick", container).value;
    let list = getAttendance()
      .filter(r => (!from || r.date >= from) && (!to || r.date <= to))
      .sort((a, b) => (a.date > b.date ? -1 : 1));
    if (pick) list = list.filter(r => r.username === pick);

    // Render bảng + ảnh
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Ngày</th>
            <th>Họ và tên</th>
            <th>Tài khoản</th>
            <th>Chấm công</th>
            <th>Ghi nhận lúc</th>
            <th>Bắt đầu</th>
            <th>Kết thúc</th>
            <th>Nội dung</th>
            <th>Ghi chú</th>
            <th>Ảnh</th>
          </tr>
        </thead>
        <tbody>
          ${
            list.length
              ? list.map(r => `
                <tr>
                  <td>${escapeHtml(r.date)}</td>
                  <td>${escapeHtml(r.fullName ?? "")}</td>
                  <td>${escapeHtml(r.username)}</td>
                  <td>${r.checked ? "Có" : "Không"}</td>
                  <td>${r.checkedAt ? escapeHtml(fmtVNDateTime(r.checkedAt)) : ""}</td>
                  <td>${escapeHtml(r.startTime ?? "")}</td>
                  <td>${escapeHtml(r.endTime ?? "")}</td>
                  <td>${escapeHtml(r.taskType ?? "")}</td>
                  <td>${escapeHtml(r.note ?? "")}</td>
                  <td>
                    ${(r.images?.length ?? 0)} ảnh
                    ${r.images?.length ? `<div style="margin-top:6px"><button class="btn btn-small" data-view="${escapeHtml(r.id)}">Xem ảnh</button></div>` : ""}
                  </td>
                </tr>
              `).join("")
              : `<tr><td colspan="10" class="muted">Không có dữ liệu.</td></tr>`
          }
        </tbody>
      </table>
      <div id="imgPanel" style="margin-top:12px"></div>
    `;
    $("#detailTable", container).innerHTML = "";
    $("#detailTable", container).appendChild(wrapper);

    const panel = $("#imgPanel", wrapper);
    async function showImages(recordId) {
      const r = list.find(x => x.id === recordId);
      if (!r || !r.images?.length) return;
      panel.innerHTML = `<div class="card"><div class="card-header"><h2>Ảnh: ${escapeHtml(r.fullName ?? "")} – ${escapeHtml(r.date)}</h2></div><div class="card-body"><div class="help">Đang tải ảnh...</div></div></div>`;
      const body = $(".card-body", panel);
      const items = [];
      for (const img of r.images) {
        const blob = await idbGetBlob(img.key);
        if (!blob) continue;
        const url = URL.createObjectURL(blob);
        items.push({ img, url });
      }
      body.innerHTML = `
        <div class="gallery">
          ${
            items.map(({ img, url }) => `
              <div class="thumb">
                <img src="${url}" alt="${escapeHtml(img.name ?? "anh.jpg")}" />
                <div class="meta">
                  ${escapeHtml(img.name ?? "anh.jpg")}
                  <div style="margin-top:6px">
                    <a class="btn btn-small" href="${url}" download="${escapeHtml(img.name ?? "anh.jpg")}" style="text-decoration:none; display:inline-block">Tải</a>
                  </div>
                </div>
              </div>
            `).join("")
          }
        </div>
      `;
    }

    $$("[data-view]", wrapper).forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-view");
        await showImages(id);
      });
    });
  }

  $("#btnLoad", container).addEventListener("click", load);
  load();
}

// ====== View: Dev – quản lý tài khoản ======
function renderDevAccounts(container, me) {
  const html = `
    <div class="grid-2">
      <div class="card">
        <div class="card-header">
          <h2>Tạo tài khoản</h2>
          <div class="muted">Mật khẩu mặc định: <b>123456</b></div>
        </div>
        <div class="card-body">
          <div class="field">
            <label>Họ và tên</label>
            <input id="fullName" placeholder="vd: Nguyễn Văn Tài" />
            <div class="help">Hệ thống tự tạo tài khoản theo quy tắc: tên + chữ cái đầu họ và chữ lót, không dấu, kèm <code>@anttlh</code>.</div>
          </div>
          <div class="field">
            <label>Phân quyền</label>
            <select id="role">
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div class="row">
            <button class="btn btn-success" id="btnCreate">Tạo tài khoản</button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h2>Tạo đồng loạt (upload danh sách)</h2>
        </div>
        <div class="card-body">
          <div class="field">
            <label>Chọn file (.txt hoặc .csv)</label>
            <input type="file" id="bulkFile" accept=".txt,.csv" />
            <div class="help">Mỗi dòng 1 họ và tên. CSV có thể dùng cột đầu tiên.</div>
          </div>
          <div class="field">
            <label>Phân quyền cho danh sách</label>
            <select id="bulkRole">
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button class="btn btn-primary" id="btnBulkCreate">Tạo đồng loạt</button>
          <div class="divider"></div>
          <div id="bulkPreview" class="help"></div>
        </div>
      </div>
    </div>

    <div style="margin-top:14px" class="card">
      <div class="card-header">
        <h2>Danh sách tài khoản</h2>
        <div class="muted">Dev có thể xoá bất cứ tài khoản nào (trừ chính Dev đang đăng nhập).</div>
      </div>
      <div class="card-body">
        <div id="userTable"></div>
      </div>
    </div>
  `;
  setHtml(container, html);

  function renderTable() {
    const users = getUsers().slice().sort((a, b) => a.fullName.localeCompare(b.fullName, "vi"));
    $("#userTable", container).innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Họ và tên</th>
            <th>Tài khoản</th>
            <th>Vai trò</th>
            <th>Tác vụ</th>
          </tr>
        </thead>
        <tbody>
          ${
            users.map(u => `
              <tr>
                <td>${escapeHtml(u.fullName)}</td>
                <td>${escapeHtml(u.username)}</td>
                <td>
                  <select data-role="${escapeHtml(u.username)}" ${u.username === me.username ? "disabled" : ""}>
                    <option value="dev" ${u.role === "dev" ? "selected" : ""}>Dev</option>
                    <option value="admin" ${u.role === "admin" ? "selected" : ""}>Admin</option>
                    <option value="user" ${u.role === "user" ? "selected" : ""}>User</option>
                  </select>
                </td>
                <td>
                  <button class="btn btn-small" data-reset="${escapeHtml(u.username)}" ${u.username === me.username ? "disabled" : ""}>Reset 123456</button>
                  <button class="btn btn-small btn-danger" data-del="${escapeHtml(u.username)}" ${u.username === me.username ? "disabled" : ""}>Xoá</button>
                </td>
              </tr>
            `).join("")
          }
        </tbody>
      </table>
    `;

    // Đổi role
    $$("[data-role]", container).forEach(sel => {
      sel.addEventListener("change", () => {
        const username = sel.getAttribute("data-role");
        const role = sel.value;
        const users = getUsers();
        const u = users.find(x => x.username === username);
        if (!u) return;
        if (u.username === me.username) return;
        u.role = role;
        saveUsers(users);
        alertBox("Đã cập nhật", `<div class="help">Đã cập nhật quyền cho <b>${escapeHtml(u.fullName)}</b> thành <b>${escapeHtml(roleLabel(role))}</b>.</div>`);
      });
    });

    // Reset mật khẩu
    $$("[data-reset]", container).forEach(btn => {
      btn.addEventListener("click", async () => {
        const username = btn.getAttribute("data-reset");
        if (!username) return;
        if (!confirm("Reset mật khẩu về 123456?")) return;
        const users = getUsers();
        const u = users.find(x => x.username === username);
        if (!u) return;
        u.passHash = await hashPass(u.username, "123456");
        u.mustChange = true;
        saveUsers(users);
        alertBox("Đã reset", `<div class="help">Đã reset mật khẩu cho <b>${escapeHtml(u.fullName)}</b> về <b>123456</b>.</div>`);
      });
    });

    // Xoá
    $$("[data-del]", container).forEach(btn => {
      btn.addEventListener("click", async () => {
        const username = btn.getAttribute("data-del");
        if (!username) return;
        const users = getUsers();
        const u = users.find(x => x.username === username);
        if (!u) return;
        if (!confirm(`Xoá tài khoản ${u.fullName} (${u.username})?`)) return;

        // Xoá dữ liệu chấm công + ảnh liên quan
        const att = getAttendance();
        const mine = att.filter(r => r.username === username);
        for (const r of mine) {
          for (const img of r.images ?? []) await idbDeleteBlob(img.key);
        }
        saveAttendance(att.filter(r => r.username !== username));

        saveUsers(users.filter(x => x.username !== username));
        renderTable();
        alertBox("Đã xoá", `<div class="help">Đã xoá tài khoản và dữ liệu liên quan.</div>`);
      });
    });
  }

  async function createOne(fullName, role) {
    const username = taoTaiKhoanTuHoTen(fullName);
    if (!username) return { ok: false, message: "Họ và tên không hợp lệ." };
    const users = getUsers();
    if (users.some(u => u.username === username)) {
      return { ok: false, message: `Tài khoản đã tồn tại: ${username}` };
    }
    const passHash = await hashPass(username, "123456");
    users.push({
      username,
      fullName: fullName.trim().replace(/\s+/g, " "),
      role,
      passHash,
      mustChange: true,
      createdAt: Date.now(),
    });
    saveUsers(users);
    await trySync({ type: "user_create", user: { username, fullName, role } });
    return { ok: true, username };
  }

  $("#btnCreate", container).addEventListener("click", async () => {
    const fullName = $("#fullName", container).value?.trim();
    const role = $("#role", container).value;
    if (!fullName) return alertBox("Thiếu thông tin", `<div class="help">Vui lòng nhập họ và tên.</div>`);
    const res = await createOne(fullName, role);
    if (!res.ok) return alertBox("Không tạo được", `<div class="help">${escapeHtml(res.message)}</div>`);
    $("#fullName", container).value = "";
    renderTable();
    alertBox("Đã tạo", `<div class="help">Đã tạo tài khoản: <b>${escapeHtml(res.username)}</b> (mật khẩu mặc định: <b>123456</b>).</div>`);
  });

  $("#bulkFile", container).addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const txt = await f.text();
    const lines = txt.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const names = lines.map(line => (line.includes(",") ? line.split(",")[0].trim() : line));
    const preview = names.slice(0, 12).map(n => `- ${escapeHtml(n)} → <b>${escapeHtml(taoTaiKhoanTuHoTen(n) ?? "")}</b>`).join("<br/>");
    $("#bulkPreview", container).innerHTML = `Số dòng: <b>${names.length}</b><br/>${preview}${names.length > 12 ? "<br/>..." : ""}`;
  });

  $("#btnBulkCreate", container).addEventListener("click", async () => {
    const f = $("#bulkFile", container).files?.[0];
    if (!f) return alertBox("Chưa chọn file", `<div class="help">Vui lòng chọn file danh sách.</div>`);
    const role = $("#bulkRole", container).value;
    const txt = await f.text();
    const lines = txt.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const names = lines.map(line => (line.includes(",") ? line.split(",")[0].trim() : line)).filter(Boolean);
    if (!names.length) return;
    let ok = 0, fail = 0;
    const failList = [];
    for (const name of names) {
      const r = await createOne(name, role);
      if (r.ok) ok++;
      else { fail++; failList.push(`${name}: ${r.message}`); }
    }
    renderTable();
    alertBox("Tạo đồng loạt xong", `
      <div class="help">
        Thành công: <b>${ok}</b><br/>
        Bị trùng/không hợp lệ: <b>${fail}</b>
        ${failList.length ? `<div class="divider"></div><div class="help"><b>Chi tiết lỗi (tối đa 10 dòng):</b><br/>${failList.slice(0,10).map(escapeHtml).join("<br/>")}</div>` : ""}
      </div>
    `);
  });

  renderTable();
}

function renderDevSettings(container, me) {
  const s = getSettings();
  const html = `
    <div class="card">
      <div class="card-header">
        <h2>Cài đặt</h2>
        <div class="muted">Chỉ Dev được thay đổi.</div>
      </div>
      <div class="card-body">
        <div class="grid-2">
          <div class="card">
            <div class="card-header"><h2>Tiêu đề trang</h2></div>
            <div class="card-body">
              <div class="field">
                <label>Dòng 1</label>
                <input id="title1" value="${escapeHtml(s.title1)}" />
              </div>
              <div class="field">
                <label>Dòng 2</label>
                <input id="title2" value="${escapeHtml(s.title2)}" />
              </div>
              <button class="btn btn-success" id="btnSaveTitle">Lưu tiêu đề</button>
            </div>
          </div>
          <div class="card">
            <div class="card-header"><h2>Google Sheets (tuỳ chọn)</h2></div>
            <div class="card-body">
              <div class="field">
                <label>Link Web App (Google Apps Script)</label>
                <input id="sheetsUrl" value="${escapeHtml(s.sheetsUrl ?? "")}" placeholder="Dán link Web App ở đây" />
                <div class="help">Nếu cấu hình, hệ thống sẽ cố gắng gửi dữ liệu chấm công lên Google Sheets bằng HTTP POST.</div>
              </div>
              <div class="row">
                <button class="btn btn-success" id="btnSaveSheets">Lưu</button>
                <button class="btn" id="btnTestSheets">Test gửi</button>
              </div>
              <div class="help" id="sheetMsg"></div>
            </div>
          </div>
        </div>
        <div class="divider"></div>
        <div class="card">
          <div class="card-header"><h2>Sao lưu/Phục hồi dữ liệu (tuỳ chọn)</h2></div>
          <div class="card-body">
            <div class="help">Dùng khi cần chuyển dữ liệu sang máy khác. Ảnh (IndexedDB) không nằm trong file sao lưu; bạn có thể tải ảnh bằng mục “Chi tiết” nếu cần.</div>
            <div class="row" style="margin-top:8px">
              <button class="btn btn-warn" id="btnBackup">Tải file sao lưu (.json)</button>
              <div class="field" style="min-width:280px">
                <label>Phục hồi từ file .json</label>
                <input type="file" id="restoreFile" accept=".json" />
              </div>
              <button class="btn btn-danger" id="btnRestore">Phục hồi</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  setHtml(container, html);

  $("#btnSaveTitle", container).addEventListener("click", () => {
    const next = getSettings();
    next.title1 = $("#title1", container).value?.trim() || next.title1;
    next.title2 = $("#title2", container).value?.trim() || next.title2;
    saveSettings(next);
    applyTitle();
    alertBox("Đã lưu", `<div class="help">Đã cập nhật tiêu đề trang.</div>`);
  });

  $("#btnSaveSheets", container).addEventListener("click", () => {
    const next = getSettings();
    next.sheetsUrl = $("#sheetsUrl", container).value?.trim() ?? "";
    saveSettings(next);
    $("#sheetMsg", container).textContent = "Đã lưu cấu hình Google Sheets.";
  });

  $("#btnTestSheets", container).addEventListener("click", async () => {
    $("#sheetMsg", container).textContent = "Đang gửi test...";
    const res = await trySync({ type: "ping", at: Date.now(), atVN: fmtVNDateTime(Date.now()), by: me.username });
    if (res.skipped) $("#sheetMsg", container).textContent = "Chưa cấu hình link Web App.";
    else if (res.ok) $("#sheetMsg", container).textContent = `Đã gửi test (HTTP ${res.status}).`;
    else $("#sheetMsg", container).textContent = `Gửi thất bại: ${res.error ?? "không rõ"}`;
  });

  $("#btnBackup", container).addEventListener("click", () => {
    const data = {
      exportedAt: Date.now(),
      exportedAtVN: fmtVNDateTime(Date.now()),
      users: getUsers(),
      attendance: getAttendance(),
      settings: getSettings(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sao-luu_anttlh_${nowVNParts().iso}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  $("#btnRestore", container).addEventListener("click", async () => {
    const f = $("#restoreFile", container).files?.[0];
    if (!f) return alertBox("Chưa chọn file", `<div class="help">Vui lòng chọn file sao lưu .json.</div>`);
    if (!confirm("Phục hồi sẽ ghi đè danh sách tài khoản/chấm công/cài đặt hiện có. Bạn chắc chắn?")) return;
    try {
      const txt = await f.text();
      const data = JSON.parse(txt);
      if (!data?.users || !data?.attendance) throw new Error("File không đúng định dạng.");
      saveUsers(data.users);
      saveAttendance(data.attendance);
      saveSettings(data.settings ?? getSettings());
      applyTitle();
      alertBox("Đã phục hồi", `<div class="help">Đã phục hồi dữ liệu. Vui lòng tải lại trang để áp dụng đầy đủ.</div>`);
    } catch (e) {
      alertBox("Phục hồi thất bại", `<div class="help">${escapeHtml(e?.message ?? String(e))}</div>`);
    }
  });
}

// ====== Đăng nhập/đổi mật khẩu ======
async function doLogin(username, password) {
  const users = getUsers();
  const u = users.find(x => x.username === username);
  if (!u) return { ok: false, message: "Tài khoản không tồn tại." };
  const h = await hashPass(username, password);
  if (h !== u.passHash) return { ok: false, message: "Sai mật khẩu." };
  setSession({ username: u.username, at: Date.now() });
  return { ok: true };
}

async function changePassword(me, oldPass, newPass) {
  const users = getUsers();
  const u = users.find(x => x.username === me.username);
  if (!u) return { ok: false, message: "Không tìm thấy tài khoản." };
  const hOld = await hashPass(u.username, oldPass);
  if (hOld !== u.passHash) return { ok: false, message: "Mật khẩu hiện tại không đúng." };
  const rule = validateNewPassword(newPass);
  if (rule) return { ok: false, message: rule };
  u.passHash = await hashPass(u.username, newPass);
  u.mustChange = false;
  saveUsers(users);
  return { ok: true };
}

function applyTitle() {
  const s = getSettings();
  const t = $("#appTitle");
  t.innerHTML = `${escapeHtml(s.title1)}<small>${escapeHtml(s.title2)}</small>`;
}

function getMe() {
  const sess = getSession();
  if (!sess?.username) return null;
  const users = getUsers();
  return users.find(u => u.username === sess.username) ?? null;
}

function logout() {
  clearSession();
  render();
}

function ensureSeedDev() {
  const users = getUsers();
  if (users.some(u => u.role === "dev")) return;
  const username = "dev@anttlh";
  const fullName = "Tài khoản Dev";
  // Mật khẩu mặc định của Dev: Dev@1234! (đáp ứng quy tắc)
  return hashPass(username, "Dev@1234!").then(passHash => {
    users.push({
      username,
      fullName,
      role: "dev",
      passHash,
      mustChange: false,
      createdAt: Date.now(),
    });
    saveUsers(users);
  });
}

// ====== Render tổng thể theo vai trò ======
function renderShellFor(me) {
  hide($("#viewLogin"));
  show($("#viewShell"));
  $("#meName").textContent = me.fullName;
  $("#meRole").textContent = roleLabel(me.role);

  const tabs = [];
  if (me.role === "user") {
    tabs.push(
      { label: "Chấm công", render: (c) => renderUserToday(c, me) },
      { label: "Lịch sử", render: (c) => renderUserHistory(c, me) },
    );
  } else if (me.role === "admin") {
    tabs.push(
      { label: "Tổng hợp", render: (c) => renderSummary(c, me) },
      { label: "Chi tiết", render: (c) => renderDetails(c, me) },
    );
  } else if (me.role === "dev") {
    tabs.push(
      { label: "Tổng hợp", render: (c) => renderSummary(c, me) },
      { label: "Chi tiết", render: (c) => renderDetails(c, me) },
      { label: "Quản lý tài khoản", render: (c) => renderDevAccounts(c, me) },
      { label: "Cài đặt", render: (c) => renderDevSettings(c, me) },
    );
  }
  setTabs(tabs);
}

function renderLogin() {
  show($("#viewLogin"));
  hide($("#viewShell"));

  const choice = localStorage.getItem(KEY_REMEMBER_CHOICE);
  if (choice === "save") {
    $("#loginUsername").value = localStorage.getItem(KEY_REMEMBER_USER) ?? "";
    $("#loginPassword").value = localStorage.getItem(KEY_REMEMBER_PASS) ?? "";
    $("#loginHint").textContent = "Đã điền sẵn tài khoản đã lưu trên thiết bị này.";
  } else {
    $("#loginHint").textContent = "";
  }
}

function render() {
  applyTitle();
  const me = getMe();
  if (!me) return renderLogin();
  renderShellFor(me);
}

// ====== Gắn sự kiện UI chung ======
function bindCommonEvents() {
  // Đóng alert
  $("#btnAlertOk").addEventListener("click", () => closeBackdrop("alertModal"));
  $("#alertModal").addEventListener("click", (e) => {
    if (e.target?.id === "alertModal") closeBackdrop("alertModal");
  });

  // Login
  $("#btnLogin").addEventListener("click", async () => {
    const username = $("#loginUsername").value?.trim().toLowerCase();
    const password = $("#loginPassword").value ?? "";
    if (!username || !password) return alertBox("Thiếu thông tin", `<div class="help">Vui lòng nhập đầy đủ tài khoản và mật khẩu.</div>`);
    const res = await doLogin(username, password);
    if (!res.ok) return alertBox("Đăng nhập thất bại", `<div class="help">${escapeHtml(res.message)}</div>`);

    // Hỏi lưu tài khoản (chỉ hỏi 1 lần, theo yêu cầu)
    const rememberChoice = localStorage.getItem(KEY_REMEMBER_CHOICE);
    if (!rememberChoice) {
      openBackdrop("rememberModal");
      $("#btnRememberYes").onclick = () => {
        localStorage.setItem(KEY_REMEMBER_CHOICE, "save");
        localStorage.setItem(KEY_REMEMBER_USER, username);
        localStorage.setItem(KEY_REMEMBER_PASS, password);
        closeBackdrop("rememberModal");
        render();
      };
      $("#btnRememberNo").onclick = () => {
        localStorage.setItem(KEY_REMEMBER_CHOICE, "nosave");
        localStorage.removeItem(KEY_REMEMBER_USER);
        localStorage.removeItem(KEY_REMEMBER_PASS);
        closeBackdrop("rememberModal");
        render();
      };
      return; // chờ lựa chọn rồi render
    }

    // Nếu đã chọn “Lưu” trước đó thì cập nhật giá trị mới
    if (rememberChoice === "save") {
      localStorage.setItem(KEY_REMEMBER_USER, username);
      localStorage.setItem(KEY_REMEMBER_PASS, password);
    }

    render();
  });

  $("#btnLoginClearSaved").addEventListener("click", () => {
    localStorage.removeItem(KEY_REMEMBER_CHOICE);
    localStorage.removeItem(KEY_REMEMBER_USER);
    localStorage.removeItem(KEY_REMEMBER_PASS);
    alertBox("Đã xoá", `<div class="help">Đã xoá thông tin đăng nhập đã lưu trên thiết bị này.</div>`);
  });

  // Logout / đổi mật khẩu
  $("#btnLogout").addEventListener("click", logout);
  $("#btnChangePassword").addEventListener("click", () => {
    $("#oldPass").value = "";
    $("#newPass").value = "";
    $("#newPass2").value = "";
    $("#passMsg").textContent = "";
    openBackdrop("passwordModal");
  });
  $("#btnPassCancel").addEventListener("click", () => closeBackdrop("passwordModal"));
  $("#passwordModal").addEventListener("click", (e) => {
    if (e.target?.id === "passwordModal") closeBackdrop("passwordModal");
  });
  $("#btnPassSave").addEventListener("click", async () => {
    const me = getMe();
    if (!me) return;
    const oldPass = $("#oldPass").value ?? "";
    const newPass = $("#newPass").value ?? "";
    const newPass2 = $("#newPass2").value ?? "";
    if (newPass !== newPass2) {
      $("#passMsg").textContent = "Mật khẩu mới nhập lại không khớp.";
      return;
    }
    const res = await changePassword(me, oldPass, newPass);
    if (!res.ok) {
      $("#passMsg").textContent = res.message;
      return;
    }
    closeBackdrop("passwordModal");

    // Nếu đã lưu mật khẩu trên thiết bị này thì cập nhật
    if (localStorage.getItem(KEY_REMEMBER_CHOICE) === "save" && localStorage.getItem(KEY_REMEMBER_USER) === me.username) {
      localStorage.setItem(KEY_REMEMBER_PASS, newPass);
    }
    alertBox("Đổi mật khẩu thành công", `<div class="help">Bạn đã đổi mật khẩu thành công.</div>`);
  });
}

// ====== Đồng hồ giờ Việt Nam (header) ======
function startClock() {
  const el = $("#vnClock");
  const tick = () => (el.textContent = fmtVNTime(Date.now()));
  tick();
  setInterval(tick, 1000);
}

// ====== Khởi tạo ======
async function main() {
  await ensureSeedDev();
  applyTitle();
  startClock();
  bindCommonEvents();
  render();
}

main();
