"use client";

import { useState, memo } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { QuoteVoting } from "./quote-voting";

// Helper function to format dates based on precision
function formatQuoteDate(
  dateString: string,
  precision?: string | null,
): string {
  if (!dateString || precision === "unknown") return "";

  const date = new Date(dateString);

  switch (precision) {
    case "year":
      return date.getFullYear().toString();
    case "year-month":
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      });
    case "full":
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    default:
      // Fallback to year-month for legacy data
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      });
  }
}

interface Quote {
  id: number;
  content: string;
  context?: string | null;
  quoteDate?: string | null;
  quoteDatePrecision?: string | null;
  speakerId: number;
  submittedById: string;
  createdAt: Date;
  speaker: {
    name: string;
  };
  submittedBy: {
    name: string | null;
  };
}

export function QuotesList() {
  const [page, setPage] = useState(1);
  const limit = 20;

  const {
    data: quotes,
    isLoading,
    error,
  } = api.quote.getAll.useQuery(
    {
      limit,
      page,
    },
    {
      // Refetch on focus for fresh data
      refetchOnWindowFocus: true,
      // Shorter stale time for list views to ensure fresh data
      staleTime: 2 * 1000, // 2 seconds
    },
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-lg bg-white/10 p-6">
            <div className="mb-3 h-4 w-3/4 rounded bg-white/20"></div>
            <div className="mb-3 h-4 w-1/2 rounded bg-white/20"></div>
            <div className="h-3 w-1/4 rounded bg-white/20"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-400">Error loading quotes: {error.message}</p>
      </div>
    );
  }

  if (!quotes || quotes.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg text-gray-400">No quotes found.</p>
        <p className="mt-2 text-gray-500">Be the first to submit a quote!</p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-hidden rounded-lg bg-white/5">
        {quotes.map((quote: Quote, index: number) => (
          <div key={quote.id}>
            <QuoteCard
              quote={quote}
              isFirst={index === 0}
              isLast={index === quotes.length - 1}
            />
            {index < quotes.length - 1 && (
              <div className="border-b border-white/20"></div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="mt-8 flex justify-center gap-3">
        <button
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className="rounded-lg bg-gray-600 px-4 py-2 transition-colors hover:bg-gray-700 disabled:bg-gray-800 disabled:text-gray-500"
        >
          Previous
        </button>
        <span className="rounded-lg bg-gray-700 px-4 py-2">Page {page}</span>
        <button
          onClick={() => setPage(page + 1)}
          disabled={!quotes || quotes.length < limit}
          className="rounded-lg bg-gray-600 px-4 py-2 transition-colors hover:bg-gray-700 disabled:bg-gray-800 disabled:text-gray-500"
        >
          Next
        </button>
      </div>
    </div>
  );
}

const QuoteCard = memo(function QuoteCard({
  quote,
  isFirst,
  isLast,
}: {
  quote: Quote;
  isFirst: boolean;
  isLast: boolean;
}) {
  const roundedClasses = isFirst
    ? "rounded-t-lg"
    : isLast
      ? "rounded-b-lg"
      : "";

  return (
    <div
      className={`bg-white/10 p-6 transition-colors hover:bg-white/15 ${roundedClasses}`}
    >
      {/* Quote Content - clickable area for quote details */}
      <Link href={`/quotes/${quote.id}`}>
        <div className="cursor-pointer">
          <blockquote className="mb-4 text-lg italic">
            &ldquo;{quote.content}&rdquo;
          </blockquote>

          <div className="flex flex-col gap-2 text-sm text-gray-300 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="font-medium text-white">
                — {quote.speaker.name}
                {quote.quoteDate && quote.quoteDatePrecision !== "unknown" && (
                  <span className="text-gray-400">
                    ,{" "}
                    {formatQuoteDate(quote.quoteDate, quote.quoteDatePrecision)}
                  </span>
                )}
              </span>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
              <span>{new Date(quote.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="mt-2 text-xs text-purple-400">
            Click to view details
          </div>
        </div>
      </Link>

      {/* Metadata section - outside the main link to avoid nesting */}
      <div className="mt-3 border-t border-white/20 pt-3">
        <div className="mb-2 text-sm text-gray-300">
          <span>
            Submitted by{" "}
            <Link
              href={`/profile/${quote.submittedById}`}
              className="font-medium text-purple-300 hover:text-purple-200"
            >
              {quote.submittedBy.name ?? "Anonymous"}
            </Link>
          </span>
        </div>

        {/* Voting section */}
        <QuoteVoting quoteId={quote.id} />
      </div>
    </div>
  );
});
