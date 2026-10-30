package render

import (
	"strings"
	"testing"
)

func TestForcedTableHasFiveColumns(t *testing.T) {
	for _, count := range []int{3, 15, 20} {
		table := measurementTables(2, 1, count)["FORCED"]
		if strings.Contains(table, "table_signed_theory") || strings.Contains(table, "理论相位") {
			t.Fatal("forced table still includes theoretical phase")
		}
		rows := 0
		for _, line := range strings.Split(table, "\n") {
			if strings.HasPrefix(line, `\Field[8mm]{table_drive_time_10_`) {
				rows++
				if strings.Count(line, " & ") != 4 {
					t.Fatalf("expected five cells: %s", line)
				}
			}
		}
		if rows != count {
			t.Fatalf("got %d rows, want %d", rows, count)
		}
	}
}
