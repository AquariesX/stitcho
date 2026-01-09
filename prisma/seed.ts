
import { PrismaClient, Role } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const superAdmin = await prisma.user.upsert({
        where: { firebaseUid: 'super-admin-seed-id' },
        update: {},
        create: {
            firebaseUid: 'super-admin-seed-id',
            email: 'admin',
            name: 'Super Admin',
            role: Role.ADMIN,
            phoneNumber: '0000000000',
        },
    })
    console.log({ superAdmin })
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
