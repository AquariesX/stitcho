import { PrismaClient } from '@prisma/client';

// Use the singleton pattern to avoid multiple instances in development
const globalForPrisma = global as unknown as { prisma: PrismaClient };

const PRIMARY_URL = process.env.DATABASE_URL;
const FALLBACK_URL = process.env.LOCAL_DATABASE_URL || "mysql://root:@localhost:3306/stitcho";

function createPrismaClient(url?: string) {
    if (!url) {
        return new PrismaClient({ log: ['error', 'warn'] });
    }
    return new PrismaClient({
        datasources: { db: { url } },
        log: ['error', 'warn'],
    });
}

function isConnectionError(error: any) {
    return (
        error?.code === 'P1001' ||
        error?.code === 'P1002' ||
        error?.code === 'P1011' ||
        error?.code === 'P1024' ||
        error?.name === 'PrismaClientInitializationError' ||
        (error?.message && (error.message.includes("database server") || error.message.includes("timed out")))
    );
}

// We wrap the PrismaClient in a Proxy. This allows us to catch connection errors 
// on the fly, and dynamically switch to the local database URL if they occur.
let activePrisma = createPrismaClient(PRIMARY_URL);
let isUsingFallback = false;

const fallbackHandler: ProxyHandler<PrismaClient> = {
    get(target, prop) {
        const value = (activePrisma as any)[prop];

        if (typeof value === 'function') {
            return async (...args: any[]) => {
                try {
                    return await value.apply(activePrisma, args);
                } catch (error: any) {
                    if (!isUsingFallback && isConnectionError(error)) {
                        console.warn(`[Prisma] Primary database connection failed. Falling back to local database...`);
                        isUsingFallback = true;
                        activePrisma = createPrismaClient(FALLBACK_URL);
                        return await (activePrisma as any)[prop].apply(activePrisma, args);
                    }
                    throw error;
                }
            };
        }

        if (typeof value === 'object' && value !== null) {
            return new Proxy(value, {
                get(modelTarget, modelProp) {
                    const modelFunc = (activePrisma as any)[prop][modelProp];
                    if (typeof modelFunc === 'function') {
                        return async (...args: any[]) => {
                            try {
                                return await modelFunc.apply((activePrisma as any)[prop], args);
                            } catch (error: any) {
                                if (!isUsingFallback && isConnectionError(error)) {
                                    console.warn(`[Prisma] Primary database connection failed. Falling back to local database...`);
                                    isUsingFallback = true;
                                    activePrisma = createPrismaClient(FALLBACK_URL);

                                    const fallbackModelFunc = (activePrisma as any)[prop][modelProp];
                                    return await fallbackModelFunc.apply((activePrisma as any)[prop], args);
                                }
                                throw error;
                            }
                        };
                    }
                    return modelFunc;
                }
            });
        }

        return value;
    }
};

export const prisma = globalForPrisma.prisma || new Proxy({} as PrismaClient, fallbackHandler);

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

export default prisma;
