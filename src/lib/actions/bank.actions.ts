"use server";

import { CountryCode } from "plaid";
import { plaidClient } from "../plaid";
import { parseStringify } from "../utils";

import {
    getTransactionsByBankId,
    updateTransactionStatus,
} from "./transaction.actions";

import { getBanks, getBank } from "./user.actions";
import { getTransferStatus } from "./dwolla.actions";

// ==============================
// GET ADJUSTED BALANCE
// ==============================

const getAdjustedBalance = async ({
    bankId,
    plaidBalance,
    plaidTransactions,
}: {
    bankId: string;
    plaidBalance: number;
    plaidTransactions: any[];
}) => {
    try {
        const transferTransactionsData = await getTransactionsByBankId({
            bankId,
        });

        if (!transferTransactionsData?.rows) {
            return plaidBalance;
        }

        // Include both processing and completed transfers.
        // We stop adjusting only when Plaid has reflected
        // the transfer in its own transaction list.
        const transfers = transferTransactionsData.rows.filter(
            (transaction: Transaction) =>
                (transaction.status === "processing" ||
                    transaction.status === "completed") &&
                transaction.amount,
        );

        let adjustedBalance = plaidBalance;

        // Prevent one Plaid transaction from matching
        // multiple Appwrite transfers.
        const matchedPlaidTransactions = new Set<number>();

        for (const transfer of transfers) {
            const amount = Number(transfer.amount);

            if (!amount || amount <= 0) {
                continue;
            }

            const isOutgoing = transfer.senderBankId === bankId;

            const isIncoming = transfer.receiverBankId === bankId;

            // Find whether Plaid already contains this transfer.
            const plaidTransferIndex = plaidTransactions.findIndex(
                (transaction, index) => {
                    // Don't reuse the same Plaid transaction
                    if (matchedPlaidTransactions.has(index)) {
                        return false;
                    }

                    const plaidAmount = Number(transaction.amount);

                    const sameAmount = Math.abs(plaidAmount) === amount;

                    if (!sameAmount) {
                        return false;
                    }

                    const transactionDate = new Date(
                        transaction.date,
                    ).getTime();

                    const transferDate = new Date(
                        transfer.$createdAt,
                    ).getTime();

                    const withinSevenDays =
                        Math.abs(transactionDate - transferDate) <=
                        7 * 24 * 60 * 60 * 1000;

                    if (!withinSevenDays) {
                        return false;
                    }

                    // Plaid:
                    // Positive amount = money leaving account
                    // Negative amount = money entering account

                    if (isOutgoing) {
                        return plaidAmount > 0;
                    }

                    if (isIncoming) {
                        return plaidAmount < 0;
                    }

                    return false;
                },
            );

            const plaidTransferExists = plaidTransferIndex !== -1;

            if (plaidTransferExists) {
                // Plaid has already reflected this transfer.
                // Don't adjust the balance again.
                matchedPlaidTransactions.add(plaidTransferIndex);

                continue;
            }

            // Plaid has NOT reflected this transfer yet.
            // Temporarily adjust the displayed balance.

            if (isOutgoing) {
                adjustedBalance -= amount;
            }

            if (isIncoming) {
                adjustedBalance += amount;
            }
        }

        return adjustedBalance;
    } catch (error) {
        console.error("Error calculating adjusted balance:", error);

        return plaidBalance;
    }
};

// ==============================
// SYNC DWOLLA TRANSFER STATUSES
// ==============================

const syncTransferStatuses = async (bankId: string) => {
    try {
        const transferTransactionsData = await getTransactionsByBankId({
            bankId,
        });

        if (!transferTransactionsData?.rows) {
            return;
        }

        const processingTransactions = transferTransactionsData.rows.filter(
            (transaction: Transaction) =>
                transaction.status === "processing" && transaction.transferUrl,
        );

        await Promise.all(
            processingTransactions.map(async (transaction: Transaction) => {
                const status = await getTransferStatus(transaction.transferUrl);

                console.log(`Dwolla status for ${transaction.$id}:`, status);

                if (status === "processed") {
                    await updateTransactionStatus({
                        transactionId: transaction.$id,
                        status: "completed",
                    });
                }

                if (status === "failed" || status === "cancelled") {
                    await updateTransactionStatus({
                        transactionId: transaction.$id,
                        status,
                    });
                }
            }),
        );
    } catch (error) {
        console.error("Error Syncing Transfer Statuses:", error);
    }
};

// ==============================
// GET MULTIPLE BANK ACCOUNTS
// ==============================

