/**
 * One-time seed: creates the demo account and attaches all pre-existing
 * (orphan) activities and analyses to it. Run with: bun scripts/seed-demo.ts
 */
import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes } from "crypto";

const db = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  const email = "demo@formfit.app";
  let user = await db.user.findUnique({ where: { email } });

  if (!user) {
    user = await db.user.create({
      data: {
        email,
        name: "Demo Athlete",
        passwordHash: hashPassword("demo1234"),
      },
    });
    console.log("Created demo user:", user.id);
  } else {
    console.log("Demo user already exists:", user.id);
  }

  const orphanActivities = await db.activity.updateMany({
    where: { userId: null },
    data: { userId: user.id },
  });
  const orphanAnalyses = await db.formAnalysis.updateMany({
    where: { userId: null },
    data: { userId: user.id },
  });

  console.log(`Attached ${orphanActivities.count} activities and ${orphanAnalyses.count} analyses to the demo user.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
