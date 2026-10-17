import { type CategoryEntry } from "@/lib/financial-types"
import { formatCurrency, capitalizeCategory } from "@/lib/financial-utils"
import { Skeleton } from "@/components/ui/skeleton"

interface CategoryRankingTableProps {
  categories: CategoryEntry[]
  groupTotal: number
}

export function CategoryRankingTable({ categories, groupTotal }: CategoryRankingTableProps) {
  if (categories.length === 0) {
    return null // Empty state handled by parent BusinessPanel
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border/60">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/40 bg-muted/30">
            <th scope="col" className="px-3 py-2 text-left font-medium text-muted-foreground">Category</th>
            <th scope="col" className="px-3 py-2 text-right font-medium text-muted-foreground">Total income</th>
            <th scope="col" className="px-3 py-2 text-right font-medium text-muted-foreground">% of group</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((entry) => {
            const pct =
              groupTotal > 0
                ? ((entry.total_amount / groupTotal) * 100).toFixed(1)
                : "0.0"
            return (
              <tr
                key={entry.category}
                className="border-b border-border/20 last:border-b-0 hover:bg-muted/20"
              >
                <td className="px-3 py-2.5 font-medium text-foreground">
                  {capitalizeCategory(entry.category)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-foreground">
                  {formatCurrency(entry.total_amount, 2)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                  {pct}%
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function CategoryRankingTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border/60">
      <div className="border-b border-border/40 bg-muted/30 px-3 py-2 flex gap-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24 ml-auto" />
        <Skeleton className="h-4 w-16" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-border/20 px-3 py-2.5 last:border-b-0"
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28 ml-auto" />
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  )
}