export const getAccounts = async ({ userId }: getAccountsProps) => {
    try {
        // Get banks from Appwrite
        const banks = await getBanks({ userId });

        if (!banks) {
            return null;
        }

        // Check Dwolla status for processing transfers
        await Promise.all(
            banks.map((bank: Bank) => syncTransferStatuses(bank.$id)),
        );

        const accounts = await Promise.all(
            banks.map(async (bank: Bank) => {
                // Get account information from Plaid
                const accountsResponse = await plaidClient.accountsGet({
                    access_token: bank.accessToken,
                });

                const accountData = accountsResponse.data.accounts[0];

                // Get Plaid transactions
                const plaidTransactions = await getTransactions({
                    accessToken: bank.accessToken,
                });

                // Get institution information from Plaid
                const institution = await getInstitution({
                    institutionId: accountsResponse.data.item.institution_id!,
                });

                // Calculate adjusted balance
                const adjustedBalance = await getAdjustedBalance({
                    bankId: bank.$id,
                    plaidBalance: accountData.balances.current!,
                    plaidTransactions,
                });

                return {
                    id: accountData.account_id,

                    availableBalance: accountData.balances.available!,

                    currentBalance: adjustedBalance,

                    institutionId: institution.institution_id,

                    name: accountData.name,

                    officialName: accountData.official_name,

                    mask: accountData.mask!,

                    type: accountData.type as string,

                    subtype: accountData.subtype! as string,

                    appwriteItemId: bank.$id,

                    shareableId: bank.shareableId,
                };
            }),
        );

        const totalBanks = accounts.length;

        const totalCurrentBalance = accounts.reduce((total, account) => {
            return total + account.currentBalance;
        }, 0);

        return parseStringify({
            data: accounts,
            totalBanks,
            totalCurrentBalance,
        });
    } catch (error) {
        console.error("An error occurred while getting the accounts:", error);
    }
};

// ==============================
// GET ONE BANK ACCOUNT
// ==============================

export const getAccount = async ({ appwriteItemId }: getAccountProps) => {
    try {
        // Get bank from Appwrite
        const bank = await getBank({
            documentId: appwriteItemId,
        });

        // Sync processing transfers with Dwolla
        await syncTransferStatuses(bank.$id);

        // Get account information from Plaid
        const accountsResponse = await plaidClient.accountsGet({
            access_token: bank.accessToken,
        });

        const accountData = accountsResponse.data.accounts[0];

        // Get transfer transactions from Appwrite
        const transferTransactionsData = await getTransactionsByBankId({
            bankId: bank.$id,
        });

        const transferTransactions: Transaction[] =
            transferTransactionsData.rows.map((transferData: Transaction) => ({
                id: transferData.$id,
                name: transferData.name!,
                amount: transferData.amount!,
                date: transferData.$createdAt,
                paymentChannel: transferData.channel,
                category: transferData.category,
                status: transferData.status,
                type:
                    transferData.senderBankId === bank.$id ? "debit" : "credit",
            }));

        // Get institution information from Plaid
        const institution = await getInstitution({
            institutionId: accountsResponse.data.item.institution_id!,
        });

        // Get Plaid transactions
        const transactions = await getTransactions({
            accessToken: bank.accessToken,
        });

        // Calculate adjusted balance
        const adjustedBalance = await getAdjustedBalance({
            bankId: bank.$id,

            plaidBalance: accountData.balances.current!,

            plaidTransactions: transactions,
        });

        const account = {
            id: accountData.account_id,

            availableBalance: accountData.balances.available!,

            currentBalance: adjustedBalance,

            institutionId: institution.institution_id,

            name: accountData.name,

            officialName: accountData.official_name,

            mask: accountData.mask!,

            type: accountData.type as string,

            subtype: accountData.subtype! as string,

            appwriteItemId: bank.$id,
        };

        // Combine Plaid + Appwrite transactions
        const allTransactions = transferTransactions.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );

        return parseStringify({
            data: account,
            transactions: allTransactions,
        });
    } catch (error) {
        console.error("Error Getting Transactions By Bank ID:", error);

        return {
            total: 0,
            rows: [],
        };
    }
};

// ==============================
// GET BANK INFO
// ==============================

export const getInstitution = async ({
    institutionId,
}: getInstitutionProps) => {
    try {
        const institutionResponse = await plaidClient.institutionsGetById({
            institution_id: institutionId,

            country_codes: ["US"] as CountryCode[],
        });

        const institution = institutionResponse.data.institution;

        return parseStringify(institution);
    } catch (error) {
        console.error(
            "An error occurred while getting the institution:",
            error,
        );
    }
};

// ==============================
// GET TRANSACTIONS
// ==============================

export const getTransactions = async ({
    accessToken,
}: getTransactionsProps) => {
    let hasMore = true;
    let nextCursor: string | undefined = undefined;

    let transactions: any[] = [];

    try {
        while (hasMore) {
            const response = await plaidClient.transactionsSync({
                access_token: accessToken,
                cursor: nextCursor,
            });

            const data = response.data;

            transactions = [
                ...transactions,

                ...data.added.map((transaction) => ({
                    id: transaction.transaction_id,

                    name: transaction.name,

                    paymentChannel: transaction.payment_channel,

                    type: transaction.payment_channel,

                    accountId: transaction.account_id,

                    amount: transaction.amount,

                    pending: transaction.pending,

                    category: transaction.category
                        ? transaction.category[0]
                        : "",

                    date: transaction.date,

                    image: transaction.logo_url,
                })),
            ];

            nextCursor = data.next_cursor;

            hasMore = data.has_more;
        }

        return parseStringify(transactions);
    } catch (error: any) {
        console.error("Error Getting Transactions");

        console.error("Message:", error?.message);

        console.error("Code:", error?.code);

        console.error("Response:", error?.response);

        console.error("Response data:", error?.response?.data);

        console.error("Response status:", error?.response?.status);

        console.error("Request:", error?.request);

        return [];
    }
};
