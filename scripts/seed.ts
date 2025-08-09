import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { speakers, quotes, users } from "~/server/db/schema";
import { env } from "~/env";

// Create a standalone connection for seeding
const client = postgres(env.DATABASE_URL);
const db = drizzle(client);

async function seedData() {
  try {
    console.log("🌱 Starting to seed database...");

    // Check if we already have data
    const existingSpeakers = await db.select().from(speakers).limit(1);
    if (existingSpeakers.length > 0) {
      console.log("Database already has speakers, skipping seed.");
      return;
    }

    // Get the first user (owner) to use as creator
    const firstUser = await db.select().from(users).limit(1);
    if (firstUser.length === 0) {
      console.log(
        "No users found. Please sign in first, then run the seed script.",
      );
      return;
    }

    const createdById = firstUser[0]!.id;

    // Add some initial speakers
    const speakerInserts = [
      { name: "Albert Einstein", createdById },
      { name: "Winston Churchill", createdById },
      { name: "Mark Twain", createdById },
      { name: "Maya Angelou", createdById },
      { name: "Oscar Wilde", createdById },
      { name: "Yogi Berra", createdById },
    ];

    const insertedSpeakers = await db
      .insert(speakers)
      .values(speakerInserts)
      .returning();
    console.log(`✅ Added ${insertedSpeakers.length} speakers`);

    // Add some initial quotes
    const quoteInserts = [
      {
        content: "Imagination is more important than knowledge.",
        speakerId: insertedSpeakers[0]!.id,
        submittedById: createdById,
      },
      {
        content:
          "Success is not final, failure is not fatal: it is the courage to continue that counts.",
        speakerId: insertedSpeakers[1]!.id,
        submittedById: createdById,
      },
      {
        content: "The secret of getting ahead is getting started.",
        speakerId: insertedSpeakers[2]!.id,
        submittedById: createdById,
      },
      {
        content:
          "If you don't like something, change it. If you can't change it, change your attitude.",
        speakerId: insertedSpeakers[3]!.id,
        submittedById: createdById,
      },
      {
        content: "Be yourself; everyone else is already taken.",
        speakerId: insertedSpeakers[4]!.id,
        submittedById: createdById,
      },
      {
        content: "It ain't over 'til it's over.",
        speakerId: insertedSpeakers[5]!.id,
        submittedById: createdById,
      },
    ];

    const insertedQuotes = await db
      .insert(quotes)
      .values(quoteInserts)
      .returning();
    console.log(`✅ Added ${insertedQuotes.length} quotes`);

    console.log("🎉 Database seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
  } finally {
    await client.end();
  }
}

// Run the seed function
void seedData();
