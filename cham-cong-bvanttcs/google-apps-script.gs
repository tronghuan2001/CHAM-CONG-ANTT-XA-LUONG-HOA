/**
 * MẪU GOOGLE APPS SCRIPT (Web App) để nhận dữ liệu từ trang chấm công
 *
 * Cách dùng (tóm tắt):
 * 1) Vào https://script.google.com → New project
 * 2) Dán toàn bộ file này vào Code.gs
 * 3) Deploy → New deployment → chọn “Web app”
 *    - Execute as: Me
 *    - Who has access: Anyone (hoặc Anyone with the link)
 * 4) Copy “Web app URL” và dán vào trang web: Dev → Cài đặt → Google Sheets
 *
 * Lưu ý:
 * - Đây là ví dụ tối giản. Bạn có thể bổ sung khoá API/secret để tăng bảo mật.
 */

function doPost(e) {
  try {
    var payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }

    var type = payload.type || "unknown";
    if (type === "ping") {
      return json_({ ok: true, type: type, at: new Date().toISOString() });
    }

    if (type === "user_create") {
      upsertUser_(payload.user);
      return json_({ ok: true, type: type });
    }

    if (type === "attendance") {
      upsertAttendance_(payload.record);
      return json_({ ok: true, type: type });
    }

    if (type === "attendance_delete") {
      markAttendanceDeleted_(payload.username, payload.date);
      return json_({ ok: true, type: type });
    }

    return json_({ ok: false, message: "Loại dữ liệu không hỗ trợ: " + type });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (headers && sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function upsertUser_(user) {
  if (!user || !user.username) return;
  var sh = getOrCreateSheet_("users", ["username", "fullName", "role", "updatedAtISO"]);
  var values = sh.getDataRange().getValues();
  var idx = -1;
  for (var r = 1; r < values.length; r++) {
    if (values[r][0] === user.username) { idx = r + 1; break; }
  }
  var row = [user.username, user.fullName || "", user.role || "user", new Date().toISOString()];
  if (idx === -1) sh.appendRow(row);
  else sh.getRange(idx, 1, 1, row.length).setValues([row]);
}

function upsertAttendance_(rec) {
  if (!rec || !rec.username || !rec.date) return;
  var sh = getOrCreateSheet_("attendance", [
    "date",
    "username",
    "fullName",
    "checked",
    "checkedAtVN",
    "startTime",
    "endTime",
    "taskType",
    "note",
    "imagesCount",
    "updatedAtVN",
    "updatedAtISO"
  ]);

  var values = sh.getDataRange().getValues();
  var idx = -1;
  for (var r = 1; r < values.length; r++) {
    if (values[r][0] === rec.date && values[r][1] === rec.username) { idx = r + 1; break; }
  }
  var checkedAtVN = rec.checkedAt ? formatVN_(new Date(rec.checkedAt)) : "";
  var updatedAtVN = rec.updatedAt ? formatVN_(new Date(rec.updatedAt)) : formatVN_(new Date());
  var row = [
    rec.date,
    rec.username,
    rec.fullName || "",
    rec.checked ? "Có" : "Không",
    checkedAtVN,
    rec.startTime || "",
    rec.endTime || "",
    rec.taskType || "",
    rec.note || "",
    (rec.images && rec.images.length) ? rec.images.length : 0,
    updatedAtVN,
    new Date().toISOString()
  ];
  if (idx === -1) sh.appendRow(row);
  else sh.getRange(idx, 1, 1, row.length).setValues([row]);
}

function markAttendanceDeleted_(username, dateStr) {
  if (!username || !dateStr) return;
  var sh = getOrCreateSheet_("attendance_deleted", ["date", "username", "deletedAtVN", "deletedAtISO"]);
  sh.appendRow([dateStr, username, formatVN_(new Date()), new Date().toISOString()]);
}

function formatVN_(d) {
  // Chuyển giờ theo Việt Nam
  return Utilities.formatDate(d, "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");
}
