const admin = require('firebase-admin');

// Initialize Firebase only once
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });
  } catch (err) {
    console.error('Firebase init error:', err);
  }
}

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Check the secret token
  const token = event.headers['x-api-token'] || event.headers['X-Api-Token'];
  if (!token || token !== process.env.TIER_API_TOKEN) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  try {
    const body = JSON.parse(event.body);

    const { player, tier, scores } = body;

    // Basic validation
    if (!player || !tier || !scores || !Array.isArray(scores) || scores.length !== 10) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid data. Need player, tier, and 10 scores.' })
      };
    }

    // Make sure scores are numbers between 0-10
    const cleanScores = scores.map(s => Math.max(0, Math.min(10, Number(s) || 0)));

    const db = admin.database();
    const playerRef = db.ref(`players/${player.toLowerCase()}`);

    // Update the player (keeps existing data like skin)
    await playerRef.update({
      name: player,
      tier: tier.toUpperCase(),
      scores: {
        mechanical: cleanScores[0],
        gamesense: cleanScores[1],
        teamwork: cleanScores[2],
        communication: cleanScores[3],
        consistency: cleanScores[4],
        health: cleanScores[5],
        adaptability: cleanScores[6],
        knowledge: cleanScores[7],
        attitude: cleanScores[8],
        potential: cleanScores[9]
      },
      lastUpdated: Date.now()
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `${player} set to ${tier.toUpperCase()}`
      })
    };

  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server error', details: err.message })
    };
  }
};
