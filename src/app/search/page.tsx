"use client";

import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { format } from "date-fns";
import { PageLayout } from "~/app/_components/page-layout";

interface SearchFilters {
  query: string;
  speakerId?: number;
  submittedById?: string;
  quoteDateFrom?: Date;
  quoteDateTo?: Date;
  includeUnknownDates: boolean;
}

function SearchContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [filters, setFilters] = useState<SearchFilters>({
    query: searchParams.get("q") ?? "",
    speakerId: undefined,
    submittedById: undefined,
    quoteDateFrom: undefined,
    quoteDateTo: undefined,
    includeUnknownDates: true,
  });
  const currentPageParam = parseInt(searchParams.get("page") ?? "1", 10);
  const [currentPage, setCurrentPage] = useState(currentPageParam);
  const [triggerSearch, setTriggerSearch] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync pagination state with URL
  useEffect(() => {
    const urlPage = parseInt(searchParams.get("page") ?? "1", 10);
    if (urlPage !== currentPage) {
      setCurrentPage(urlPage);
    }
  }, [searchParams, currentPage]);

  // Update URL when page changes
  const updatePageInUrl = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newPage === 1) {
      params.delete("page");
    } else {
      params.set("page", newPage.toString());
    }
    const newUrl = params.toString() ? `?${params.toString()}` : "";
    router.push(`/search${newUrl}`, { scroll: false });
  };

  // Memoize hasActiveSearch to prevent unnecessary re-calculations
  const hasActiveSearch = useMemo(
    () =>
      Boolean(
        filters.speakerId !== undefined ||
          filters.submittedById !== undefined ||
          filters.quoteDateFrom !== undefined ||
          filters.quoteDateTo !== undefined ||
          !filters.includeUnknownDates ||
          filters.query.trim().length > 0,
      ),
    [filters],
  );

  const searchQuery = api.search.searchQuotes.useQuery(
    {
      ...filters,
      page: currentPage,
      limit: 20,
    },
    {
      enabled: triggerSearch && !!session?.user && hasActiveSearch, // Only enable when explicitly triggered
    },
  );

  // Fetch speakers and users for filters
  const speakersQuery = api.search.getSpeakers.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const usersQuery = api.search.getUsers.useQuery(undefined, {
    enabled: !!session?.user,
  });

  // Update query when URL search params change
  useEffect(() => {
    const urlQuery = searchParams.get("q");
    if (urlQuery && urlQuery !== filters.query) {
      setFilters((prev) => ({ ...prev, query: urlQuery }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Auto-search with debounce for all filter changes
  useEffect(() => {
    if (hasActiveSearch && session?.user) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set trigger to false first
      setTriggerSearch(false);

      // Set a new timeout to trigger search
      timeoutRef.current = setTimeout(
        () => {
          setTriggerSearch(true);
        },
        filters.query.length > 0 ? 500 : 100,
      ); // Shorter delay for filter-only searches

      // Cleanup function
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    } else {
      setTriggerSearch(false);
    }
  }, [filters, hasActiveSearch, session?.user]);

  const handleFilterChange = (
    key: keyof SearchFilters,
    value: string | number | Date | boolean | undefined,
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    updatePageInUrl(1); // Reset to first page when filters change
  };

  const formatQuoteDate = (date: string | null, precision: string | null) => {
    if (!date) return "Unknown date";

    const dateObj = new Date(date);

    switch (precision) {
      case "year":
        return dateObj.getFullYear().toString();
      case "year-month":
        return format(dateObj, "MMMM yyyy");
      case "full":
        return format(dateObj, "MMMM d, yyyy");
      default:
        return "Unknown date";
    }
  };

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <PageLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-purple-500"></div>
            <p className="mt-4 text-gray-400">Loading...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  // Show sign-in required if not authenticated
  if (!session?.user) {
    return (
      <PageLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
            <h1 className="mb-4 text-4xl font-bold">Sign In Required</h1>
            <p className="mb-8 text-xl text-gray-300">
              You need to sign in to search quotes.
            </p>
            <Link
              href="/api/auth/signin"
              className="rounded-lg bg-purple-600 px-8 py-3 font-medium transition-colors hover:bg-purple-700"
            >
              Sign in with Discord
            </Link>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="mb-2 text-4xl font-bold text-white">
              Search Quotes
            </h1>
            <p className="text-gray-300">
              Find quotes using fuzzy search and advanced filters
            </p>
          </div>
        </div>

        {/* Search Form */}
        <div className="mb-8 rounded-lg border border-white/10 bg-white/5 p-6">
          <div className="space-y-6">
            {/* Main Search Input */}
            <div>
              <label
                htmlFor="search"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                Search in quotes, context, and speaker names (optional)
              </label>
              <input
                id="search"
                type="text"
                value={filters.query}
                onChange={(e) => handleFilterChange("query", e.target.value)}
                placeholder="Enter your search query (leave empty to browse all quotes)..."
                className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-gray-400 transition-colors focus:border-transparent focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Speaker Filter */}
              <div>
                <label
                  htmlFor="speaker"
                  className="mb-2 block text-sm font-medium text-gray-300"
                >
                  Speaker
                </label>
                <select
                  id="speaker"
                  value={filters.speakerId ?? ""}
                  onChange={(e) =>
                    handleFilterChange(
                      "speakerId",
                      e.target.value ? Number(e.target.value) : undefined,
                    )
                  }
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white transition-colors focus:border-transparent focus:ring-2 focus:ring-purple-500 focus:outline-none [&>option]:bg-gray-800 [&>option]:text-white"
                >
                  <option value="" className="bg-gray-800 text-white">
                    All speakers
                  </option>
                  {speakersQuery.data?.map((speaker) => (
                    <option
                      key={speaker.id}
                      value={speaker.id}
                      className="bg-gray-800 text-white"
                    >
                      {speaker.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Submitted By Filter */}
              <div>
                <label
                  htmlFor="submittedBy"
                  className="mb-2 block text-sm font-medium text-gray-300"
                >
                  Submitted by
                </label>
                <select
                  id="submittedBy"
                  value={filters.submittedById ?? ""}
                  onChange={(e) =>
                    handleFilterChange(
                      "submittedById",
                      e.target.value || undefined,
                    )
                  }
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white transition-colors focus:border-transparent focus:ring-2 focus:ring-purple-500 focus:outline-none [&>option]:bg-gray-800 [&>option]:text-white"
                >
                  <option value="" className="bg-gray-800 text-white">
                    All users
                  </option>
                  {usersQuery.data?.map((user) => (
                    <option
                      key={user.id}
                      value={user.id}
                      className="bg-gray-800 text-white"
                    >
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date From Filter */}
              <div>
                <label
                  htmlFor="dateFrom"
                  className="mb-2 block text-sm font-medium text-gray-300"
                >
                  Quote date from
                </label>
                <input
                  id="dateFrom"
                  type="date"
                  value={
                    filters.quoteDateFrom
                      ? filters.quoteDateFrom.toISOString().split("T")[0]
                      : ""
                  }
                  onChange={(e) =>
                    handleFilterChange(
                      "quoteDateFrom",
                      e.target.value ? new Date(e.target.value) : undefined,
                    )
                  }
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white transition-colors focus:border-transparent focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              {/* Date To Filter */}
              <div>
                <label
                  htmlFor="dateTo"
                  className="mb-2 block text-sm font-medium text-gray-300"
                >
                  Quote date to
                </label>
                <input
                  id="dateTo"
                  type="date"
                  value={
                    filters.quoteDateTo
                      ? filters.quoteDateTo.toISOString().split("T")[0]
                      : ""
                  }
                  onChange={(e) =>
                    handleFilterChange(
                      "quoteDateTo",
                      e.target.value ? new Date(e.target.value) : undefined,
                    )
                  }
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white transition-colors focus:border-transparent focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Include Unknown Dates Checkbox */}
            <div className="flex items-center">
              <input
                id="includeUnknownDates"
                type="checkbox"
                checked={filters.includeUnknownDates}
                onChange={(e) =>
                  handleFilterChange("includeUnknownDates", e.target.checked)
                }
                className="h-4 w-4 rounded border-white/20 bg-white/10 text-purple-600 focus:ring-2 focus:ring-purple-500"
              />
              <label
                htmlFor="includeUnknownDates"
                className="ml-2 text-sm text-gray-300"
              >
                Include quotes with unknown dates
              </label>
            </div>
          </div>
        </div>

        {/* Search Results */}
        {hasActiveSearch && (
          <div className="space-y-6">
            {searchQuery.isLoading && (
              <div className="py-12 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-purple-500"></div>
                <p className="mt-4 text-gray-400">Searching...</p>
              </div>
            )}

            {searchQuery.error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
                <p className="text-red-400">
                  Error: {searchQuery.error.message}
                </p>
              </div>
            )}

            {searchQuery.data && (
              <>
                {/* Results Summary */}
                <div className="mb-6 px-1">
                  <p className="text-sm text-gray-300">
                    Found{" "}
                    <span className="font-medium text-white">
                      {searchQuery.data.pagination?.totalResults ?? 0}
                    </span>{" "}
                    result(s)
                    {filters.query.trim() && (
                      <span>
                        {" "}
                        for &ldquo;
                        <span className="font-medium text-purple-300">
                          {filters.query}
                        </span>
                        &rdquo;
                      </span>
                    )}
                    {(searchQuery.data.pagination?.totalPages ?? 0) > 1 && (
                      <span>
                        {" "}
                        • Page {currentPage} of{" "}
                        {searchQuery.data.pagination?.totalPages}
                      </span>
                    )}
                  </p>
                </div>

                {/* Results List */}
                <div className="space-y-4">
                  {searchQuery.data.quotes.map((quote) => {
                    // Preserve search context in quote link
                    const preserveSearchUrl = new URLSearchParams();
                    if (searchParams.get("q"))
                      preserveSearchUrl.set("from_search", "true");
                    if (searchParams.get("q"))
                      preserveSearchUrl.set("q", searchParams.get("q")!);
                    if (currentPage > 1)
                      preserveSearchUrl.set(
                        "search_page",
                        currentPage.toString(),
                      );
                    const searchUrlString = preserveSearchUrl.toString()
                      ? `?${preserveSearchUrl.toString()}`
                      : "";

                    return (
                      <Link
                        key={quote.id}
                        href={`/quotes/${quote.id}${searchUrlString}`}
                        className="block rounded-lg border border-white/10 bg-white/5 p-6 transition-colors hover:border-white/20 hover:bg-white/10"
                      >
                        <div className="mb-4">
                          <p className="text-lg leading-relaxed text-white">
                            &ldquo;{quote.content}&rdquo;
                          </p>
                          {quote.context && (
                            <div className="mt-3 rounded-md border-l-2 border-purple-500/50 bg-white/5 p-3">
                              <p className="text-sm text-gray-400 italic">
                                Context: {quote.context}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          <span className="font-medium text-purple-300">
                            {quote.quoteSpeakers?.map((qs, index) => (
                              <span key={qs.speaker.id}>
                                {index > 0 && ", "}— {qs.speaker.name}
                              </span>
                            ))}
                          </span>
                          <span className="text-gray-400">
                            {formatQuoteDate(
                              quote.quoteDate ?? null,
                              quote.quoteDatePrecision,
                            )}
                          </span>
                          <span className="text-gray-400">
                            Submitted by{" "}
                            <span className="text-gray-300">
                              {quote.submittedBy.name}
                            </span>
                          </span>
                          <span className="text-gray-500">
                            {format(new Date(quote.createdAt), "MMM d, yyyy")}
                          </span>
                        </div>

                        {/* Search score for debugging - removing for now */}
                      </Link>
                    );
                  })}
                </div>

                {/* Pagination */}
                {(searchQuery.data.pagination?.totalPages ?? 0) > 1 && (
                  <div className="mt-8 flex items-center justify-center space-x-2 border-t border-white/10 pt-6">
                    <button
                      onClick={() =>
                        updatePageInUrl(Math.max(1, currentPage - 1))
                      }
                      disabled={!searchQuery.data.pagination?.hasPreviousPage}
                      className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white/10"
                    >
                      Previous
                    </button>

                    <div className="flex items-center space-x-1">
                      {/* Page numbers */}
                      {Array.from(
                        {
                          length: Math.min(
                            5,
                            searchQuery.data.pagination?.totalPages ?? 0,
                          ),
                        },
                        (_, i) => {
                          const pageNum = Math.max(
                            1,
                            Math.min(
                              searchQuery.data.pagination?.totalPages ?? 0,
                              currentPage - 2 + i,
                            ),
                          );
                          return (
                            <button
                              key={pageNum}
                              onClick={() => updatePageInUrl(pageNum)}
                              className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                                pageNum === currentPage
                                  ? "bg-purple-600 text-white"
                                  : "bg-white/10 text-gray-300 hover:bg-white/20"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        },
                      )}
                    </div>

                    <button
                      onClick={() => updatePageInUrl(currentPage + 1)}
                      disabled={!searchQuery.data.pagination?.hasNextPage}
                      className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white/10"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}

            {searchQuery.data && searchQuery.data.quotes.length === 0 && (
              <div className="py-12 text-center">
                <div className="mb-4">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 8h6m6-12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-medium text-white">
                  No quotes found
                </h3>
                <p className="text-gray-400">
                  No quotes found matching your search criteria. Try adjusting
                  your filters or search terms.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Show message when no active search */}
        {!hasActiveSearch && (
          <div className="py-12 text-center">
            <div className="mb-4">
              <svg
                className="mx-auto h-16 w-16 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-medium text-white">
              Ready to search
            </h3>
            <p className="text-gray-400">
              Enter a search query or use the filters above to find quotes.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              You can search by text, filter by speaker, user, or date range.
            </p>
          </div>
        )}
      </div>
    </PageLayout>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <PageLayout>
          <div className="py-12 text-center">
            <div className="mb-4">
              <svg
                className="mx-auto h-12 w-12 animate-spin text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
            <p className="text-gray-400">Loading search...</p>
          </div>
        </PageLayout>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
