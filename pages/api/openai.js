export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, model = 'gpt-4o-mini', maxTokens = 400, temperature = 0.1 } = req.body;
    
    // Validation
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }

    if (messages.length === 0) {
      return res.status(400).json({ error: 'Messages array cannot be empty' });
    }

    // Get API key from environment
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OPENAI_API_KEY not configured');
      return res.status(500).json({ error: 'AI service not configured' });
    }

    console.log(`OpenAI Request: ${model}, ${messages.length} messages`);

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'HinbunApp-Proxy/1.0'
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: parseInt(maxTokens) || 400,
        temperature: parseFloat(temperature) || 0.1,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API Error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: 'AI service failed',
        details: response.status === 401 ? 'Invalid API key' : 'Service temporarily unavailable'
      });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('OpenAI Proxy Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
