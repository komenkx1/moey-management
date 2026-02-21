import Dexie, { type Table } from "dexie";
import type { CategoryRule, Entry } from "../core/types";

export interface KemanaMeta {
    key: string;
    value: string;
}

export class KemanaDB extends Dexie {
    entries!: Table<Entry, string>;
    rules!: Table<CategoryRule, string>;
    meta!: Table<KemanaMeta, string>;

    constructor() {
        super("kemana");
        this.version(1).stores({
            entries: "id, date, category, createdAt",
            rules: "pattern",
            meta: "key"
        });
    }
}

export const db = new KemanaDB();
