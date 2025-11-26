// producer.js
const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'recipe-app',
  brokers: ['localhost:9092'], // adjust if different
});

const producer = kafka.producer();

async function main() {
  await producer.connect();

  // Simulate a few "RecipeSaved" events
  const events = [
    { user: 'kaylee', recipeId: 'r1' },
    { user: 'alex', recipeId: 'r2' },
    { user: 'kaylee', recipeId: 'r3' },
  ];

  for (const evt of events) {
    const message = {
      type: 'RecipeSaved',
      user: evt.user,
      recipeId: evt.recipeId,
      timestamp: new Date().toISOString(),
    };

    console.log('Producing event:', message);

    await producer.send({
      topic: 'recipe-events',
      messages: [
        {
          key: 'RecipeSaved',
          value: JSON.stringify(message),
        },
      ],
    });
  }

  await producer.disconnect();
  console.log('Done producing events.');
}

main().catch((err) => {
  console.error('Error in producer:', err);
  process.exit(1);
});
