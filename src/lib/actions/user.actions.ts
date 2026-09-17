"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdminClient, createSessionClient } from "../appwrite";
import { ID, Query } from "node-appwrite";
import { extractCustomerIdFromUrl, parseStringify, encryptId } from "../utils";

import { plaidClient } from "../plaid";

import {
    CountryCode,
    Products,
    ProcessorTokenCreateRequest,
    ProcessorTokenCreateRequestProcessorEnum,
} from "plaid";

import { addFundingSource, createDwollaCustomer } from "./dwolla.actions";

const {
    APPWRITE_DATABASE_ID: DATABASE_ID,
    APPWRITE_USER_TABLE_ID: USER_TABLE_ID,
    APPWRITE_BANK_TABLE_ID: BANK_TABLE_ID,
} = process.env;

// ============================================================
// GET USER INFO
// ============================================================

export const getUserInfo = async ({ userId }: getUserInfoProps) => {
    try {
        const { tablesDB } = await createAdminClient();

        const user = await tablesDB.listRows({
            databaseId: DATABASE_ID!,
            tableId: USER_TABLE_ID!,
            queries: [Query.equal("userId", userId)],
        });

        return parseStringify(user.rows[0]);
    } catch (error) {
        console.error("Error getting user info:", error);
        return null;
    }
};

// ============================================================
// SIGN IN
// ============================================================

export const signIn = async ({ email, password }: signInProps) => {
    try {
        const { account } = await createAdminClient();

        const session = await account.createEmailPasswordSession({
            email,
            password,
        });

        const cookieStore = await cookies();

        cookieStore.set("appwrite-session", session.secret, {
            path: "/",
            httpOnly: true,
            sameSite: "strict",
            secure: process.env.NODE_ENV === "production",
        });

        const user = await getUserInfo({
            userId: session.userId,
        });

        return parseStringify(user);
    } catch (error) {
        console.error("Error signing in:", error);
        return null;
    }
};

// ============================================================
// SIGN UP
// ============================================================

export const signUp = async ({ password, ...userData }: SignUpParams) => {
    const { email, firstName, lastName } = userData;

    try {
        const { account, tablesDB } = await createAdminClient();

        // Create Appwrite authentication account
        const newUserAccount = await account.create({
            userId: ID.unique(),
            email,
            password,
            name: `${firstName} ${lastName}`,
        });

        if (!newUserAccount) {
            throw new Error("Error creating user");
        }

        const dwollaCustomerUrl = await createDwollaCustomer({
            ...userData,
            type: "personal",
        });

        if (!dwollaCustomerUrl)
            throw new Error("Error creating Dwolla customer");

        const dwollaCustomerId = extractCustomerIdFromUrl(dwollaCustomerUrl);

        // Create user row in Appwrite
        const newUser = await tablesDB.createRow({
            databaseId: DATABASE_ID!,
            tableId: USER_TABLE_ID!,
            rowId: ID.unique(),
            data: {
                ...userData,
                userId: newUserAccount.$id,
                dwollaCustomerId,
                dwollaCustomerUrl,
            },
        });

        // Create session
        const session = await account.createEmailPasswordSession({
            email,
            password,
        });

        const cookieStore = await cookies();

        cookieStore.set("appwrite-session", session.secret, {
            path: "/",
            httpOnly: true,
            sameSite: "strict",
            secure: process.env.NODE_ENV === "production",
        });

        return parseStringify(newUser);
    } catch (error) {
        console.error("Error signing up:", error);
        return null;
    }
};

// ============================================================
// GET LOGGED IN USER
// ============================================================

export async function getLoggedInUser() {
    try {
        const sessionClient = await createSessionClient();

        if (!sessionClient) {
            return null;
        }

        const { account } = sessionClient;

        const result = await account.get();

        const user = await getUserInfo({
            userId: result.$id,
        });

        return parseStringify(user);
    } catch (error) {
        console.error("Error getting logged in user:", error);
        return null;
    }
}

// ============================================================
// LOGOUT
// ============================================================

export const logoutAccount = async () => {
    try {
        const sessionClient = await createSessionClient();

        if (!sessionClient) {
            return true;
        }

        const { account } = sessionClient;

        await account.deleteSession({
            sessionId: "current",
        });

        const cookieStore = await cookies();

        cookieStore.delete("appwrite-session");

        return true;
    } catch (error) {
        console.error("Error logging out:", error);
        return false;
    }
};

// ============================================================
// CREATE PLAID LINK TOKEN
// ============================================================

