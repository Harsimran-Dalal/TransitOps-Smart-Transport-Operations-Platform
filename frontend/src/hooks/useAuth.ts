import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { SessionUser } from "../lib/types";

async function fetchSession(): Promise<SessionUser | null> {
  try {
    const { data } = await api.get("/auth/me");
    return data;
  } catch {
    return null;
  }
}

export { fetchSession };

export function useAuth() {
  return useQuery({
    queryKey: ["session"],
    queryFn: fetchSession,
    retry: false,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnMount: false
  });
}
