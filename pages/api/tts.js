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
    const { text, languageCode, voiceName, speakingRate = 0.85, pitch = 0, volumeGainDb = 0 } = req.body;
    
    // Validation
    if (!text || !languageCode) {
      return res.status(400).json({ error: 'Missing required fields: text, languageCode' });
    }

    if (text.length > 5000) {
      return res.status(400).json({ error: 'Text too long (max 5000 characters)' });
    }

    // Get API key from environment
    const apiKey = process.env.GOOGLE_TTS_API_KEY;
    if (!apiKey) {
      console.error('GOOGLE_TTS_API_KEY not configured');
      return res.status(500).json({ error: 'TTS service not configured' });
    }

    // Prepare request for Google TTS API
    const googleUrl = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
    
    const requestBody = {
      input: { text },
      voice: { 
        languageCode, 
        name: voiceName || getDefaultVoice(languageCode)
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: parseFloat(speakingRate) || 0.85,
        pitch: parseFloat(pitch) || 0.0,
        volumeGainDb: parseFloat(volumeGainDb) || 0.0,
        effectsProfileId: ['headphone-class-device']
      }
    };

    console.log(`TTS Request: ${text.substring(0, 50)}... (${languageCode})`);

    // Call Google TTS API
    const response = await fetch(googleUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'HinbunApp-Proxy/1.0'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google TTS API Error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: 'TTS service failed',
        details: response.status === 403 ? 'API key restrictions or quota exceeded' : 'Service temporarily unavailable'
      });
    }

    const data = await response.json();
    
    if (!data.audioContent) {
      return res.status(500).json({ error: 'Invalid response from TTS service' });
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error('TTS Proxy Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Helper function for default voices
function getDefaultVoice(languageCode) {
  const voiceMap = {
    'tr-TR': 'tr-TR-Chirp3-HD-Algenib',
    'en-US': 'en-US-Chirp-HD-F',
    'nb-NO': 'nb-NO-Chirp3-HD-Alnilam',
    'pl-PL': 'pl-PL-Chirp3-HD-Charon',
    'es-ES': 'es-ES-Neural2-F',
    'fr-FR': 'fr-FR-Neural2-D',
    'de-DE': 'de-DE-Neural2-D'
  };
  return voiceMap[languageCode] || 'en-US-Chirp-HD-F';
}