export const createLinkToken = async (user: User) => {
    try {
        const tokenParams = {
            user: {
                client_user_id: user.$id,
            },
            client_name: `${user.firstName} ${user.lastName}`,
            products: ["auth", "transactions"] as Products[],
            language: "en",
            country_codes: ["US"] as CountryCode[],
        };

        const response = await plaidClient.linkTokenCreate(tokenParams);

        return parseStringify({
            linkToken: response.data.link_token,
        });
    } catch (error) {
        console.error("Error creating Plaid link token:", error);
        return null;
    }
};

// ============================================================
// CREATE BANK ACCOUNT
// ============================================================

export const createBankAccount = async ({
    userId,
    bankId,
    accountId,
    accessToken,
    fundingSourceUrl,
    shareableId,
}: createBankAccountProps) => {
    try {
        const { tablesDB } = await createAdminClient();

        const bankAccount = await tablesDB.createRow({
            databaseId: DATABASE_ID!,
            tableId: BANK_TABLE_ID!,
            rowId: ID.unique(),
            data: {
                userId,
                bankId,
                accountId,
                accessToken,
                fundingSourceUrl,
                shareableId,
            },
        });

        return parseStringify(bankAccount);
    } catch (error) {
        console.error("Error creating bank account:", error);
        return null;
    }
};

// ============================================================
// EXCHANGE PLAID PUBLIC TOKEN
// ============================================================

export const exchangePublicToken = async ({
    publicToken,
    user,
}: exchangePublicTokenProps) => {
    try {
        // Exchange public token for access token and item ID
        const response = await plaidClient.itemPublicTokenExchange({
            public_token: publicToken,
        });

        const accessToken = response.data.access_token;
        const itemId = response.data.item_id;

        // Get account information from Plaid
        const accountsResponse = await plaidClient.accountsGet({
            access_token: accessToken,
        });

        const accountData = accountsResponse.data.accounts[0];

        if (!accountData) {
            throw new Error("No bank account found");
        }

        // Create processor token for Dwolla
        const request: ProcessorTokenCreateRequest = {
            access_token: accessToken,
            account_id: accountData.account_id,
            processor: "dwolla" as ProcessorTokenCreateRequestProcessorEnum,
        };

        const processorTokenResponse =
            await plaidClient.processorTokenCreate(request);

        const processorToken = processorTokenResponse.data.processor_token;

        // Create funding source
        const fundingSourceUrl = await addFundingSource({
            dwollaCustomerId: user.dwollaCustomerId,
            processorToken,
            bankName: accountData.name,
        });

        if (!fundingSourceUrl) {
            throw new Error("Failed to create funding source");
        }

        // Create bank account row
        await createBankAccount({
            userId: user.$id,
            bankId: itemId,
            accountId: accountData.account_id,
            accessToken,
            fundingSourceUrl,
            shareableId: encryptId(accountData.account_id),
        });

        // Revalidate home page
        revalidatePath("/");

        return parseStringify({
            publicTokenExchange: "complete",
        });
    } catch (error) {
        console.error("An error occurred while exchanging token:", error);

        return null;
    }
};

// ============================================================
// GET BANKS
// ============================================================

export const getBank = async ({ documentId }: getBankProps) => {
    try {
        const { tablesDB } = await createAdminClient();

        const bank = await tablesDB.listRows({
            databaseId: DATABASE_ID!,
            tableId: BANK_TABLE_ID!,
            queries: [Query.equal("$id", documentId)],
        });

        return parseStringify(bank.rows[0]);
    } catch (error) {
        console.log("Error getting bank:", error);
        return null;
    }
};

export const getBankByAccountId = async ({
    accountId,
}: getBankByAccountIdProps) => {
    try {
        const { tablesDB } = await createAdminClient();

        const bank = await tablesDB.listRows({
            databaseId: DATABASE_ID!,
            tableId: BANK_TABLE_ID!,
            queries: [Query.equal("accountId", accountId)],
        });

        if (bank.total !== 1) return null;

        return parseStringify(bank.rows[0]);
    } catch (error) {
        console.log("Error getting bank by account ID:", error);
        return null;
    }
};

export const getBanks = async ({ userId }: getBanksProps) => {
    try {
        const { tablesDB } = await createAdminClient();

        const banks = await tablesDB.listRows({
            databaseId: DATABASE_ID!,
            tableId: BANK_TABLE_ID!,
            queries: [Query.equal("userId", userId)],
        });

        return parseStringify(banks.rows);
    } catch (error) {
        console.error("Error getting banks:", error);
        return [];
    }
};
