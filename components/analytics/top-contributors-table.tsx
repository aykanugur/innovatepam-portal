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
      <div className="flex h-24 items-center justify-center text-sm" style={{ color: '#8888A8' }}>
        No submissions yet
      </div>
    )
  }

  return (
    <div>
      <h3 className="mb-4 text-base font-semibold" style={{ color: '#F0F0FA' }}>
        Top Contributors
      </h3>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <th className="pb-2 text-left font-medium" style={{ color: '#8888A8' }}>
              #
            </th>
            <th className="pb-2 text-left font-medium" style={{ color: '#8888A8' }}>
              Name
            </th>
            <th className="pb-2 text-right font-medium" style={{ color: '#8888A8' }}>
              Ideas
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={row.displayName}
              style={{
                borderBottom: index < data.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              }}
            >
              <td className="py-2 pr-4 tabular-nums" style={{ color: '#8888A8' }}>
                {index + 1}
              </td>
              <td className="py-2 font-medium" style={{ color: '#F0F0FA' }}>
                {row.displayName}
              </td>
              <td className="py-2 text-right tabular-nums" style={{ color: '#00c8ff' }}>
                {row.count}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
