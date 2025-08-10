"use client";

import Link from "next/link";
import type { Quote } from "~/types";
import { useTranslation } from "~/hooks/useI18n";

interface QuoteCardProps {
  quote: Quote;
  showSubmittedBy?: boolean;
}

export function QuoteCard({ quote, showSubmittedBy = true }: QuoteCardProps) {
  const { t } = useTranslation();
  const formatDate = (dateString: string | null, precision: string | null) => {
    if (!dateString || precision === "unknown") return null;

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
        return null;
    }
  };

  const formatTimeAgo = (date: Date | string) => {
    try {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      const now = new Date();
      const diffInMs = now.getTime() - dateObj.getTime();
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

      if (diffInDays === 0) {
        return "today";
      } else if (diffInDays === 1) {
        return "yesterday";
      } else if (diffInDays < 7) {
        return `${diffInDays} days ago`;
      } else if (diffInDays < 30) {
        const weeks = Math.floor(diffInDays / 7);
        return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
      } else if (diffInDays < 365) {
        const months = Math.floor(diffInDays / 30);
        return `${months} month${months > 1 ? "s" : ""} ago`;
      } else {
        const years = Math.floor(diffInDays / 365);
        return `${years} year${years > 1 ? "s" : ""} ago`;
      }
    } catch {
      return "some time ago";
    }
  };

  // Extract speakers from the new schema structure
  const speakers =
    quote.quoteSpeakers?.map((qs) => qs.speaker) ?? quote.speakers ?? [];
  const speakerNames = speakers.map((s) => s.name).join(" & ");

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/10">
      {/* Quote Content - clickable area for quote details */}
      <Link href={`/quotes/${quote.id}`} className="block">
        <div className="cursor-pointer">
          <blockquote className="mb-3 text-base text-gray-100 italic">
            &ldquo;{quote.content}&rdquo;
          </blockquote>

          {/* Speaker and Date */}
          <div className="mb-2 flex items-center justify-between">
            <span className="font-medium text-purple-300">
              — {speakerNames || t("quotes.unknownSpeaker")}
            </span>
            {quote.quoteDate && (
              <span className="text-sm text-gray-400">
                {formatDate(quote.quoteDate, quote.quoteDatePrecision ?? null)}
              </span>
            )}
          </div>

          {/* Context (if provided) */}
          {quote.context && (
            <div className="mb-3 rounded-md bg-white/5 p-2">
              <p className="text-sm text-gray-300">
                <span className="font-medium text-gray-200">
                  {t("quotes.context")}:
                </span>{" "}
                {quote.context}
              </p>
            </div>
          )}
        </div>
      </Link>

      {/* Metadata section - outside the main link to avoid nesting */}
      <div className="mt-2 border-t border-white/10 pt-2">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center space-x-4">
            {showSubmittedBy && quote.submittedBy && (
              <span>
                {t("quotes.submittedBy")}{" "}
                <Link
                  href={`/profile/${quote.submittedById}`}
                  className="font-medium text-purple-300 hover:text-purple-200"
                >
                  {quote.submittedBy.name}
                </Link>
              </span>
            )}
          </div>
          <span>{formatTimeAgo(quote.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}
