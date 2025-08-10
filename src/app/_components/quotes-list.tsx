"use client";

import { useState, memo, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";
import { QuoteVoting } from "./quote-voting";
import type { Quote } from "~/types";
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

// Helper function to generate pagination pages array
function generatePaginationPages(currentPage: number, totalPages: number) {
  const pages = [];

  // Always show first page
  if (currentPage > 3) {
    pages.push({ type: "page", value: 1 });
    if (currentPage > 4) {
      pages.push({ type: "dots", value: "..." });
    }
  }

  // Show pages around current page
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);

  for (let i = startPage; i <= endPage; i++) {
    pages.push({ type: "page", value: i });
  }

  // Always show last page
  if (currentPage < totalPages - 2) {
    if (currentPage < totalPages - 3) {
      pages.push({ type: "dots", value: "..." });
    }
    pages.push({ type: "page", value: totalPages });
  }

  return pages;
}

// Memoized quote card component

export function QuotesList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPage = parseInt(searchParams.get("page") ?? "1", 10);
  const [page, setPage] = useState(currentPage);
  const limit = 20;
  const { t } = useTranslation();

  // Sync internal state with URL params
  useEffect(() => {
    setPage(currentPage);
  }, [currentPage]);

  const updateUrlPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newPage === 1) {
      params.delete("page");
    } else {
      params.set("page", newPage.toString());
    }
    const newUrl = params.toString() ? `?${params.toString()}` : "";
    router.push(`/quotes${newUrl}`, { scroll: false });
  };

  const {
    data: quotesData,
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

  const quotes = quotesData?.quotes;
  const pagination = quotesData?.pagination;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-lg bg-white/10 p-4">
            <div className="mb-2 h-4 w-3/4 rounded bg-white/20"></div>
            <div className="mb-2 h-3 w-1/2 rounded bg-white/20"></div>
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

  if (!quotesData || !quotes || quotes.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg text-gray-400">{t("quotes.noQuotes")}</p>
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
              currentPage={page}
            />
            {index < quotes.length - 1 && (
              <div className="border-b border-white/20"></div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-8">
          {/* Pagination info */}
          <div className="mb-4 text-center text-sm text-gray-400">
            {t("common.showingPage")} {pagination.page} {t("common.of")}{" "}
            {pagination.totalPages} ({pagination.totalCount}{" "}
            {t("common.totalQuotesCount")})
          </div>

          <div className="flex justify-center gap-2">
            {/* Previous button */}
            <button
              onClick={() => updateUrlPage(Math.max(1, page - 1))}
              disabled={!pagination.hasPrev}
              className="rounded-lg bg-gray-600 px-4 py-2 transition-colors hover:bg-gray-700 disabled:bg-gray-800 disabled:text-gray-500"
            >
              {t("common.previous")}
            </button>

            {/* Page numbers */}
            {generatePaginationPages(
              pagination.page,
              pagination.totalPages,
            ).map((item, index) => {
              if (item.type === "dots") {
                return (
                  <span
                    key={`dots-${index}`}
                    className="px-2 py-2 text-gray-400"
                  >
                    {item.value}
                  </span>
                );
              }

              const pageNum = item.value as number;
              return (
                <button
                  key={pageNum}
                  onClick={() => updateUrlPage(pageNum)}
                  disabled={pageNum === pagination.page}
                  className={`rounded-lg px-3 py-2 transition-colors ${
                    pageNum === pagination.page
                      ? "bg-purple-600 text-white"
                      : "bg-gray-600 hover:bg-gray-700"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            {/* Next button */}
            <button
              onClick={() => updateUrlPage(page + 1)}
              disabled={!pagination.hasNext}
              className="rounded-lg bg-gray-600 px-4 py-2 transition-colors hover:bg-gray-700 disabled:bg-gray-800 disabled:text-gray-500"
            >
              {t("common.next")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const QuoteCard = memo(function QuoteCard({
  quote,
  isFirst,
  isLast,
  currentPage,
}: {
  quote: Quote;
  isFirst: boolean;
  isLast: boolean;
  currentPage: number;
}) {
  const { t } = useTranslation();
  const roundedClasses = isFirst
    ? "rounded-t-lg"
    : isLast
      ? "rounded-b-lg"
      : "";

  const preservePageUrl = currentPage > 1 ? `?page=${currentPage}` : "";

  return (
    <div
      className={`bg-white/10 p-4 transition-colors hover:bg-white/15 ${roundedClasses}`}
    >
      {/* Quote Content - clickable area for quote details */}
      <Link href={`/quotes/${quote.id}${preservePageUrl}`}>
        <div className="cursor-pointer">
          <blockquote className="mb-3 text-base italic">
            &ldquo;{quote.content}&rdquo;
          </blockquote>

          <div className="flex flex-col gap-1 text-sm text-gray-300 sm:flex-row sm:items-center sm:justify-between">
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
            <div className="text-xs text-gray-400">
              <span>{new Date(quote.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </Link>

      {/* Metadata section - outside the main link to avoid nesting */}
      <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
        <div>
          <span>
            {t("quotes.submittedBy")}{" "}
            <Link
              href={`/profile/${quote.submittedById}`}
              className="font-medium text-purple-300 hover:text-purple-200"
            >
              {quote.submittedBy?.name ?? "Anonymous"}
            </Link>
          </span>
        </div>

        {/* Voting section */}
        <QuoteVoting quoteId={quote.id} />
      </div>
    </div>
  );
});
