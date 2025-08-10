"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { useTranslation } from "~/hooks/useI18n";

export function SubmitQuoteForm() {
  const [content, setContent] = useState("");
  const [context, setContext] = useState("");
  const [quoteDate, setQuoteDate] = useState("");
  const [quoteDatePrecision, setQuoteDatePrecision] = useState<
    "full" | "year-month" | "year" | "unknown"
  >("unknown");
  const [speakerIds, setSpeakerIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();
  const { t } = useTranslation();

  const { data: speakers, isLoading: speakersLoading } =
    api.speaker.getAll.useQuery();

  const utils = api.useUtils();

  const createQuote = api.quote.create.useMutation({
    onMutate: async () => {
      // Set submitting state immediately for better UX
      setIsSubmitting(true);
    },
    onSuccess: async (_newQuote) => {
      // More targeted cache invalidation and prefetching
      await Promise.all([
        utils.quote.getAll.invalidate(), // Invalidate all getAll queries
        utils.quote.getLatest.invalidate(), // Invalidate latest quotes
        utils.quote.getMy.invalidate(), // Invalidate user's quotes
      ]);

      // Prefetch common quote list queries for instant navigation
      void utils.quote.getAll.prefetch({ limit: 6, page: 1 });
      void utils.quote.getAll.prefetch({ limit: 20, page: 1 });

      // Reset form
      setContent("");
      setContext("");
      setQuoteDate("");
      setQuoteDatePrecision("unknown");
      setSpeakerIds([]);
      setIsSubmitting(false);

      router.push("/quotes");
    },
    onError: (error) => {
      console.error("Error creating quote:", error);
      setIsSubmitting(false);
    },
    onSettled: () => {
      // Always reset submitting state
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim() || speakerIds.length === 0) {
      return;
    }

    setIsSubmitting(true);

    createQuote.mutate({
      content: content.trim(),
      context: context.trim() || undefined,
      quoteDate: quoteDate ? new Date(quoteDate) : undefined,
      quoteDatePrecision,
      speakerIds: speakerIds,
    });
  };

  const isFormValid = content.trim().length > 0 && speakerIds.length > 0;

  return (
    <div className="rounded-lg bg-white/10 p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Quote Content */}
        <div>
          <label htmlFor="content" className="mb-2 block text-lg font-medium">
            {t("quotes.quoteContent")}
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t("quotes.quoteContentPlaceholder")}
            className="h-32 w-full resize-y rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-gray-400 focus:border-transparent focus:ring-2 focus:ring-purple-500 focus:outline-none"
            maxLength={2000}
            required
          />
          <div className="mt-1 text-right text-sm text-gray-400">
            {content.length}/2000 {t("common.characters")}
          </div>
        </div>

        {/* Context Field */}
        <div>
          <label htmlFor="context" className="mb-2 block text-lg font-medium">
            {t("quotes.context")}{" "}
            <span className="text-sm font-normal text-gray-400">
              ({t("common.optional")})
            </span>
          </label>
          <textarea
            id="context"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder={t("quotes.contextPlaceholder")}
            className="h-24 w-full resize-y rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-gray-400 focus:border-transparent focus:ring-2 focus:ring-purple-500 focus:outline-none"
            maxLength={1000}
          />
          <div className="mt-1 text-right text-sm text-gray-400">
            {context.length}/1000 {t("common.characters")}
          </div>
        </div>

        {/* Quote Date */}
        <div>
          <label className="mb-3 block text-lg font-medium">
            {t("quotes.date")}{" "}
            <span className="text-sm font-normal text-gray-400">
              ({t("common.optional")})
            </span>
          </label>

          {/* Date Precision Selection */}
          <div className="mb-4 space-y-2">
            <label className="text-sm font-medium text-gray-300">
              {t("quotes.datePrecision")}
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <label className="flex cursor-pointer items-center space-x-2 rounded-lg border border-white/20 bg-white/5 p-3 transition-colors hover:bg-white/10">
                <input
                  type="radio"
                  name="datePrecision"
                  value="unknown"
                  checked={quoteDatePrecision === "unknown"}
                  onChange={(_) => {
                    setQuoteDatePrecision("unknown");
                    setQuoteDate("");
                  }}
                  className="text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm">{t("quotes.precisionUnknown")}</span>
              </label>

              <label className="flex cursor-pointer items-center space-x-2 rounded-lg border border-white/20 bg-white/5 p-3 transition-colors hover:bg-white/10">
                <input
                  type="radio"
                  name="datePrecision"
                  value="year"
                  checked={quoteDatePrecision === "year"}
                  onChange={(_) => {
                    setQuoteDatePrecision("year");
                    if (quoteDate && quoteDate.length > 4) {
                      setQuoteDate(quoteDate.substring(0, 4));
                    }
                  }}
                  className="text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm">{t("quotes.precisionYear")}</span>
              </label>

              <label className="flex cursor-pointer items-center space-x-2 rounded-lg border border-white/20 bg-white/5 p-3 transition-colors hover:bg-white/10">
                <input
                  type="radio"
                  name="datePrecision"
                  value="year-month"
                  checked={quoteDatePrecision === "year-month"}
                  onChange={(_) => {
                    setQuoteDatePrecision("year-month");
                  }}
                  className="text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm">
                  {t("quotes.precisionYearMonth")}
                </span>
              </label>

              <label className="flex cursor-pointer items-center space-x-2 rounded-lg border border-white/20 bg-white/5 p-3 transition-colors hover:bg-white/10">
                <input
                  type="radio"
                  name="datePrecision"
                  value="full"
                  checked={quoteDatePrecision === "full"}
                  onChange={(_) => {
                    setQuoteDatePrecision("full");
                  }}
                  className="text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm">{t("quotes.precisionFull")}</span>
              </label>
            </div>
          </div>

          {/* Date Input Fields */}
          {quoteDatePrecision === "year" && (
            <input
              type="number"
              placeholder={t("quotes.dateYearPlaceholder")}
              min="1900"
              max="2100"
              value={quoteDate}
              onChange={(e) => setQuoteDate(e.target.value)}
              className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-gray-400 focus:border-transparent focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          )}

          {quoteDatePrecision === "year-month" && (
            <input
              type="month"
              id="quoteDate"
              value={quoteDate}
              onChange={(e) => setQuoteDate(e.target.value)}
              className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white focus:border-transparent focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          )}

          {quoteDatePrecision === "full" && (
            <input
              type="date"
              id="quoteDate"
              value={quoteDate}
              onChange={(e) => setQuoteDate(e.target.value)}
              className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white focus:border-transparent focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          )}

          {quoteDatePrecision === "unknown" && (
            <div className="rounded-lg bg-white/5 p-3 text-sm text-gray-400 italic">
              {t("quotes.dateUnknownMessage")}
            </div>
          )}
        </div>

        {/* Speaker Selection */}
        <div>
          <label className="mb-2 block text-lg font-medium">
            {t("quotes.speaker")}
          </label>
          {speakersLoading ? (
            <div className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-gray-400">
              {t("common.loading")}
            </div>
          ) : (
            <>
              {/* Selected Speakers */}
              {speakerIds.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-sm text-gray-300">
                    {t("quotes.selectedSpeakers")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {speakerIds.map((id) => {
                      const speaker = speakers?.find((s) => s.id === id);
                      return speaker ? (
                        <div
                          key={id}
                          className="flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-600/20 px-3 py-1 text-sm"
                        >
                          <span>{speaker.name}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setSpeakerIds((prev) =>
                                prev.filter((speakerId) => speakerId !== id),
                              )
                            }
                            className="text-purple-300 transition-colors hover:text-white"
                            aria-label={`Remove ${speaker.name}`}
                          >
                            ×
                          </button>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              {/* Speaker Selection Dropdown */}
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    const speakerId = parseInt(e.target.value);
                    if (!speakerIds.includes(speakerId)) {
                      setSpeakerIds((prev) => [...prev, speakerId]);
                    }
                  }
                }}
                className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white focus:border-transparent focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                <option value="" className="bg-gray-800">
                  {speakerIds.length === 0
                    ? t("quotes.selectSpeakers")
                    : t("quotes.addAnotherSpeaker")}
                </option>
                {speakers
                  ?.filter((speaker) => !speakerIds.includes(speaker.id))
                  .map((speaker) => (
                    <option
                      key={speaker.id}
                      value={speaker.id}
                      className="bg-gray-800"
                    >
                      {speaker.name}
                    </option>
                  ))}
              </select>
            </>
          )}
          <p className="mt-1 text-sm text-gray-400">
            {t("quotes.speakerNotFound")}{" "}
            <span className="text-purple-400">
              {t("quotes.contactModerator")}
            </span>
          </p>
        </div>

        {/* Error Message */}
        {createQuote.error && (
          <div className="rounded-lg border border-red-600/50 bg-red-600/20 p-4">
            <p className="text-red-300">
              {t("common.errorLabel")} {createQuote.error.message}
            </p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting || speakersLoading}
            className="flex-1 rounded-lg bg-purple-600 px-6 py-3 font-medium transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-600"
          >
            {isSubmitting ? t("quotes.submitting") : t("quotes.submitQuote")}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg bg-gray-600 px-6 py-3 font-medium transition-colors hover:bg-gray-700"
          >
            {t("common.cancel")}
          </button>
        </div>
      </form>
    </div>
  );
}
