"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editContext, setEditContext] = useState("");
  const [editQuoteDate, setEditQuoteDate] = useState("");
  const [editQuoteDatePrecision, setEditQuoteDatePrecision] = useState<
    "full" | "year-month" | "year" | "unknown"
  >("unknown");
  const [editSpeakerId, setEditSpeakerId] = useState<number | null>(null);

  const router = useRouter();
  const { data: session } = useSession();

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

  const { data: speakers } = api.speaker.getAll.useQuery();

  const updateQuote = api.quote.update.useMutation({
    onMutate: async (newData) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await utils.quote.getById.cancel({ id: quoteId });

      // Snapshot the previous value
      const previousQuote = utils.quote.getById.getData({ id: quoteId });

      // Optimistically update to the new value
      if (previousQuote) {
        utils.quote.getById.setData(
          { id: quoteId },
          {
            ...previousQuote,
            content: newData.content,
            context: newData.context ?? null,
            quoteDate: newData.quoteDate?.toISOString().split("T")[0] ?? null,
            quoteDatePrecision: newData.quoteDatePrecision ?? null,
            speakerId: newData.speakerId,
          },
        );
      }

      // Return a context object with the snapshotted value
      return { previousQuote };
    },
    onError: (err, newData, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousQuote) {
        utils.quote.getById.setData({ id: quoteId }, context.previousQuote);
      }
    },
    onSuccess: async () => {
      setIsEditing(false);
      // More targeted invalidation - only invalidate the specific queries we need
      await Promise.all([
        utils.quote.getById.invalidate({ id: quoteId }),
        utils.quote.getAll.invalidate(), // For lists
        utils.quote.getLatest.invalidate(), // For recent quotes
      ]);
    },
    onSettled: async () => {
      // Always refetch after error or success to ensure consistency
      await utils.quote.getById.invalidate({ id: quoteId });
    },
  });

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

      router.push("/quotes");
    },
  });

  const handleEdit = () => {
    if (quote) {
      setEditContent(quote.content);
      setEditContext(quote.context ?? "");

      // Set date precision and format date accordingly
      const precision = (quote.quoteDatePrecision ?? "unknown") as
        | "full"
        | "year-month"
        | "year"
        | "unknown";
      setEditQuoteDatePrecision(precision);

      if (quote.quoteDate && precision !== "unknown") {
        const date = new Date(quote.quoteDate);
        switch (precision) {
          case "year":
            setEditQuoteDate(date.getFullYear().toString());
            break;
          case "year-month":
            setEditQuoteDate(quote.quoteDate.substring(0, 7));
            break;
          case "full":
            setEditQuoteDate(quote.quoteDate);
            break;
          default:
            setEditQuoteDate("");
        }
      } else {
        setEditQuoteDate("");
      }

      setEditSpeakerId(quote.speakerId);
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    if (!editContent.trim() || !editSpeakerId) return;

    let dateToSend: Date | undefined;
    if (editQuoteDate && editQuoteDatePrecision !== "unknown") {
      switch (editQuoteDatePrecision) {
        case "year":
          dateToSend = new Date(`${editQuoteDate}-01-01`);
          break;
        case "year-month":
          dateToSend = new Date(editQuoteDate);
          break;
        case "full":
          dateToSend = new Date(editQuoteDate);
          break;
      }
    }

    updateQuote.mutate({
      id: quoteId,
      content: editContent.trim(),
      context: editContext.trim() || undefined,
      quoteDate: dateToSend,
      quoteDatePrecision: editQuoteDatePrecision,
      speakerId: editSpeakerId,
    });
  };

  const handleDelete = () => {
    if (
      confirm(
        "Are you sure you want to delete this quote? This action cannot be undone.",
      )
    ) {
      deleteQuote.mutate({ id: quoteId });
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditContent("");
    setEditContext("");
    setEditQuoteDate("");
    setEditQuoteDatePrecision("unknown");
    setEditSpeakerId(null);
  };

  // Check permissions
  const userRole = session?.user?.role;
  const isSubmitter = session?.user?.id === quote?.submittedById;
  const canEdit = isSubmitter || ["ADMIN", "OWNER"].includes(userRole ?? "");
  const canDelete = ["MODERATOR", "ADMIN", "OWNER"].includes(userRole ?? "");

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-lg bg-white/10 p-8">
        <div className="mb-6 h-6 w-3/4 rounded bg-white/20"></div>
        <div className="mb-4 h-4 w-1/2 rounded bg-white/20"></div>
        <div className="mb-4 h-16 w-full rounded bg-white/20"></div>
        <div className="h-3 w-1/4 rounded bg-white/20"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-400">Error loading quote: {error.message}</p>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-400">Quote not found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white/10 p-8">
      {isEditing ? (
        /* Edit Mode */
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white">Edit Quote</h2>

          {/* Quote Content */}
          <div>
            <label
              htmlFor="edit-content"
              className="mb-2 block text-lg font-medium"
            >
              Quote
            </label>
            <textarea
              id="edit-content"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="h-32 w-full resize-y rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-gray-400 focus:border-transparent focus:ring-2 focus:ring-purple-500 focus:outline-none"
              maxLength={2000}
              required
            />
            <div className="mt-1 text-right text-sm text-gray-400">
              {editContent.length}/2000 characters
            </div>
          </div>

          {/* Context Field */}
          <div>
            <label
              htmlFor="edit-context"
              className="mb-2 block text-lg font-medium"
            >
              Context{" "}
              <span className="text-sm font-normal text-gray-400">
                (Optional)
              </span>
            </label>
            <textarea
              id="edit-context"
              value={editContext}
              onChange={(e) => setEditContext(e.target.value)}
              className="h-24 w-full resize-y rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-gray-400 focus:border-transparent focus:ring-2 focus:ring-purple-500 focus:outline-none"
              maxLength={1000}
            />
            <div className="mt-1 text-right text-sm text-gray-400">
              {editContext.length}/1000 characters
            </div>
          </div>

          {/* Quote Date Field */}
          <div>
            <label className="mb-3 block text-lg font-medium">
              Date{" "}
              <span className="text-sm font-normal text-gray-400">
                (Optional)
              </span>
            </label>

            {/* Date Precision Selection */}
            <div className="mb-4 space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Date Precision
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <label className="flex cursor-pointer items-center space-x-2 rounded-lg border border-white/20 bg-white/5 p-3 transition-colors hover:bg-white/10">
                  <input
                    type="radio"
                    name="editDatePrecision"
                    value="unknown"
                    checked={editQuoteDatePrecision === "unknown"}
                    onChange={(_) => {
                      setEditQuoteDatePrecision("unknown");
                      setEditQuoteDate("");
                    }}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm">Unknown</span>
                </label>

                <label className="flex cursor-pointer items-center space-x-2 rounded-lg border border-white/20 bg-white/5 p-3 transition-colors hover:bg-white/10">
                  <input
                    type="radio"
                    name="editDatePrecision"
                    value="year"
                    checked={editQuoteDatePrecision === "year"}
                    onChange={(_) => {
                      setEditQuoteDatePrecision("year");
                      if (editQuoteDate && editQuoteDate.length > 4) {
                        setEditQuoteDate(editQuoteDate.substring(0, 4));
                      }
                    }}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm">Year only</span>
                </label>

                <label className="flex cursor-pointer items-center space-x-2 rounded-lg border border-white/20 bg-white/5 p-3 transition-colors hover:bg-white/10">
                  <input
                    type="radio"
                    name="editDatePrecision"
                    value="year-month"
                    checked={editQuoteDatePrecision === "year-month"}
                    onChange={(_) => {
                      setEditQuoteDatePrecision("year-month");
                    }}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm">Year & Month</span>
                </label>

                <label className="flex cursor-pointer items-center space-x-2 rounded-lg border border-white/20 bg-white/5 p-3 transition-colors hover:bg-white/10">
                  <input
                    type="radio"
                    name="editDatePrecision"
                    value="full"
                    checked={editQuoteDatePrecision === "full"}
                    onChange={(_) => {
                      setEditQuoteDatePrecision("full");
                    }}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm">Full date</span>
                </label>
              </div>
            </div>

            {/* Date Input Fields */}
            {editQuoteDatePrecision === "year" && (
              <input
                type="number"
                placeholder="2024"
                min="1900"
                max="2100"
                value={editQuoteDate}
                onChange={(e) => setEditQuoteDate(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-gray-400 focus:border-transparent focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            )}

            {editQuoteDatePrecision === "year-month" && (
              <input
                type="month"
                id="edit-quoteDate"
                value={editQuoteDate}
                onChange={(e) => setEditQuoteDate(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white focus:border-transparent focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            )}

            {editQuoteDatePrecision === "full" && (
              <input
                type="date"
                id="edit-quoteDate"
                value={editQuoteDate}
                onChange={(e) => setEditQuoteDate(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white focus:border-transparent focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            )}

            {editQuoteDatePrecision === "unknown" && (
              <div className="rounded-lg bg-white/5 p-3 text-sm text-gray-400 italic">
                Date information is unknown or not specified
              </div>
            )}
          </div>

          {/* Speaker Selection */}
          <div>
            <label
              htmlFor="edit-speaker"
              className="mb-2 block text-lg font-medium"
            >
              Speaker
            </label>
            <select
              id="edit-speaker"
              value={editSpeakerId ?? ""}
              onChange={(e) =>
                setEditSpeakerId(
                  e.target.value ? parseInt(e.target.value) : null,
                )
              }
              className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white focus:border-transparent focus:ring-2 focus:ring-purple-500 focus:outline-none"
              required
            >
              <option value="" className="bg-gray-800">
                Select a speaker...
              </option>
              {speakers?.map((speaker) => (
                <option
                  key={speaker.id}
                  value={speaker.id}
                  className="bg-gray-800"
                >
                  {speaker.name}
                </option>
              ))}
            </select>
          </div>

          {/* Edit Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={
                updateQuote.isPending || !editContent.trim() || !editSpeakerId
              }
              className="rounded-lg bg-green-600 px-6 py-2 font-medium text-white transition-colors hover:bg-green-700 disabled:bg-gray-600"
            >
              {updateQuote.isPending ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={handleCancel}
              className="rounded-lg bg-gray-600 px-6 py-2 font-medium text-white transition-colors hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>

          {updateQuote.error && (
            <div className="rounded-lg border border-red-600/50 bg-red-600/20 p-3">
              <p className="text-sm text-red-300">
                Error: {updateQuote.error.message}
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Display Mode */
        <div>
          {/* Action Buttons */}
          {session && (canEdit || canDelete) && (
            <div className="mb-6 flex gap-3">
              {canEdit && (
                <button
                  onClick={handleEdit}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  Edit Quote
                </button>
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
          <blockquote className="mb-6 text-2xl leading-relaxed font-medium text-white">
            &ldquo;{quote.content}&rdquo;
          </blockquote>

          {/* Speaker */}
          <div className="mb-6">
            <p className="text-lg text-purple-300">
              — {quote.speaker.name}
              {quote.quoteDate && quote.quoteDatePrecision !== "unknown" && (
                <span className="text-gray-400">
                  , {formatQuoteDate(quote.quoteDate, quote.quoteDatePrecision)}
                </span>
              )}
            </p>
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
      )}
    </div>
  );
}
