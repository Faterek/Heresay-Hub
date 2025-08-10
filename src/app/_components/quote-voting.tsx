"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { useTranslation } from "~/hooks/useI18n";

interface QuoteVotingProps {
  quoteId: number;
  className?: string;
}

interface VoterTooltipProps {
  voters: Array<{ id: string; name: string | null; votedAt: Date }>;
  voteType: "upvote" | "downvote";
  onShowAll: () => void;
}

function VoterTooltip({ voters, voteType, onShowAll }: VoterTooltipProps) {
  const { t } = useTranslation();
  const displayVoters = voters.slice(0, 5); // Show first 5
  const hasMore = voters.length > 5;

  return (
    <div className="absolute bottom-full left-1/2 z-50 mb-2 min-w-48 -translate-x-1/2 rounded-lg bg-gray-900 p-3 text-sm shadow-lg">
      <div className="mb-2 font-medium text-white">
        {voteType === "upvote"
          ? t("quotes.upvotedBy")
          : t("quotes.downvotedBy")}
      </div>
      <div className="space-y-1">
        {displayVoters.map((voter) => (
          <div key={voter.id} className="text-gray-300">
            {voter.name ?? "Anonymous"}
          </div>
        ))}
      </div>
      {hasMore && (
        <div className="mt-2 border-t border-gray-700 pt-2">
          <button
            onClick={onShowAll}
            className="text-purple-400 hover:text-purple-300"
          >
            View all {voters.length} voters
          </button>
        </div>
      )}
      {/* Arrow pointing down */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
    </div>
  );
}

interface VoterModalProps {
  isOpen: boolean;
  onClose: () => void;
  voters: Array<{ id: string; name: string | null; votedAt: Date }>;
  voteType: "upvote" | "downvote";
}

function VoterModal({ isOpen, onClose, voters, voteType }: VoterModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-96 w-full max-w-md rounded-lg bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {voteType === "upvote" ? "Upvotes" : "Downvotes"} ({voters.length})
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        <div className="max-h-64 overflow-y-auto">
          <div className="space-y-2">
            {voters.map((voter) => (
              <div
                key={voter.id}
                className="flex items-center justify-between rounded-lg bg-gray-50 p-2"
              >
                <span className="text-gray-900">
                  {voter.name ?? "Anonymous"}
                </span>
                <span className="text-sm text-gray-500">
                  {new Date(voter.votedAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function QuoteVoting({ quoteId, className = "" }: QuoteVotingProps) {
  const [showUpvoteTooltip, setShowUpvoteTooltip] = useState(false);
  const [showDownvoteTooltip, setShowDownvoteTooltip] = useState(false);
  const [showUpvotersModal, setShowUpvotersModal] = useState(false);
  const [showDownvotersModal, setShowDownvotersModal] = useState(false);

  const utils = api.useUtils();

  // Get vote stats
  const { data: voteStats } = api.quote.getVoteStats.useQuery(
    { quoteId },
    {
      refetchOnWindowFocus: false,
      staleTime: 5 * 1000, // 5 seconds
    },
  );

  // Get upvoters when hovering
  const { data: upvoters } = api.quote.getVoters.useQuery(
    { quoteId, voteType: "upvote" },
    {
      enabled: showUpvoteTooltip || showUpvotersModal,
      refetchOnWindowFocus: false,
    },
  );

  // Get downvoters when hovering
  const { data: downvoters } = api.quote.getVoters.useQuery(
    { quoteId, voteType: "downvote" },
    {
      enabled: showDownvoteTooltip || showDownvotersModal,
      refetchOnWindowFocus: false,
    },
  );

  // Vote mutation
  const voteMutation = api.quote.vote.useMutation({
    onSuccess: () => {
      // Invalidate vote stats to refetch
      void utils.quote.getVoteStats.invalidate({ quoteId });
    },
  });

  const handleVote = (voteType: "upvote" | "downvote") => {
    voteMutation.mutate({ quoteId, voteType });
  };

  if (!voteStats) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <div className="flex animate-pulse items-center gap-1">
          <div className="h-4 w-4 rounded bg-gray-300"></div>
          <div className="h-4 w-6 rounded bg-gray-300"></div>
        </div>
        <span className="text-gray-500">/</span>
        <div className="flex animate-pulse items-center gap-1">
          <div className="h-4 w-4 rounded bg-gray-300"></div>
          <div className="h-4 w-6 rounded bg-gray-300"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`flex items-center gap-1 ${className}`}>
        {/* Upvote Button */}
        <div className="relative">
          <button
            onClick={() => handleVote("upvote")}
            onMouseEnter={() => setShowUpvoteTooltip(true)}
            onMouseLeave={() => setShowUpvoteTooltip(false)}
            disabled={voteMutation.isPending}
            className={`flex items-center gap-1 transition-colors ${
              voteStats.userVote === "upvote"
                ? "text-green-400"
                : "text-gray-400 hover:text-gray-300"
            } ${voteMutation.isPending ? "opacity-50" : ""}`}
          >
            <span className="text-sm">↑</span>
            <span className="text-sm font-medium">{voteStats.upvotes}</span>
          </button>
          {showUpvoteTooltip && upvoters && upvoters.length > 0 && (
            <VoterTooltip
              voters={upvoters}
              voteType="upvote"
              onShowAll={() => {
                setShowUpvoteTooltip(false);
                setShowUpvotersModal(true);
              }}
            />
          )}
        </div>

        {/* Separator */}
        <span className="text-gray-500">/</span>

        {/* Downvote Button */}
        <div className="relative">
          <button
            onClick={() => handleVote("downvote")}
            onMouseEnter={() => setShowDownvoteTooltip(true)}
            onMouseLeave={() => setShowDownvoteTooltip(false)}
            disabled={voteMutation.isPending}
            className={`flex items-center gap-1 transition-colors ${
              voteStats.userVote === "downvote"
                ? "text-red-400"
                : "text-gray-400 hover:text-gray-300"
            } ${voteMutation.isPending ? "opacity-50" : ""}`}
          >
            <span className="text-sm">↓</span>
            <span className="text-sm font-medium">{voteStats.downvotes}</span>
          </button>
          {showDownvoteTooltip && downvoters && downvoters.length > 0 && (
            <VoterTooltip
              voters={downvoters}
              voteType="downvote"
              onShowAll={() => {
                setShowDownvoteTooltip(false);
                setShowDownvotersModal(true);
              }}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      {upvoters && (
        <VoterModal
          isOpen={showUpvotersModal}
          onClose={() => setShowUpvotersModal(false)}
          voters={upvoters}
          voteType="upvote"
        />
      )}
      {downvoters && (
        <VoterModal
          isOpen={showDownvotersModal}
          onClose={() => setShowDownvotersModal(false)}
          voters={downvoters}
          voteType="downvote"
        />
      )}
    </>
  );
}
