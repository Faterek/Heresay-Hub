"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import { useTranslation } from "~/hooks/useI18n";

interface EditQuoteFormProps {
  quoteId: number;
  searchParams: Record<string, string | string[] | undefined>;
}

export function EditQuoteForm({ quoteId, searchParams }: EditQuoteFormProps) {
  const { t } = useTranslation();
  const [editContent, setEditContent] = useState("");
  const [editContext, setEditContext] = useState("");
  const [editQuoteDate, setEditQuoteDate] = useState("");
  const [editQuoteDatePrecision, setEditQuoteDatePrecision] = useState<
    "full" | "year-month" | "year" | "unknown"
  >("unknown");
  const [editSpeakerIds, setEditSpeakerIds] = useState<number[]>([]);

  const router = useRouter();
  const { data: session } = useSession();

  const utils = api.useUtils();

  // Build back URL based on search params
  const buildBackUrl = () => {
    const backPage = Array.isArray(searchParams.page)
      ? searchParams.page[0]
      : searchParams.page;
    const fromSearch = searchParams.from_search === "true";
    const searchQuery = Array.isArray(searchParams.q)
      ? searchParams.q[0]
      : searchParams.q;
    const searchPage = Array.isArray(searchParams.search_page)
      ? searchParams.search_page[0]
      : searchParams.search_page;

    if (fromSearch && searchQuery) {
      const urlParams = new URLSearchParams();
      urlParams.set("q", searchQuery);
      if (searchPage) urlParams.set("page", searchPage);
      return `/search?${urlParams.toString()}`;
    } else if (backPage) {
      return `/quotes?page=${backPage}`;
    }
    return `/quotes/${quoteId}`;
  };

  const backUrl = buildBackUrl();

  const {
    data: quote,
    isLoading,
    error,
  } = api.quote.getById.useQuery(
    { id: quoteId },
    {
      refetchOnWindowFocus: true,
      staleTime: 1 * 1000,
      retry: 2,
    },
  );

  const { data: speakers } = api.speaker.getAll.useQuery();

  const updateQuote = api.quote.update.useMutation({
    onMutate: async (newData) => {
      await utils.quote.getById.cancel({ id: quoteId });
      const previousQuote = utils.quote.getById.getData({ id: quoteId });

      if (previousQuote) {
        utils.quote.getById.setData(
          { id: quoteId },
          {
            ...previousQuote,
            content: newData.content,
            context: newData.context ?? null,
            quoteDate: newData.quoteDate?.toISOString().split("T")[0] ?? null,
            quoteDatePrecision: newData.quoteDatePrecision ?? null,
          },
        );
      }

      return { previousQuote };
    },
    onError: (err, newData, context) => {
      if (context?.previousQuote) {
        utils.quote.getById.setData({ id: quoteId }, context.previousQuote);
      }
    },
    onSuccess: () => {
      void utils.quote.getAll.invalidate();
      void utils.quote.getLatest.invalidate();
      void utils.quote.getMy.invalidate();
      void utils.search.searchQuotes.invalidate();

      // Redirect back to the quote detail page with preserved context
      const detailParams = new URLSearchParams();
      const backPage = Array.isArray(searchParams.page)
        ? searchParams.page[0]
        : searchParams.page;
      const fromSearch = Array.isArray(searchParams.from_search)
        ? searchParams.from_search[0]
        : searchParams.from_search;
      const searchQuery = Array.isArray(searchParams.q)
        ? searchParams.q[0]
        : searchParams.q;
      const searchPage = Array.isArray(searchParams.search_page)
        ? searchParams.search_page[0]
        : searchParams.search_page;

      if (backPage) detailParams.set("page", backPage);
      if (fromSearch) detailParams.set("from_search", fromSearch);
      if (searchQuery) detailParams.set("q", searchQuery);
      if (searchPage) detailParams.set("search_page", searchPage);

      const detailUrl = detailParams.toString()
        ? `/quotes/${quoteId}?${detailParams.toString()}`
        : `/quotes/${quoteId}`;

      router.push(detailUrl);
    },
  });

  // Initialize form when quote data is loaded
  useEffect(() => {
    if (quote) {
      setEditContent(quote.content);
      setEditContext(quote.context ?? "");

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

      const speakerIds = quote.quoteSpeakers?.map((qs) => qs.speakerId) ?? [];
      setEditSpeakerIds(speakerIds);
    }
  }, [quote]);

  const handleSave = () => {
    if (!editContent.trim() || editSpeakerIds.length === 0) return;

    let dateToSend: Date | undefined;
    if (editQuoteDate && editQuoteDatePrecision !== "unknown") {
      switch (editQuoteDatePrecision) {
        case "year":
          dateToSend = new Date(`${editQuoteDate}-01-01`);
          break;
        case "year-month":
          dateToSend = new Date(`${editQuoteDate}-01`);
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
      quoteDatePrecision:
        editQuoteDatePrecision === "unknown"
          ? undefined
          : editQuoteDatePrecision,
      speakerIds: editSpeakerIds,
    });
  };

  const canEdit =
    quote &&
    session &&
    (session.user.id === quote.submittedById ||
      ["MODERATOR", "ADMIN", "OWNER"].includes(session.user.role));

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-purple-500"></div>
        <p className="mt-4 text-gray-400">{t("common.loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-400">
          {t("common.errorLoading")}: {error.message}
        </p>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-400">{t("quotes.notFound")}</p>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-400">{t("quotes.noPermissionToEdit")}</p>
        <Link
          href={backUrl}
          className="mt-4 inline-block text-purple-400 hover:text-purple-300"
        >
          {t("common.goBack")}
        </Link>
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
          {t("quotes.backToQuote")}
        </Link>
      </div>

      <div className="rounded-lg bg-white/10 p-8">
        <h1 className="mb-6 text-2xl font-bold text-white">
          {t("quotes.editQuote")}
        </h1>

        <div className="space-y-6">
          {/* Quote Content Field */}
          <div>
            <label
              htmlFor="edit-content"
              className="mb-2 block text-lg font-medium"
            >
              {t("quotes.content")}
            </label>
            <textarea
              id="edit-content"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="h-32 w-full resize-y rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder={t("quotes.contentPlaceholder")}
              required
              maxLength={2000}
            />
            <div className="mt-1 text-right text-sm text-gray-400">
              {editContent.length}/2000 {t("common.characters")}
            </div>
          </div>

          {/* Speaker Selection */}
          <div>
            <label className="mb-2 block text-lg font-medium">
              {t("quotes.speakers")}
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {speakers?.map((speaker) => (
                <label
                  key={speaker.id}
                  className="flex cursor-pointer items-center space-x-2 rounded-lg border border-white/20 bg-white/5 p-3 transition-colors hover:bg-white/10"
                >
                  <input
                    type="checkbox"
                    checked={editSpeakerIds.includes(speaker.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setEditSpeakerIds([...editSpeakerIds, speaker.id]);
                      } else {
                        setEditSpeakerIds(
                          editSpeakerIds.filter((id) => id !== speaker.id),
                        );
                      }
                    }}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm">{speaker.name}</span>
                </label>
              ))}
            </div>
            {editSpeakerIds.length === 0 && (
              <p className="mt-2 text-sm text-red-400">
                {t("quotes.selectAtLeastOneSpeaker")}
              </p>
            )}
          </div>

          {/* Context Field */}
          <div>
            <label
              htmlFor="edit-context"
              className="mb-2 block text-lg font-medium"
            >
              {t("quotes.context")}{" "}
              <span className="text-sm font-normal text-gray-400">
                ({t("common.optional")})
              </span>
            </label>
            <textarea
              id="edit-context"
              value={editContext}
              onChange={(e) => setEditContext(e.target.value)}
              className="h-24 w-full resize-y rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
              maxLength={1000}
            />
            <div className="mt-1 text-right text-sm text-gray-400">
              {editContext.length}/1000 {t("common.characters")}
            </div>
          </div>

          {/* Quote Date Field */}
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
                    name="editDatePrecision"
                    value="unknown"
                    checked={editQuoteDatePrecision === "unknown"}
                    onChange={(_) => {
                      setEditQuoteDatePrecision("unknown");
                      setEditQuoteDate("");
                    }}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm">{t("quotes.dateUnknown")}</span>
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
                  <span className="text-sm">{t("quotes.dateYearOnly")}</span>
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
                  <span className="text-sm">{t("quotes.dateYearMonth")}</span>
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
                  <span className="text-sm">{t("quotes.dateFullDate")}</span>
                </label>
              </div>
            </div>

            {/* Date Input Field */}
            {editQuoteDatePrecision !== "unknown" && (
              <div>
                <label className="text-sm font-medium text-gray-300">
                  {editQuoteDatePrecision === "year" &&
                    t("quotes.dateYearFormat")}
                  {editQuoteDatePrecision === "year-month" &&
                    t("quotes.dateYearMonthFormat")}
                  {editQuoteDatePrecision === "full" &&
                    t("quotes.dateFullFormat")}
                </label>
                <input
                  type={
                    editQuoteDatePrecision === "full"
                      ? "date"
                      : editQuoteDatePrecision === "year-month"
                        ? "month"
                        : "number"
                  }
                  value={editQuoteDate}
                  onChange={(e) => setEditQuoteDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
                  {...(editQuoteDatePrecision === "year" && {
                    min: 1000,
                    max: new Date().getFullYear(),
                    placeholder: t("quotes.dateYearPlaceholder"),
                  })}
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={
                !editContent.trim() ||
                editSpeakerIds.length === 0 ||
                updateQuote.isPending
              }
              className="rounded-lg bg-green-600 px-6 py-2 font-medium text-white transition-colors hover:bg-green-700 disabled:bg-gray-600 disabled:text-gray-400"
            >
              {updateQuote.isPending
                ? t("common.saving")
                : t("quotes.saveChanges")}
            </button>
            <Link
              href={backUrl}
              className="rounded-lg bg-gray-600 px-6 py-2 font-medium text-white transition-colors hover:bg-gray-700"
            >
              {t("common.cancel")}
            </Link>
          </div>

          {updateQuote.error && (
            <div className="rounded-lg border border-red-600/50 bg-red-600/20 p-3">
              <p className="text-sm text-red-300">
                {t("common.error")}: {updateQuote.error.message}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
