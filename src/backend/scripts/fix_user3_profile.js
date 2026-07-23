const db = require('../config/database');
const { rebuildUserPreferenceProfile } = require('../services/preferenceService');

async function fix() {
    try {
        console.log("1. Deleting incorrect chatbot insights for keyword 'cua'...");
        const [delResult] = await db.query(
            "DELETE FROM chatbot_preference_insights WHERE evidence = 'cua'"
        );
        console.log(`Deleted ${delResult.affectedRows} rows.`);

        console.log("2. Rebuilding preference profile for user 3 (Thuật Thuật)...");
        await rebuildUserPreferenceProfile(3);
        console.log("User 3 preference profile rebuilt successfully.");

        // Print new profile to verify
        const [profile] = await db.query(
            "SELECT tag_key, score FROM user_preference_profile WHERE ma_nguoi_dung = 3"
        );
        console.log("\nNew User 3 Preference Profile:");
        profile.forEach(p => {
            console.log(`  Tag: ${p.tag_key}, Score: ${p.score}`);
        });

    } catch (e) {
        console.error("Error running fix:", e);
    } finally {
        process.exit(0);
    }
}

fix();
