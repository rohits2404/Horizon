"use server";

import { Client, Account, TablesDB, Users } from "node-appwrite";
import { cookies } from "next/headers";

export async function createSessionClient() {
    const client = new Client()
        .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
        .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!);

    const cookieStore = await cookies();
    const session = cookieStore.get("appwrite-session");

    if (!session?.value) {
        return null;
    }

    client.setSession(session.value);

    return {
        get account() {
            return new Account(client);
        },

        get tablesDB() {
            return new TablesDB(client);
        },
    };
}

export async function createAdminClient() {
    const client = new Client()
        .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
        .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
        .setKey(process.env.NEXT_APPWRITE_KEY!);

    return {
        get account() {
            return new Account(client);
        },

        get tablesDB() {
            return new TablesDB(client);
        },

        get user() {
            return new Users(client);
        },
    };
}
