import { useQuery } from "@tanstack/react-query";
import type { AnalyticsData } from "@/types";

export function useUserAnalytics(userId: string) {
  return useQuery<AnalyticsData>({
    queryKey: ['/api/users', userId, 'analytics'],
    enabled: !!userId,
  });
}

export function useStudyRecommendations(userId: string) {
  return useQuery({
    queryKey: ['/api/users', userId, 'recommendations'],
    enabled: !!userId,
  });
}
