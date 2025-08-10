"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
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
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      });
  }
}

interface RankedQuote {
  id: number;
  content: string;
  context?: string | null;
  quoteDate?: string | null;
  quoteDatePrecision?: string | null;
  createdAt: Date;
  speakers: { id: number; name: string }[];
  submittedBy: { name: string | null };
  upvotes: number;
  downvotes: number;
  netScore: number;
}

interface YearSectionProps {
  year: number;
  isExpanded?: boolean;
}

function YearSection({ year, isExpanded = false }: YearSectionProps) {
  const { t } = useTranslation();
  const [showBest, setShowBest] = useState(true);
  const limit = isExpanded ? 50 : 10;

  const {
    data: rankedQuotes,
    isLoading,
    error,
  } = api.quote.getRankedByYear.useQuery({
    year: typeof year === "string" ? parseInt(year) : year,
    limit,
  });

  if (isLoading) {
    return (
      <div className="rounded-lg bg-white/5 p-6">
        <h3 className="mb-4 text-xl font-semibold text-white">{year}</h3>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-lg bg-white/10 p-4">
              <div className="mb-2 h-4 w-3/4 rounded bg-white/20"></div>
              <div className="h-3 w-1/2 rounded bg-white/20"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-white/5 p-6">
        <h3 className="mb-4 text-xl font-semibold text-white">{year}</h3>
        <p className="text-red-400">
          {t("common.errorLoading")}: {error.message}
        </p>
      </div>
    );
  }

  if (!rankedQuotes || rankedQuotes.length === 0) {
    return (
      <div className="rounded-lg bg-white/5 p-6">
        <h3 className="mb-4 text-xl font-semibold text-white">{year}</h3>
        <p className="text-gray-400">{t("ranking.noQuotesForYear")}</p>
      </div>
    );
  }

  const bestQuotes = rankedQuotes.filter((q) => q.netScore >= 0);
  const worstQuotes = rankedQuotes
    .filter((q) => q.netScore < 0)
    .sort((a, b) => a.netScore - b.netScore);

  const displayQuotes = showBest ? bestQuotes : worstQuotes;

  return (
    <div className="rounded-lg bg-white/5 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-semibold text-white">{year}</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBest(true)}
            className={`rounded-lg px-3 py-1 text-sm transition-colors ${
              showBest
                ? "bg-green-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {t("ranking.best")} ({bestQuotes.length})
          </button>
          <button
            onClick={() => setShowBest(false)}
            className={`rounded-lg px-3 py-1 text-sm transition-colors ${
              !showBest
                ? "bg-red-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {t("ranking.worst")} ({worstQuotes.length})
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {displayQuotes.map((quote: RankedQuote, index: number) => (
          <Link key={quote.id} href={`/quotes/${quote.id}`}>
            <div className="cursor-pointer rounded-lg bg-white/10 p-4 transition-colors hover:bg-white/15">
              <div className="mb-2 flex items-start justify-between">
                <span className="text-sm font-medium text-purple-300">
                  #{index + 1}
                </span>
                <div className="flex items-center gap-2 text-sm">
                  <span
                    className={
                      quote.netScore > 0
                        ? "text-green-400"
                        : quote.netScore < 0
                          ? "text-red-400"
                          : "text-gray-400"
                    }
                  >
                    {quote.netScore > 0 ? "+" : ""}
                    {quote.netScore}
                  </span>
                  <span className="text-gray-500">
                    (↑{quote.upvotes} / ↓{quote.downvotes})
                  </span>
                </div>
              </div>

              <blockquote className="mb-3 text-base text-white italic">
                &ldquo;{quote.content}&rdquo;
              </blockquote>

              <div className="flex flex-col gap-1 text-sm text-gray-300">
                <div>
                  <span className="font-medium text-white">
                    {quote.speakers.map((speaker, index) => (
                      <span key={speaker.id}>
                        {index > 0 && ", "}— {speaker.name}
                      </span>
                    ))}
                    {quote.quoteDate &&
                      quote.quoteDatePrecision !== "unknown" && (
                        <span className="text-gray-400">
                          ,{" "}
                          {formatQuoteDate(
                            quote.quoteDate,
                            quote.quoteDatePrecision,
                          )}
                        </span>
                      )}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>
                    {t("quotes.by")}{" "}
                    {quote.submittedBy.name ?? t("common.anonymous")}
                  </span>
                  <span>{new Date(quote.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function QuoteRanking() {
  const { t } = useTranslation();
  const [showAllYears, setShowAllYears] = useState(false);
  const currentYear = new Date().getFullYear();

  const { data: availableYears, isLoading: yearsLoading } =
    api.quote.getAvailableYears.useQuery();

  if (yearsLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold text-white">
            {t("ranking.title")}
          </h1>
          <p className="text-gray-400">{t("ranking.loadingYears")}</p>
        </div>
      </div>
    );
  }

  if (!availableYears || availableYears.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold text-white">
            {t("ranking.title")}
          </h1>
          <p className="text-gray-400">{t("ranking.noQuotesAvailable")}</p>
        </div>
      </div>
    );
  }

  // Determine which years to show
  const yearsToShow = showAllYears
    ? availableYears
    : availableYears.filter((y) => y.year >= currentYear - 4);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-white">
          {t("ranking.title")}
        </h1>
        <p className="mb-6 text-gray-400">{t("ranking.description")}</p>

        {!showAllYears && availableYears.length > yearsToShow.length && (
          <button
            onClick={() => setShowAllYears(true)}
            className="rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700"
          >
            {t("ranking.showAllYears")} ({availableYears.length}{" "}
            {t("common.total")})
          </button>
        )}

        {showAllYears && (
          <button
            onClick={() => setShowAllYears(false)}
            className="rounded-lg bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-700"
          >
            {t("ranking.showRecentYearsOnly")}
          </button>
        )}
      </div>

      <div className="space-y-6">
        {yearsToShow.map((yearData) => (
          <YearSection
            key={yearData.year}
            year={yearData.year}
            isExpanded={showAllYears}
          />
        ))}
      </div>
    </div>
  );
}
