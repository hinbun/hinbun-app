// /api/tts.js
export default async function handler(req, res) {
  // CORS headers - sadece kendi uygulamanızdan gelen istekleri kabul et
  res.setHeader('Access-Control-Allow-Origin', '*'); // Sonra kısıtlayacağız
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, languageCode, voiceName, speakingRate = 0.85, pitch = 0 } = req.body;
    
    if (!text || !languageCode) {
      return res.status(400).json({ error: 'Missing text or languageCode' });
    }

    // Güvenlik: Text uzunluğu kontrolü
    if (text.length > 5000) {
      return res.status(400).json({ error: 'Text too long' });
    }

    // Google TTS API key - sadece sunucuda!
    const apiKey = process.env.GOOGLE_TTS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    const googleUrl = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
    
    const requestBody = {
      input: { text },
      voice: { 
        languageCode, 
        name: voiceName || 'en-US-Chirp-HD-F' 
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: parseFloat(speakingRate),
        pitch: parseFloat(pitch),
        volumeGainDb: 0
      }
    };

    const response = await fetch(googleUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google TTS Error:', errorText);
      return res.status(response.status).json({ error: 'TTS service failed' });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
