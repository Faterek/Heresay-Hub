"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import { QuoteVoting } from "./quote-voting";

interface QuoteDetailProps {
  quoteId: number;
}

// Helper function to format dates based on precision
function formatQuoteDate(dateString: string, precision: string | null): string {
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

export function QuoteDetail({ quoteId }: QuoteDetailProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  // Get the page parameter for back navigation
  const backPage = Array.isArray(searchParams.get("page"))
    ? searchParams.get("page")![0]
    : searchParams.get("page");
  const fromSearch = searchParams.get("from_search") === "true";
  const searchQuery = Array.isArray(searchParams.get("q"))
    ? searchParams.get("q")![0]
    : searchParams.get("q");
  const searchPage = Array.isArray(searchParams.get("search_page"))
    ? searchParams.get("search_page")![0]
    : searchParams.get("search_page");

  let backUrl = "/quotes";
  let backText = "Back to Quotes";

  if (fromSearch && searchQuery) {
    const urlParams = new URLSearchParams();
    urlParams.set("q", searchQuery);
    if (searchPage) urlParams.set("page", searchPage);
    backUrl = `/search?${urlParams.toString()}`;
    backText = `Back to Search Results`;
  } else if (backPage) {
    backUrl = `/quotes?page=${backPage}`;
    backText = `Back to Quotes (Page ${backPage})`;
  }

  const utils = api.useUtils();

  const {
    data: quote,
    isLoading,
    error,
  } = api.quote.getById.useQuery(
    { id: quoteId },
    {
      // Refetch on focus to ensure fresh data
      refetchOnWindowFocus: true,
      // Shorter stale time for detail views to ensure fresh data
      staleTime: 1 * 1000, // 1 second for detail view
      // Retry on error for better reliability
      retry: 2,
    },
  );

  const deleteQuote = api.quote.delete.useMutation({
    onMutate: async () => {
      // Cancel any outgoing refetches for this quote
      await utils.quote.getById.cancel({ id: quoteId });

      // Get the quote data before deletion for potential rollback
      const previousQuote = utils.quote.getById.getData({ id: quoteId });

      return { previousQuote };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, restore the previous data
      if (context?.previousQuote) {
        utils.quote.getById.setData({ id: quoteId }, context.previousQuote);
      }
    },
    onSuccess: async () => {
      // More targeted invalidation and navigation
      await Promise.all([
        utils.quote.getAll.invalidate(), // Update lists
        utils.quote.getLatest.invalidate(), // Update recent quotes
        utils.quote.getMy.invalidate(), // Update user's quotes
      ]);

      // Remove the specific quote from cache since it's deleted
      utils.quote.getById.setData({ id: quoteId }, undefined);

      router.push(backUrl);
    },
  });

  const handleDelete = () => {
    if (
      confirm(
        "Are you sure you want to delete this quote? This action cannot be undone.",
      )
    ) {
      deleteQuote.mutate({ id: quoteId });
    }
  };

  // Check permissions
  const userRole = session?.user?.role;
  const isSubmitter = session?.user?.id === quote?.submittedById;
  const canEdit = isSubmitter || ["ADMIN", "OWNER"].includes(userRole ?? "");
  const canDelete = ["MODERATOR", "ADMIN", "OWNER"].includes(userRole ?? "");

  // Show loading state
  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-purple-500"></div>
        <p className="mt-4 text-gray-400">Loading quote...</p>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-400">Error loading quote: {error.message}</p>
      </div>
    );
  }

  // Show not found state
  if (!quote) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-400">Quote not found.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Back Navigation */}
      <div className="mb-6">
        <Link
          href={backUrl}
          className="inline-flex items-center gap-2 text-purple-400 transition-colors hover:text-purple-300"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          {backText}
        </Link>
      </div>

      <div className="rounded-lg bg-white/10 p-8">
        {/* Action Buttons */}
        {session && (canEdit || canDelete) && (
          <div className="mb-6 flex gap-3">
            {canEdit && (
              <Link
                href={`/edit/${quoteId}?${new URLSearchParams({
                  ...(searchParams.get("page") && {
                    page: searchParams.get("page")!,
                  }),
                  ...(searchParams.get("from_search") === "true" && {
                    from_search: "true",
                  }),
                  ...(searchParams.get("q") && { q: searchParams.get("q")! }),
                  ...(searchParams.get("search_page") && {
                    search_page: searchParams.get("search_page")!,
                  }),
                }).toString()}`}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                Edit Quote
              </Link>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={deleteQuote.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:bg-gray-600"
              >
                {deleteQuote.isPending ? "Deleting..." : "Delete Quote"}
              </button>
            )}
          </div>
        )}

        {/* Quote Content */}
        <div className="mb-6">
          <blockquote className="mb-4 text-2xl leading-relaxed text-white italic">
            &ldquo;{quote.content}&rdquo;
          </blockquote>
          <div className="text-lg text-gray-300">
            <span className="font-medium text-white">
              —{" "}
              {quote.quoteSpeakers?.map((qs) => qs.speaker.name).join(" & ") ??
                "Unknown Speaker"}
              {quote.quoteDate && quote.quoteDatePrecision !== "unknown" && (
                <span className="text-gray-400">
                  , {formatQuoteDate(quote.quoteDate, quote.quoteDatePrecision)}
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Context (if available) */}
        {quote.context && (
          <div className="mb-6 rounded-lg bg-white/5 p-4">
            <h3 className="mb-2 text-sm font-semibold tracking-wide text-gray-400 uppercase">
              Context
            </h3>
            <p className="leading-relaxed text-gray-300">{quote.context}</p>
          </div>
        )}

        {/* Metadata */}
        <div className="border-t border-white/10 pt-4">
          <div className="mb-4">
            <QuoteVoting quoteId={quote.id} />
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
            <span>
              Submitted by{" "}
              <Link
                href={`/profile/${quote.submittedById}`}
                className="font-medium text-purple-300 hover:text-purple-200"
              >
                {quote.submittedBy.name ?? "Unknown User"}
              </Link>
            </span>
            <span>•</span>
            <span>
              {new Date(quote.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        {deleteQuote.error && (
          <div className="mt-4 rounded-lg border border-red-600/50 bg-red-600/20 p-3">
            <p className="text-sm text-red-300">
              Error: {deleteQuote.error.message}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
