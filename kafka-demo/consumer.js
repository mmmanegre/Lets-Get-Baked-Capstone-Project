// consumer.js
const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'recipe-consumer',
  brokers: ['localhost:9092'],
});

const consumer = kafka.consumer({ groupId: 'recipe-group' });

async function main() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'recipe-events', fromBeginning: true });

  console.log('Consumer running... listening for recipe-events');

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const event = JSON.parse(message.value.toString());
      console.log('Received event:', event);

      if (event.type === 'RecipeSaved') {
        console.log(
          `Reacting to RecipeSaved: User ${event.user} saved recipe ${event.recipeId}`
        );
      }
    },
  });
}

main().catch((err) => {
  console.error('Error in consumer:', err);
  process.exit(1);
});
