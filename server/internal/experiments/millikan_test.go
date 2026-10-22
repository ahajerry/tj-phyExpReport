package experiments

import (
	"fmt"
	"phyexp/server/internal/domain"
	"strings"
	"testing"
)

func TestMillikanLectureFormula(t *testing.T) {
	// Independently evaluated with Python Decimal at 60 digits from the
	// supplied equation (8.3.19). Different times catch the missing sqrt(t).
	d := map[string][]D{"voltage": {n(100), n(200), n(300)}}
	for j := 1; j <= 4; j++ {
		d["time_"+n(j).String()] = []D{n(4), n(16), n(25)}
	}
	f := map[string]string{}
	millikan(f, d)
	for key, want := range map[string]string{
		"charge_01": "1.08557e-17", "charge_02": "6.36736e-19", "charge_03": "2.10753e-19",
		"electron_count_01": "68", "electron_count_02": "4", "electron_count_03": "1",
		// Independent Decimal reference, lecture U=t*sqrt(sum/(m*(m-1))).
		"electron_charge_reverse_95": "1.8e-19", "electron_charge_reverse_u95": "0.7e-19",
		"electron_charge_ls_95": "1.6e-19", "electron_charge_ls_u95": "0.9e-19",
		"student_t_95": "4.303", "oil_drop_count": "3",
	} {
		if f[key] != want {
			t.Errorf("%s: got %s want %s", key, f[key], want)
		}
	}
}

func TestOilCSVFourColumnsAndLegacyCompatibility(t *testing.T) {
	var csv strings.Builder
	csv.WriteString("当前电压Uc(V)平衡电压U(V)时间t(s)电荷量(C)\n")
	for i := 0; i < 32; i++ {
		fmt.Fprintf(&csv, "0.0,%d.00,23.160,\n", 100+i/4)
	}
	p, err := Import("millikan", "synthetic.csv", []byte(csv.String()))
	if err != nil {
		t.Fatal(err)
	}
	if len(p.SourceTables[0].Headers) != 4 || len(p.SourceTables[0].Rows) != 32 {
		t.Fatal("CSV must retain four columns and 32 readings")
	}
	if got := strings.Join(p.SourceTables[0].Rows[0], ","); got != "0.0,100.00,23.160," {
		t.Fatal(got)
	}
	for _, legacy := range []bool{false, true} {
		input := clone(p)
		if legacy {
			for i, row := range input.SourceTables[0].Rows {
				input.SourceTables[0].Rows[i] = append([]string{fmt.Sprint(i/4 + 1), fmt.Sprint(i%4 + 1)}, row...)
			}
		}
		editable, err := Editable(input)
		if err != nil {
			t.Fatal(err)
		}
		fields, normalized, err := Calculate(editable)
		if err != nil {
			t.Fatal(err)
		}
		if normalized.SourceTables[0].Rows[0][2] != "23.160" || len(normalized.SourceTables[0].Headers) != 4 {
			t.Fatal("normalization must preserve raw readings and CSV columns")
		}
		if fields["student_t_95"] != "2.365" || fields["oil_drop_count"] != "8" {
			t.Fatal("wrong 8-drop confidence factor")
		}
		// Editing the displayed record must also update the report source table.
		editable.Data["fall_time"][0] = domain.Scalar("24.000")
		_, edited, err := Calculate(editable)
		if err != nil || edited.SourceTables[0].Rows[0][2] != "24.000" {
			t.Fatal("edited readings were not used in raw report table", err)
		}
	}
}
