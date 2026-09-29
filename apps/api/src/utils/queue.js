import Redis from 'ioredis';
import EventEmitter from 'events';

const localBus = new EventEmitter();
const NOTIFICATION_CHANNEL = 'notifications';

let redisPublisher = null;
let redisSubscriber = null;
let isRedisAvailable = false;

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

try {
  redisPublisher = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    retryStrategy: () => null, // Do not spam reconnect if offline
    enableOfflineQueue: false,
    lazyConnect: true,
  });

  redisSubscriber = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
    enableOfflineQueue: false,
    lazyConnect: true,
  });

  redisPublisher.on('error', () => {
    isRedisAvailable = false;
  });

  redisSubscriber.on('error', () => {
    isRedisAvailable = false;
  });

  redisPublisher.connect().then(() => {
    isRedisAvailable = true;
    console.log('✅ Redis publisher connected');
  }).catch(() => {
    isRedisAvailable = false;
    console.log('ℹ️ Redis offline: falling back to in-memory notification bus');
  });

  redisSubscriber.connect().then(() => {
    redisSubscriber.subscribe(NOTIFICATION_CHANNEL, (err) => {
      if (!err) {
        redisSubscriber.on('message', (channel, message) => {
          if (channel === NOTIFICATION_CHANNEL) {
            try {
              localBus.emit('notify', JSON.parse(message));
            } catch (e) {
              console.error('Failed to parse redis notification:', e);
            }
          }
        });
      }
    });
  }).catch(() => {});
} catch (err) {
  console.log('ℹ️ Redis unavailable: using in-memory bus');
}

export function publishNotification(notification) {
  // Always dispatch locally so current instance receives it
  localBus.emit('notify', notification);

  // If Redis is active, distribute to other instances as well
  if (isRedisAvailable && redisPublisher && redisPublisher.status === 'ready') {
    redisPublisher.publish(NOTIFICATION_CHANNEL, JSON.stringify(notification)).catch(() => {});
  }
}

export function subscribeNotifications(handler) {
  localBus.on('notify', handler);
}
