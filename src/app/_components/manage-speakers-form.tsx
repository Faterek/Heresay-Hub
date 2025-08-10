"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { useTranslation } from "~/hooks/useI18n";

interface ManageSpeakersFormProps {
  userRole: string;
}

export function ManageSpeakersForm({ userRole }: ManageSpeakersFormProps) {
  const [newSpeakerName, setNewSpeakerName] = useState("");
  const [editingSpeaker, setEditingSpeaker] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const { t } = useTranslation();

  const utils = api.useUtils();

  const { data: speakers, isLoading: speakersLoading } =
    api.speaker.getAll.useQuery();

  const createSpeaker = api.speaker.create.useMutation({
    onSuccess: () => {
      setNewSpeakerName("");
      void utils.speaker.getAll.invalidate();
    },
  });

  const updateSpeaker = api.speaker.update.useMutation({
    onSuccess: () => {
      setEditingSpeaker(null);
      void utils.speaker.getAll.invalidate();
    },
  });

  const deleteSpeaker = api.speaker.delete.useMutation({
    onSuccess: () => {
      void utils.speaker.getAll.invalidate();
    },
  });

  const handleCreateSpeaker = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newSpeakerName.trim()) {
      return;
    }

    createSpeaker.mutate({
      name: newSpeakerName.trim(),
    });
  };

  const handleUpdateSpeaker = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingSpeaker?.name.trim()) {
      return;
    }

    updateSpeaker.mutate({
      id: editingSpeaker.id,
      name: editingSpeaker.name.trim(),
    });
  };

  const handleDeleteSpeaker = (id: number) => {
    if (
      confirm(
        "Are you sure you want to delete this speaker? This action cannot be undone.",
      )
    ) {
      deleteSpeaker.mutate({ id });
    }
  };

  const canDelete = ["ADMIN", "OWNER"].includes(userRole);

  return (
    <div className="space-y-8">
      {/* Add New Speaker */}
      <div className="rounded-lg bg-white/10 p-6">
        <h2 className="mb-4 text-xl font-bold">{t("quotes.addNewSpeaker")}</h2>
        <form onSubmit={handleCreateSpeaker} className="flex gap-3">
          <input
            type="text"
            value={newSpeakerName}
            onChange={(e) => setNewSpeakerName(e.target.value)}
            placeholder={t("quotes.speakerNamePlaceholder")}
            className="flex-1 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-white placeholder-gray-400 focus:border-transparent focus:ring-2 focus:ring-purple-500 focus:outline-none"
            maxLength={256}
            required
          />
          <button
            type="submit"
            disabled={!newSpeakerName.trim() || createSpeaker.isPending}
            className="rounded-lg bg-purple-600 px-6 py-2 font-medium transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-600"
          >
            {createSpeaker.isPending
              ? t("quotes.adding")
              : t("quotes.addSpeaker")}
          </button>
        </form>

        {createSpeaker.error && (
          <div className="mt-3 rounded-lg border border-red-600/50 bg-red-600/20 p-3">
            <p className="text-sm text-red-300">
              Error: {createSpeaker.error.message}
            </p>
          </div>
        )}
      </div>

      {/* Speakers List */}
      <div className="rounded-lg bg-white/10 p-6">
        <h2 className="mb-4 text-xl font-bold">
          {t("quotes.currentSpeakers")}
        </h2>

        {speakersLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-white/10" />
            ))}
          </div>
        ) : !speakers || speakers.length === 0 ? (
          <p className="py-8 text-center text-gray-400">
            {t("quotes.noSpeakersFound")}
          </p>
        ) : (
          <div className="space-y-3">
            {speakers.map((speaker) => (
              <div
                key={speaker.id}
                className="flex items-center justify-between rounded-lg bg-white/5 p-4"
              >
                {editingSpeaker?.id === speaker.id ? (
                  <form
                    onSubmit={handleUpdateSpeaker}
                    className="flex flex-1 gap-3"
                  >
                    <input
                      type="text"
                      value={editingSpeaker.name}
                      onChange={(e) =>
                        setEditingSpeaker({
                          ...editingSpeaker,
                          name: e.target.value,
                        })
                      }
                      className="flex-1 rounded border border-white/20 bg-white/10 px-3 py-1 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      maxLength={256}
                      required
                    />
                    <button
                      type="submit"
                      disabled={
                        !editingSpeaker.name.trim() || updateSpeaker.isPending
                      }
                      className="rounded bg-green-600 px-4 py-1 text-sm transition-colors hover:bg-green-700 disabled:bg-gray-600"
                    >
                      {updateSpeaker.isPending
                        ? t("common.saving")
                        : t("common.save")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingSpeaker(null)}
                      className="rounded bg-gray-600 px-4 py-1 text-sm transition-colors hover:bg-gray-700"
                    >
                      {t("common.cancel")}
                    </button>
                  </form>
                ) : (
                  <>
                    <div className="flex-1">
                      <h3 className="font-medium">{speaker.name}</h3>
                      {speaker.createdBy && (
                        <p className="text-sm text-gray-400">
                          {t("quotes.addedBy")} {speaker.createdBy.name}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setEditingSpeaker({
                            id: speaker.id,
                            name: speaker.name,
                          })
                        }
                        className="rounded bg-blue-600 px-3 py-1 text-sm transition-colors hover:bg-blue-700"
                      >
                        {t("common.edit")}
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteSpeaker(speaker.id)}
                          disabled={deleteSpeaker.isPending}
                          className="rounded bg-red-600 px-3 py-1 text-sm transition-colors hover:bg-red-700 disabled:bg-gray-600"
                        >
                          {deleteSpeaker.isPending
                            ? t("common.deleting")
                            : t("common.delete")}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {(updateSpeaker.error ?? deleteSpeaker.error) && (
          <div className="mt-3 rounded-lg border border-red-600/50 bg-red-600/20 p-3">
            <p className="text-sm text-red-300">
              Error:{" "}
              {updateSpeaker.error?.message ?? deleteSpeaker.error?.message}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
