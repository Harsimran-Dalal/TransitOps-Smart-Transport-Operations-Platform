export const LIVE_REFETCH_MS = 12_000;

export const liveQueryDefaults = {
  refetchInterval: LIVE_REFETCH_MS,
  refetchIntervalInBackground: true,
  staleTime: 5_000
};
