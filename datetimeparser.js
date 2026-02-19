/*
 * Textwell Action: datetime parser (range + date)
 * - 選択範囲がある場合: 選択範囲を置換
 * - 選択範囲がない場合: 全文を置換
 *
 * 優先度 1:
 *   2026-02-18 09:00-16:00
 *   -> 2026年2月18日（水）　09:00〜16:00
 *
 * 優先度 2:
 *   2026-02-18 / 2026/2/18 / 2026/02/18 (曜日が既にあっても可)
 *   -> 2026年2月18日（水）
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

    function predictYear(m, d) {
        var today = new Date();
        var currentYear = today.getFullYear();
        var currentMonth = today.getMonth() + 1; // 1-12
        var currentDay = today.getDate();

        // Compare (m, d) with (currentMonth, currentDay)
        // If (m, d) is strictly before today, assume next year.
        // E.g. Today is 2/19. Input 2/18 -> Next year. Input 2/19 -> This year.
        if (m < currentMonth || (m === currentMonth && d < currentDay)) {
            return currentYear + 1;
        }
        return currentYear;
    }

    // --- Step 1: Normalize time range part ---
    // Look for "Date + Time-Time" and format the time part first
    // 2026-02-18 09:00-16:00 -> 2026-02-18　09:00〜16:00
    // (Existing weekdays like (Mon) or （月） are kept for now, will be handled in Step 2)
    var rangeProp = /((?:\d{4}[-\/])?\d{1,2}[-\/]\d{1,2}(?:\s*[（(][月火水木金土日][）)])?)\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/g;
    var out = src.replace(rangeProp, function (match, datePart, t1, t2) {
        // Just normalize the separator and spacing for the time part
        return datePart + "　" + t1 + "〜" + t2;
    });

    // --- Step 2: Format date part (and add/update weekday) ---
    // 2026-02-18 ... -> 2026年2月18日（水） ...
    // This handles both "Date only" and "Date + Normalized Time" cases
    var dateRegex = /(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})(?:\s*[（(][月火水木金土日][）)])?/g;
    out = out.replace(dateRegex, function (match, y, m, d) {
        var yy = parseInt(y, 10);
        var mm = parseInt(m, 10);
        var dd = parseInt(d, 10);
        var wd = jaWeekday(yy, mm, dd);
        if (!wd) return match;

        // Date format: YYYY年M月D日（W）
        return yy + "年" + mm + "月" + dd + "日（" + wd + "）";
    });

    // --- Step 3: Format yearless date (M/D) ---
    // 2/20 -> 2月20日（金）
    // Logic: Infer year based on today. If past, use next year.
    // Regex: Match "M-D" or "M/D" that are NOT part of a YYYY-MM-DD (checked by \b boundary or previous steps)
    // To be safe, we match boundaries where a year isn't preceding.
    // However, since Step 2 already replaced YYYY-MM-DD with "YYYY年...", 
    // any remaining "M-D" or "M/D" patterns are likely yearless inputs.
    var shortDateRegex = /\b(\d{1,2})[-\/](\d{1,2})(?:\s*[（(][月火水木金土日][）)])?/g;

    out = out.replace(shortDateRegex, function (match, m, d) {
        var mm = parseInt(m, 10);
        var dd = parseInt(d, 10);
        var yy = predictYear(mm, dd);

        var wd = jaWeekday(yy, mm, dd);
        if (!wd) return match;

        // Date format: M月D日（W） (No year)
        return mm + "月" + dd + "日（" + wd + "）";
    });

    // Textwell: replaceWhole は「選択があれば選択を、なければ全文を」置換 :contentReference[oaicite:1]{index=1}
    T('replaceWhole', { text: out });
})();
