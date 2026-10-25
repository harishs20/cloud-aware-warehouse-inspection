// components/inspection/InspectionDetails.tsx
import { QrCode, ExternalLink } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";

interface InspectionDetailsProps {
  qrData: string | null;
}

export function InspectionDetails({ qrData }: InspectionDetailsProps) {
  return (
    <Card>
      <CardHeader
        title="Inventory Source"
        subtitle="QR code used for expected inventory"
        icon={<QrCode size={16} />}
      />

      {qrData ? (
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg border border-gray-100">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <QrCode size={15} className="text-blue-500" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">
              QR Source
            </p>
            <p className="text-sm text-gray-700 truncate font-mono">{qrData}</p>
          </div>
          {qrData.startsWith("http") && (
            <a
              href={qrData}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              aria-label="Open QR URL in new tab"
            >
              <ExternalLink size={14} aria-hidden="true" />
            </a>
          )}
        </div>
      ) : (
        <div className="px-4 py-3 bg-red-50 rounded-lg border border-red-100">
          <p className="text-sm text-red-600">QR code could not be detected.</p>
        </div>
      )}
    </Card>
  );
}
