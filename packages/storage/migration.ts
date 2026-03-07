import { db } from "./db";

export async function migrateAnonymousToUser(ownerId: string): Promise<number> {
    return await db.transaction('rw', db.entries, db.rules, async () => {
        let count = 0;

        // Migrate Entries
        const anonymousEntries = await db.entries.filter(entry => !entry.owner_id).toArray();
        if (anonymousEntries.length > 0) {
            const updatedEntries = anonymousEntries.map(entry => ({ ...entry, owner_id: ownerId }));
            await db.entries.bulkPut(updatedEntries);
            count += updatedEntries.length;
        }

        // Migrate Rules
        const anonymousRules = await db.rules.filter(rule => !rule.owner_id).toArray();
        if (anonymousRules.length > 0) {
            const updatedRules = anonymousRules.map(rule => ({ ...rule, owner_id: ownerId }));
            await db.rules.bulkPut(updatedRules);
        }

        return count;
    });
}
