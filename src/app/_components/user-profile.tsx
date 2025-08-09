"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import { QuoteCard } from "~/app/_components/quote-card";

interface UserProfileProps {
  userId: string;
}

export function UserProfile({ userId }: UserProfileProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const { data: session } = useSession();

  const {
    data: userProfile,
    isLoading: profileLoading,
    error: profileError,
  } = api.user.getProfile.useQuery({ userId });
  const { data: userQuotes, isLoading: quotesLoading } =
    api.user.getUserQuotes.useQuery({
      userId,
      page: currentPage,
      limit: 10,
    });

  const isOwnProfile = session?.user?.id === userId;

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (profileError || !userProfile) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6 text-center">
        <h2 className="text-lg font-semibold text-red-400">User Not Found</h2>
        <p className="mt-2 text-red-300">
          The user you&apos;re looking for doesn&apos;t exist or may have been
          removed.
        </p>
        <Link
          href="/quotes"
          className="mt-4 inline-block rounded-md bg-purple-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-purple-700"
        >
          Back to Quotes
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-6">
        <div className="flex items-start space-x-6">
          {/* Profile Image */}
          <div className="flex-shrink-0">
            {userProfile.image ? (
              <Image
                src={userProfile.image}
                alt={userProfile.name ?? "User"}
                width={80}
                height={80}
                className="h-20 w-20 rounded-full border-2 border-purple-500/30"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-purple-600/30 text-2xl font-bold">
                {userProfile.name?.charAt(0)?.toUpperCase() ?? "U"}
              </div>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-white">
                {userProfile.name ?? "Anonymous User"}
              </h1>
              <span className="rounded-full bg-purple-600/20 px-3 py-1 text-xs font-medium text-purple-300">
                {userProfile.role}
              </span>
              {isOwnProfile && (
                <span className="rounded-full bg-blue-600/20 px-3 py-1 text-xs font-medium text-blue-300">
                  You
                </span>
              )}
            </div>

            {/* Profile Stats */}
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">
                  {userProfile.stats.quotesCount}
                </div>
                <div className="text-sm text-gray-400">
                  Quote{userProfile.stats.quotesCount !== 1 ? "s" : ""}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  {userProfile.stats.totalUpvotes}
                </div>
                <div className="text-sm text-gray-400">Upvotes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">
                  {userProfile.stats.totalDownvotes}
                </div>
                <div className="text-sm text-gray-400">Downvotes</div>
              </div>
              <div className="text-center">
                <div
                  className={`text-2xl font-bold ${
                    userProfile.stats.netScore >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {userProfile.stats.netScore > 0 ? "+" : ""}
                  {userProfile.stats.netScore}
                </div>
                <div className="text-sm text-gray-400">Net Score</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {isOwnProfile && (
        <div className="flex space-x-4">
          <Link
            href="/submit"
            className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-purple-700"
          >
            Submit New Quote
          </Link>
          <Link
            href="/profile/my-quotes"
            className="rounded-md border border-purple-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-purple-600/10"
          >
            Manage My Quotes
          </Link>
        </div>
      )}

      {/* User's Quotes Section */}
      <div>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {isOwnProfile ? "My Quotes" : `${userProfile.name}'s Quotes`}
          </h2>
          {userProfile.stats.quotesCount > 0 && (
            <span className="text-sm text-gray-400">
              {userProfile.stats.quotesCount} total
            </span>
          )}
        </div>

        {quotesLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-purple-600"></div>
          </div>
        ) : userQuotes && userQuotes.length > 0 ? (
          <div className="space-y-4">
            {userQuotes.map((quote) => (
              <QuoteCard
                key={quote.id}
                quote={quote}
                showSubmittedBy={false} // Don't show "submitted by" since it's their profile
              />
            ))}

            {/* Pagination would go here if needed */}
            {userQuotes.length === 10 && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="rounded-md bg-purple-600/80 px-4 py-2 text-sm font-medium transition-colors hover:bg-purple-600"
                >
                  Load More
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
            <p className="text-gray-400">
              {isOwnProfile
                ? "You haven&apos;t submitted any quotes yet."
                : `${userProfile.name} hasn&apos;t submitted any quotes yet.`}
            </p>
            {isOwnProfile && (
              <Link
                href="/submit"
                className="mt-4 inline-block rounded-md bg-purple-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-purple-700"
              >
                Submit Your First Quote
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
