/*
 * Textwell Action: datetime parser
 *
 * 概要:
 * 選択範囲または全文の日付記述を解析し、日本語フォーマット（曜日付き）に変換します。
 *
 * 変換仕様:
 * 1. 日付 + 時間範囲
 *    入力: 2026-02-18 09:00-16:00
 *    出力: 2026年2月18日（水）　09:00〜16:00
 *    （既存の曜日があっても無視し、正しい曜日で上書きします）
 *
 * 2. 日付のみ（年あり）
 *    入力: 2026-02-18
 *    出力: 2026年2月18日（水）
 *
 * 3. 日付のみ（年なし）
 *    入力: 2/18
 *    出力: 2月18日（水）
 *    （年が省略された場合、今日より未来なら今年、過去なら来年として計算します）
 *
 * 共通仕様:
 * - 区切り文字はハイフン(-)またはスラッシュ(/)に対応
 * - 曜日は全角括弧（）で囲む
 * - 時間範囲の区切りは「〜」を使用
 * - 選択範囲がある場合はその部分のみ、なければ全文を対象とする
 */

(function () {
    // Textwell: T.whole は選択範囲があればそれ、なければ全文
    var src = T.whole || "";
    if (!src) {
        T('done');
        return;
    }

    var WEEK = ["日", "月", "火", "水", "木", "金", "土"];

    // 日付の妥当性チェック
    function isValidYMD(y, m, d) {
        var dt = new Date(y, m - 1, d);
        return (
            dt.getFullYear() === y &&
            dt.getMonth() === (m - 1) &&
            dt.getDate() === d
        );
    }

    // 年月日から日本語の曜日を計算
    function jaWeekday(y, m, d) {
        if (!isValidYMD(y, m, d)) return null;
        var dt = new Date(y, m - 1, d);
        return WEEK[dt.getDay()];
    }

    // 年なし日付の年を推測（未来優先）
    function predictYear(m, d) {
        var today = new Date();
        var currentYear = today.getFullYear();
        var currentMonth = today.getMonth() + 1; // 1-12
        var currentDay = today.getDate();

        // 入力された (m, d) が今日より過去の場合、翌年とみなす
        // 例: 今日が2/19の場合、入力2/18 -> 来年、入力2/19 -> 今年
        if (m < currentMonth || (m === currentMonth && d < currentDay)) {
            return currentYear + 1;
        }
        return currentYear;
    }

    // --- ステップ 1: 時間範囲の正規化 ---
    // "日付 時間-時間" を見つけ、時間部分のフォーマットを整える
    // 2026-02-18 09:00-16:00 -> 2026-02-18　09:00〜16:00
    // (既存の曜日記述があっても、次のステップで処理されるためここでは維持)
    var rangeProp = /((?:\d{4}[-\/])?\d{1,2}[-\/]\d{1,2}(?:\s*[（(][月火水木金土日][）)])?)\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/g;
    var out = src.replace(rangeProp, function (match, datePart, t1, t2) {
        // 時間部分の区切り文字とスペースを正規化
        return datePart + "　" + t1 + "〜" + t2;
    });

    // --- ステップ 2: 日付部分のフォーマット（曜日追加/更新） ---
    // 2026-02-18 ... -> 2026年2月18日（水） ...
    // 日付のみの場合と、ステップ1で正規化された時間付きの場合の両方を処理
    var dateRegex = /(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})(?:\s*[（(][月火水木金土日][）)])?/g;
    out = out.replace(dateRegex, function (match, y, m, d) {
        var yy = parseInt(y, 10);
        var mm = parseInt(m, 10);
        var dd = parseInt(d, 10);
        var wd = jaWeekday(yy, mm, dd);
        if (!wd) return match;

        // フォーマット: YYYY年M月D日（W）
        return yy + "年" + mm + "月" + dd + "日（" + wd + "）";
    });

    // --- ステップ 3: 年なし日付 (M/D) のフォーマット ---
    // 2/20 -> 2月20日（金）
    // 今日の日付を基準に年を推測（過去なら翌年）
    // 正規表現: YYYY-MM-DD の一部ではない単独の M-D または M/D にマッチ
    // ステップ2で年付きの日付は既に置換済みなので、残っている M-D 形式が対象
    var shortDateRegex = /\b(\d{1,2})[-\/](\d{1,2})(?:\s*[（(][月火水木金土日][）)])?/g;

    out = out.replace(shortDateRegex, function (match, m, d) {
        var mm = parseInt(m, 10);
        var dd = parseInt(d, 10);
        var yy = predictYear(mm, dd);

        var wd = jaWeekday(yy, mm, dd);
        if (!wd) return match;

        // フォーマット: M月D日（W） (年は含めない)
        return mm + "月" + dd + "日（" + wd + "）";
    });

    // Textwell: replaceWhole は「選択があれば選択を、なければ全文を」置換
    T('replaceWhole', { text: out });
})();
