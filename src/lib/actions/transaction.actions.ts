"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "../appwrite";
import { parseStringify } from "../utils";

const {
    APPWRITE_DATABASE_ID: DATABASE_ID,
    APPWRITE_TRANSACTION_TABLE_ID: TRANSACTION_TABLE_ID,
} = process.env;

// ==============================
// CREATE TRANSACTION
// ==============================

export const createTransaction = async (
    transaction: CreateTransactionProps,
) => {
    try {
        const { tablesDB } = await createAdminClient();

        const newTransaction = await tablesDB.createRow({
            databaseId: DATABASE_ID!,
            tableId: TRANSACTION_TABLE_ID!,
            rowId: ID.unique(),
            data: {
                channel: "online",
                category: "Transfer",
                ...transaction,
            },
        });

        return parseStringify(newTransaction);
    } catch (error) {
        console.error("Error Creating Transaction:", error);
        return null;
    }
};

export const updateTransactionStatus = async ({
    transactionId,
    status,
}: {
    transactionId: string;
    status: string;
}) => {
    try {
        const { tablesDB } = await createAdminClient();

        const updatedTransaction = await tablesDB.updateRow({
            databaseId: DATABASE_ID!,
            tableId: TRANSACTION_TABLE_ID!,
            rowId: transactionId,
            data: {
                status,
            },
        });

        return parseStringify(updatedTransaction);
    } catch (error) {
        console.error("Error Updating Transaction Status:", error);
        return null;
    }
};

// ==============================
// GET TRANSACTIONS BY BANK ID
// ==============================

export const getTransactionsByBankId = async ({
    bankId,
}: getTransactionsByBankIdProps) => {
    try {
        const { tablesDB } = await createAdminClient();

        const senderTransactions = await tablesDB.listRows({
            databaseId: DATABASE_ID!,
            tableId: TRANSACTION_TABLE_ID!,
            queries: [Query.equal("senderBankId", bankId)],
        });

        const receiverTransactions = await tablesDB.listRows({
            databaseId: DATABASE_ID!,
            tableId: TRANSACTION_TABLE_ID!,
            queries: [Query.equal("receiverBankId", bankId)],
        });

        const transactions = {
            total: senderTransactions.total + receiverTransactions.total,

            rows: [...senderTransactions.rows, ...receiverTransactions.rows],
        };

        return parseStringify(transactions);
    } catch (error) {
        console.error("Error Getting Transactions By Bank ID:", error);

        return null;
    }
};
