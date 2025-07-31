import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalyticsData } from "@/types";

interface AnalyticsChartProps {
  data: AnalyticsData;
}

export function AnalyticsChart({ data }: AnalyticsChartProps) {
  const chartData = useMemo(() => {
    // Process data for visualization
    return data.subjectAnalytics.map(subject => ({
      subject: subject.subject.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      mastery: parseFloat(subject.masteryLevel || '0'),
      score: parseFloat(subject.averageScore || '0'),
      questions: subject.totalQuestions,
    }));
  }, [data]);

  const getColorForMastery = (mastery: number) => {
    if (mastery >= 80) return 'bg-green-500';
    if (mastery >= 65) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getPriorityColor = (mastery: number) => {
    if (mastery < 50) return 'border-red-500 bg-red-50';
    if (mastery < 70) return 'border-yellow-500 bg-yellow-50';
    return 'border-green-500 bg-green-50';
  };

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-500">
              <i className="fas fa-chart-area text-4xl mb-2"></i>
              <p>Interactive performance chart</p>
              <p className="text-sm">Showing score trends over last 90 days</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subject Mastery Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Subject Mastery</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {chartData.map((subject, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 flex-1">
                    {subject.subject}
                  </span>
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="w-24 bg-gray-200 rounded-full h-2 relative">
                      <div
                        className={`h-2 rounded-full ${getColorForMastery(subject.mastery)}`}
                        style={{ width: `${Math.min(100, subject.mastery)}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-8">
                      {Math.round(subject.mastery)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Priority Areas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {chartData
                .sort((a, b) => a.mastery - b.mastery)
                .slice(0, 5)
                .map((subject, index) => {
                  let priority = '';
                  let icon = '';
                  
                  if (subject.mastery < 50) {
                    priority = 'Critical - Focus Required';
                    icon = 'fas fa-exclamation-triangle text-red-500';
                  } else if (subject.mastery < 70) {
                    priority = 'Needs Improvement';
                    icon = 'fas fa-info-circle text-yellow-500';
                  } else {
                    priority = 'Good Progress';
                    icon = 'fas fa-check-circle text-green-500';
                  }

                  return (
                    <div
                      key={index}
                      className={`p-4 border rounded-lg ${getPriorityColor(subject.mastery)}`}
                    >
                      <div className="flex items-start">
                        <i className={`${icon} mt-1 mr-3`}></i>
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900">
                            {subject.subject}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {priority} • {subject.questions} questions completed
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {Math.round(subject.mastery)}%
                          </div>
                          <div className="text-xs text-gray-500">
                            Avg: {Math.round(subject.score)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
