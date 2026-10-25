"use client";

import { useRouter } from "next/navigation";
import { ScanSearch } from "lucide-react";
import { PageContainer, PageHeader, Section } from "@/components/layout/PageContainer";
import { DashboardOverview, DashboardReadyCTA } from "@/components/dashboard/DashboardOverview";
import { RecentInspection } from "@/components/dashboard/RecentInspection";
import { useAppContext } from "@/lib/context";

export default function DashboardPage() {
  const router = useRouter();
  const { lastResult, lastTimestamp } = useAppContext();

  return (
    <PageContainer>
      <PageHeader
        title="Warehouse Inspection"
        subtitle="Monitor rack inventory and inspection results."
        action={
          <button
            onClick={() => router.push("/inspection")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            id="dashboard-start-inspection-btn"
          >
            <ScanSearch size={15} aria-hidden="true" />
            Start Inspection
          </button>
        }
      />

      {/* Summary Stats */}
      <Section className="mb-6">
        <DashboardOverview
          lastResult={lastResult}
          lastTimestamp={lastTimestamp}
        />
      </Section>

      {/* Main content area */}
      <Section>
        {lastResult ? (
          <RecentInspection result={lastResult} />
        ) : (
          <DashboardReadyCTA onNavigate={() => router.push("/inspection")} />
        )}
      </Section>
    </PageContainer>
  );
}
