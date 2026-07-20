/**
 * Gemini AI Service
 * Uses @google/generative-ai SDK (gemini-1.5-flash model)
 */

let genAI = null;

function getClient() {
  if (!genAI) {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set in .env');
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

/**
 * Generate a human-readable insight narrative for a given report
 * @param {string} reportType  - 'salesman' | 'party' | 'supplier'
 * @param {object} data        - structured report data object
 * @returns {Promise<string>}  - AI-generated narrative
 */
async function generateReportInsight(reportType, data) {
  const client = getClient();
  const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompts = {
    salesman: `You are a business analyst for an automotive parts distribution company.
Analyse the following salesman-wise performance data and provide a concise 3-5 sentence insight.
Focus on: top performers, underperformers, growth trends, and one actionable recommendation.
Data: ${JSON.stringify(data, null, 2)}
Reply in plain text only (no markdown).`,

    party: `You are a business analyst for an automotive parts distribution company.
Analyse the following party (customer) wise purchase data and provide a concise 3-5 sentence insight.
Focus on: top customers, buying patterns, growth vs decline, and one actionable recommendation.
Data: ${JSON.stringify(data, null, 2)}
Reply in plain text only (no markdown).`,

    supplier: `You are a business analyst for an automotive parts distribution company.
Analyse the following supplier-wise purchase order data and provide a concise 3-5 sentence insight.
Focus on: top suppliers, order frequency, value trends, and one actionable recommendation.
Data: ${JSON.stringify(data, null, 2)}
Reply in plain text only (no markdown).`,
  };

  const prompt = prompts[reportType] || prompts.salesman;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    console.error('[Gemini] generateReportInsight error:', err.message);
    throw new Error('AI insight generation failed. Please check your GEMINI_API_KEY.');
  }
}

module.exports = { generateReportInsight };
