import { type CategoryEntry } from "@/lib/financial-types"
import { formatCurrency } from "@/lib/financial-utils"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { CategoryRankingTable, CategoryRankingTableSkeleton } from "./category-ranking-table"

interface BusinessPanelProps {
  businessType: "B2B" | "B2C"
  categories: CategoryEntry[]
  groupTotal: number
  isLoading: boolean
  error: string | null
}

export function BusinessPanel({ businessType, categories, groupTotal, isLoading, error }: BusinessPanelProps) {
  return (
    <Card className="border-border/60 flex-1 min-w-0">
      <CardHeader className="pb-3">
        <h2 className="text-lg leading-none font-semibold">{businessType}</h2>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <CategoryRankingTableSkeleton />
        ) : error ? (
          <p className="text-sm text-destructive">
            Failed to load {businessType} data. Please try again later.
          </p>
        ) : categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No income categories for {businessType} in the selected range.
          </p>
        ) : (
          <>
            <CategoryRankingTable categories={categories} groupTotal={groupTotal} />
            <p className="mt-3 text-right text-sm text-muted-foreground tabular-nums">
              Total: {formatCurrency(groupTotal, 2)}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}