/*
 * Textwell Action: datetime parser (range + date)
 * - If there is a selection: replace selection
 * - If there is no selection: replace whole text
 *
 * Priority 1:
 *   2026-02-18 09:00-16:00
 *   -> 2026年2月18日(水)　09:00〜16:00
 *
 * Priority 2:
 *   2026-02-18 / 2026/2/18 / 2026/02/18 (optional existing weekday)
 *   -> 2026-02-18 (水)
 */

(function () {
    // Textwell: T.whole = selection if exists, otherwise whole text :contentReference[oaicite:0]{index=0}
    var src = T.whole || "";
    if (!src) {
        T('done');
        return;
    }

    var WEEK = ["日", "月", "火", "水", "木", "金", "土"];

    function isValidYMD(y, m, d) {
        var dt = new Date(y, m - 1, d);
        return (
            dt.getFullYear() === y &&
            dt.getMonth() === (m - 1) &&
            dt.getDate() === d
        );
    }

    function jaWeekday(y, m, d) {
        if (!isValidYMD(y, m, d)) return null;
        var dt = new Date(y, m - 1, d);
        return WEEK[dt.getDay()];
    }

    // --- Priority 1: datetime range ---
    // 2026-02-18 09:00-16:00 / 2026/2/18 9:00-16:00 etc.
    var rangeRegex = /(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/g;

    var out = src.replace(rangeRegex, function (match, y, m, d, t1, t2) {
        var yy = parseInt(y, 10);
        var mm = parseInt(m, 10);
        var dd = parseInt(d, 10);
        var wd = jaWeekday(yy, mm, dd);
        if (!wd) return match;
        // 全角スペース（　）＋ 〜
        return yy + "年" + mm + "月" + dd + "日(" + wd + ")　" + t1 + "〜" + t2;
    });

    // --- Priority 2: date only ---
    // 2026-02-18, 2026/02/18, 2026/2/18
    // 既存の (月火水木金土日) があっても更新（重複させない）
    var dateRegex = /(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})(?:\s*\([月火水木金土日]\))?/g;

    out = out.replace(dateRegex, function (match, y, m, d) {
        var yy = parseInt(y, 10);
        var mm = parseInt(m, 10);
        var dd = parseInt(d, 10);
        var wd = jaWeekday(yy, mm, dd);
        if (!wd) return match;

        // YYYY-MM-DD はゼロ埋め固定（Templater版の仕様に合わせる）
        var mm2 = String(mm).padStart(2, "0");
        var dd2 = String(dd).padStart(2, "0");
        return yy + "-" + mm2 + "-" + dd2 + " (" + wd + ")";
    });

    // Textwell: replaceWhole は「選択があれば選択を、なければ全文を」置換 :contentReference[oaicite:1]{index=1}
    T('replaceWhole', { text: out });
})();
