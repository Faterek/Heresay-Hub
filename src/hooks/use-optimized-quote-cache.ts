/**
 * Hook for optimized quote cache operations
 */
import { api } from "~/trpc/react";

export function useOptimizedQuoteCache() {
  const utils = api.useUtils();

  const invalidateAllQuoteQueries = async () => {
    await Promise.all([
      utils.quote.getAll.invalidate(),
      utils.quote.getLatest.invalidate(),
      utils.quote.getMy.invalidate(),
    ]);
  };

  const invalidateSpecificQuote = async (quoteId: number) => {
    await Promise.all([
      utils.quote.getById.invalidate({ id: quoteId }),
      utils.quote.getAll.invalidate(),
      utils.quote.getLatest.invalidate(),
    ]);
  };

  const prefetchCommonQuotes = async () => {
    void utils.quote.getAll.prefetch({ limit: 20, page: 1 });
    void utils.quote.getAll.prefetch({ limit: 6, page: 1 });
    void utils.quote.getLatest.prefetch();
  };

  return {
    invalidateAllQuoteQueries,
    invalidateSpecificQuote,
    prefetchCommonQuotes,
  };
}
