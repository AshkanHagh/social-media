import { Redis } from 'ioredis';

const client = () => {
    if(process.env.REDIS_URL) {
        console.log(`Redid connected`);
        return process.env.REDIS_URL;
    }
    throw new Error('Failed to connect redis')
}

const redis = new Redis(client());
export default redis;