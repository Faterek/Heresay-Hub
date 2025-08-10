"use client";

import { memo } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import type { Quote } from "~/types";
import { QuoteVoting } from "./quote-voting";
import { useTranslation } from "~/hooks/useI18n";

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

export function RecentQuotes() {
  const { t } = useTranslation();
  const {
    data: quotesData,
    isLoading,
    error,
  } = api.quote.getAll.useQuery(
    {
      limit: 6,
      page: 1,
    },
    {
      // Refetch on focus for fresh data
      refetchOnWindowFocus: true,
      // Shorter stale time for recent quotes to ensure fresh data
      staleTime: 2 * 1000, // 2 seconds
    },
  );

  const quotes = quotesData?.quotes;

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl">
        <h2 className="mb-6 text-center text-3xl font-bold">
          {t("quotes.recentQuotes")}
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-lg bg-white/10 p-4">
              <div className="mb-2 h-4 w-3/4 rounded bg-white/20"></div>
              <div className="mb-2 h-4 w-1/2 rounded bg-white/20"></div>
              <div className="h-3 w-1/4 rounded bg-white/20"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl text-center">
        <h2 className="mb-6 text-3xl font-bold">{t("quotes.recentQuotes")}</h2>
        <p className="text-red-400">Error loading quotes: {error.message}</p>
      </div>
    );
  }

  if (!quotesData || !quotes || quotes.length === 0) {
    return (
      <div className="w-full max-w-4xl text-center">
        <h2 className="mb-6 text-3xl font-bold">{t("quotes.recentQuotes")}</h2>
        <div className="rounded-lg bg-white/10 p-8">
          <p className="mb-4 text-lg text-gray-400">
            {t("common.noQuotesFound")}
          </p>
          <p className="text-gray-500">
            Be the first to submit a memorable quote!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-3xl font-bold">{t("quotes.recentQuotes")}</h2>
        <Link
          href="/quotes"
          className="font-medium text-purple-400 transition-colors hover:text-purple-300"
        >
          {t("home.viewAll")} →
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {quotes.map((quote) => (
          <QuoteCard key={quote.id} quote={quote} />
        ))}
      </div>

      {quotes.length >= 6 && (
        <div className="text-center">
          <Link
            href="/quotes"
            className="inline-flex items-center rounded-lg bg-purple-600 px-6 py-3 font-medium transition-colors hover:bg-purple-700"
          >
            {t("home.viewAllQuotes")}
          </Link>
        </div>
      )}
    </div>
  );
}

const QuoteCard = memo(function QuoteCard({ quote }: { quote: Quote }) {
  return (
    <div className="rounded-lg bg-white/10 p-4 transition-colors hover:bg-white/15">
      {/* Quote Content - clickable area for quote details */}
      <Link href={`/quotes/${quote.id}`}>
        <div className="cursor-pointer">
          <blockquote
            className="mb-3 overflow-hidden text-base italic"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
            }}
          >
            &ldquo;{quote.content}&rdquo;
          </blockquote>

          <div className="flex flex-col gap-1 text-sm text-gray-300">
            <div>
              <span className="font-medium text-white">
                —{" "}
                {quote.quoteSpeakers
                  ?.map((qs) => qs.speaker.name)
                  .join(" & ") ??
                  quote.speakers?.map((s) => s.name).join(" & ") ??
                  "Unknown Speaker"}
                {quote.quoteDate && quote.quoteDatePrecision !== "unknown" && (
                  <span className="text-gray-400">
                    ,{" "}
                    {formatQuoteDate(quote.quoteDate, quote.quoteDatePrecision)}
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
      </Link>

      {/* Metadata section - outside the main link to avoid nesting */}
      <div className="mt-2 flex justify-between text-xs text-gray-300">
        <span>
          by{" "}
          <Link
            href={`/profile/${quote.submittedById}`}
            className="font-medium text-purple-300 hover:text-purple-200"
          >
            {quote.submittedBy?.name ?? "Anonymous"}
          </Link>
        </span>
        <span>{new Date(quote.createdAt).toLocaleDateString()}</span>
      </div>

      {/* Voting section - outside the link to prevent conflicts */}
      <div className="mt-2 border-t border-white/20 pt-2">
        <QuoteVoting quoteId={quote.id} />
      </div>
    </div>
  );
});
