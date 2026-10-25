"use client";

import { useRouter } from "next/navigation";
import { History, CheckCircle2, XCircle, Package, Clock, Trash2, ScanSearch } from "lucide-react";
import { PageContainer, PageHeader, Section } from "@/components/layout/PageContainer";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAppContext } from "@/lib/context";
import { formatTimestamp, formatRackName } from "@/lib/utils";

export default function HistoryPage() {
  const router = useRouter();
  const { history, clearHistory } = useAppContext();

  return (
    <PageContainer>
      <PageHeader
        title="Inspection History"
        subtitle="Session-based inspection log. History resets on page refresh."
        action={
          history.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Trash2 size={13} />}
              onClick={clearHistory}
              id="clear-history-btn"
            >
              Clear History
            </Button>
          ) : undefined
        }
      />

      <Section>
        {history.length === 0 ? (
          <Card>
            <EmptyState
              icon={History}
              title="No inspection history"
              description="No historical inspections are available. Run an inspection to see results appear here."
              action={
                <Button
                  variant="primary"
                  leftIcon={<ScanSearch size={14} />}
                  onClick={() => router.push("/inspection")}
                  id="history-start-inspection-btn"
                >
                  Start Inspection
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {history.map((entry) => {
              const isPass = entry.overall_status === "PASS";
              const racks = Object.keys(entry.result.comparison ?? {});

              return (
                <Card
                  key={entry.id}
                  className="animate-fade-in hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Status icon */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isPass ? "bg-green-50" : "bg-red-50"
                      }`}
                    >
                      {isPass ? (
                        <CheckCircle2
                          size={20}
                          className="text-green-600"
                          aria-label="Passed"
                        />
                      ) : (
                        <XCircle
                          size={20}
                          className="text-red-600"
                          aria-label="Failed"
                        />
                      )}
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <StatusBadge status={entry.overall_status} />
                        <span className="text-xs text-gray-400">
                          #{entry.id.slice(-6)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock size={11} aria-hidden="true" />
                          {formatTimestamp(entry.timestamp)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Package size={11} aria-hidden="true" />
                          {entry.total_detections} objects detected
                        </span>
                      </div>
                    </div>

                    {/* Rack summary */}
                    <div className="flex flex-wrap gap-2">
                      {racks.map((rk) => {
                        const rackItems = entry.result.comparison[rk] ?? {};
                        const hasIssue = Object.values(rackItems).some(
                          (v) => v.status !== "PASS"
                        );
                        return (
                          <div
                            key={rk}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border ${
                              hasIssue
                                ? "bg-red-50 border-red-200 text-red-700"
                                : "bg-green-50 border-green-200 text-green-700"
                            }`}
                          >
                            {hasIssue ? (
                              <XCircle size={10} aria-hidden="true" />
                            ) : (
                              <CheckCircle2 size={10} aria-hidden="true" />
                            )}
                            {formatRackName(rk)}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* QR data if available */}
                  {entry.result.qr?.data && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-[11px] text-gray-400">
                        QR Source:{" "}
                        <span className="font-mono text-gray-500">
                          {entry.result.qr.data}
                        </span>
                      </p>
                    </div>
                  )}
                </Card>
              );
            })}

            <p className="text-center text-xs text-gray-400 pt-2">
              Showing {history.length} session inspection
              {history.length !== 1 ? "s" : ""}. History resets on page
              refresh.
            </p>
          </div>
        )}
      </Section>
    </PageContainer>
  );
}
