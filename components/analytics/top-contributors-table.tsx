/**
 * components/analytics/top-contributors-table.tsx — T039
 *
 * Server component: top-5 contributors ranked table (US-014, FR-023, FR-024).
 * Accepts up to 5 rows; shows empty state when data is empty.
 */

interface TopContributorRow {
  displayName: string
  count: number
}

interface TopContributorsTableProps {
  data: TopContributorRow[]
}

export function TopContributorsTable({ data }: TopContributorsTableProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center text-sm text-gray-500">
        No submissions yet
      </div>
    )
  }

  return (
    <div>
      <h3 className="mb-4 text-base font-semibold text-gray-900">Top Contributors</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="pb-2 text-left font-medium text-gray-500">#</th>
            <th className="pb-2 text-left font-medium text-gray-500">Name</th>
            <th className="pb-2 text-right font-medium text-gray-500">Ideas</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={row.displayName} className="border-b border-gray-100 last:border-0">
              <td className="py-2 pr-4 text-gray-400 tabular-nums">{index + 1}</td>
              <td className="py-2 font-medium text-gray-900">{row.displayName}</td>
              <td className="py-2 text-right tabular-nums text-gray-700">{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
