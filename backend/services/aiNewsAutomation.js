const axios = require('axios');
const db = require('../config/db');
const mlEngine = require('./mlEngine');

/**
 * AI News Automation Service
 * - Every 4 hours: 
 *   1. Fetches live market trends from CoinGecko via mlEngine
 *   2. Generates a concise AI market bulletin
 *   3. Posts it to the B20 Official Bulletin (announcements table)
 */

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

async function generateAndPostNews() {
    console.log('[AI-News] 🤖 Starting automated market news generation...');
    try {
        // 1. Get raw trend data
        const trends = await mlEngine.getTrendForecast();
        
        if (!trends || !trends.trendingCoins || trends.trendingCoins.length === 0) {
            console.log('[AI-News] ⚠️ Insufficient trend data to generate news.');
            return;
        }

        // 2. Prepare context for AI
        const topCoins = trends.trendingCoins.slice(0, 5).map(c => `${c.name} (${c.symbol.toUpperCase()})`).join(', ');
        const categories = (trends.categories || []).slice(0, 3).map(c => c.name).join(', ');
        
        // 3. Generate content
        // We can either use a real AI call or a highly sophisticated template if keys are missing
        let content = '';
        try {
            const aiResponse = await mlEngine.runNeuraChat([
                { role: 'user', content: `System: You are the B20 Official Market Analyst. Create a high-impact, professional, yet punchy market update bulletin for the B20 Exchange. Focus on trending assets and high-growth sectors. Keep it under 60 words. Use emojis. No greetings.\n\nContext: Current Trends: ${topCoins}. Exploding Categories: ${categories}. Forecast: ${trends.forecast}` }
            ]);
            content = aiResponse.text || aiResponse.reply;
        } catch (e) {
            console.warn('[AI-News] AI call failed, using fallback template.');
        }

        if (!content || content.includes('neural links') || content.includes('basic mode')) {
            // Fallback content if AI fails or returns error msg/basic mode
            content = `🚀 Market Update: ${trends.forecast}\n\n🔥 Trending Assets: ${topCoins}\n💎 Growth Sectors: ${categories}\n\nStay ahead of the curve with B20 AI Intelligence.`;
        }

        // 4. Randomize highlights
        const randomCoin = trends.trendingCoins[Math.floor(Math.random() * trends.trendingCoins.length)];
        
        // 5. Post to DB
        await db.query(
            "INSERT INTO announcements (content, likes, token_symbol, token_name, token_logo) VALUES (?, ?, ?, ?, ?)",
            [
                content, 
                Math.floor(Math.random() * (2200 - 1500 + 1)) + 1500, // High engagement for AI news
                randomCoin.symbol.toUpperCase(),
                randomCoin.name,
                randomCoin.large || randomCoin.thumb || ''
            ]
        );

        console.log('[AI-News] ✅ Automated bulletin posted successfully.');
    } catch (err) {
        console.error('[AI-News] ❌ News automation cycle failed:', err.message);
    }
}

function startNewsAutomation() {
    console.log('[AI-News] 📡 B20 AI News Automation active (4h cycle)');
    
    // Initial run after 5 minutes of startup
    setTimeout(generateAndPostNews, 5 * 60 * 1000);
    
    // Scheduled runs
    setInterval(generateAndPostNews, FOUR_HOURS_MS);
}

module.exports = { startNewsAutomation, generateAndPostNews };
