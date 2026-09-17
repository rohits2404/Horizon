import { HeaderBox } from "@/components/HeaderBox";
import { RecentTransactions } from "@/components/RecentTransactions";
import { RightSidebar } from "@/components/RightSidebar";
import { TotalBalanceBox } from "@/components/TotalBalanceBox";
import { getAccount, getAccounts } from "@/lib/actions/bank.actions";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import { redirect } from "next/navigation";
import React from "react";

const Home = async ({ searchParams }: SearchParamProps) => {
    const { id, page } = await searchParams;

    const currentPage = Number(page) || 1;

    const loggedIn = await getLoggedInUser();

    // User is not logged in
    if (!loggedIn) {
        redirect("/sign-in");
    }

    const accounts = await getAccounts({
        userId: loggedIn.$id,
    });

    if (!accounts) return null;

    const accountsData = accounts.data;

    const appwriteItemId = id || accountsData[0]?.appwriteItemId;

    const account = await getAccount({
        appwriteItemId,
    });

    return (
        <section className="home">
            <div className="home-content">
                <header className="home-header">
                    <HeaderBox
                        type="greeting"
                        title="Welcome"
                        user={loggedIn.firstName || "Guest"}
                        subtext="Access And Manage Your Account And Transactions Efficiently."
                    />

                    <TotalBalanceBox
                        accounts={accountsData}
                        totalBanks={accounts.totalBanks}
                        totalCurrentBalance={accounts.totalCurrentBalance}
                    />
                </header>

                <RecentTransactions
                    accounts={accountsData}
                    transactions={account?.transactions}
                    appwriteItemId={appwriteItemId}
                    page={currentPage}
                />
            </div>

            <RightSidebar
                user={loggedIn}
                transactions={account?.transactions}
                banks={accountsData?.slice(0, 2)}
            />
        </section>
    );
};

export default Home;
