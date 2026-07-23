const db = require('d:/KhoaLuanTotNghiep2026/src/backend/config/database');
const preferenceService = require('d:/KhoaLuanTotNghiep2026/src/backend/services/preferenceService.js');

async function test() {
    console.log("=== TEST CHATBOT MESSAGE SENTIMENT WITH REAL PREFERENCESERVICE ===");
    
    // Câu 1: Không thích trực tiếp
    const text1 = "tôi không thích món lẩu cá";
    console.log(`\nCâu 1: "${text1}"`);
    const count1 = await preferenceService.processChatbotMessagePreference(3, text1, false);
    console.log("-> Đã xử lý xong. Hãy kiểm tra DB.");

    // Câu 2: Không muốn ăn
    const text2 = "tôi không muốn ăn lẩu cá đâu nha";
    console.log(`\nCâu 2: "${text2}"`);
    const count2 = await preferenceService.processChatbotMessagePreference(3, text2, false);
    console.log("-> Đã xử lý xong. Hãy kiểm tra DB.");

    // Câu 3: Tích cực để đối chiếu
    const text3 = "lẩu cá ở đây ngon quá trời luôn";
    console.log(`\nCâu 3: "${text3}"`);
    const count3 = await preferenceService.processChatbotMessagePreference(3, text3, false);
    console.log("-> Đã xử lý xong. Hãy kiểm tra DB.");

    console.log("\n=== CÁC BẢN GHI MỚI NHẤT TRONG DB ===");
    const [rows] = await db.query(`
        SELECT ma_insight, ma_mon, ten_mon, tag_key, sentiment, score_delta, evidence, ngay_tao
        FROM chatbot_preference_insights
        WHERE ma_nguoi_dung = 3 AND ten_mon = 'Lẩu cá '
        ORDER BY ma_insight DESC
        LIMIT 5
    `);

    rows.forEach(r => {
        console.log(`ID: ${r.ma_insight} | Món: ${r.ten_mon} | Tag: ${r.tag_key} | Sentiment: ${r.sentiment} | Score Delta: ${r.score_delta} | Evidence: "${r.evidence}"`);
    });

    await db.end();
}

test();
