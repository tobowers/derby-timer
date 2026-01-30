import { umzug } from "./db/umzug";

async function main() {
  try {
    console.log("Running migrations...");
    const migrations = await umzug.up();
    console.log(`Applied ${migrations.length} migration(s)`);
    for (const migration of migrations) {
      console.log(`  - ${migration.name}`);
    }
    console.log("Migrations complete!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

main();
