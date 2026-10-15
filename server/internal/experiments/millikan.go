package experiments

import (
	"fmt"
	"strings"
)

func millikan(f map[string]string, d map[string][]D) {
	count := len(d["voltage"])
	for j := 1; j <= 4; j++ {
		if len(d[fmt.Sprintf("time_%d", j)]) != count {
			fail("油滴电压与四次时间数量必须一致")
		}
	}
	q, counts, reverseSamples := []D{}, []D{}, []D{}
	ref := dec("1.602176634e-19")
	scale := dec("1e-19")
	for i, v := range d["voltage"] {
		pos(v, "平衡电压")
		ts := []D{}
		for j := 1; j <= 4; j++ {
			ts = append(ts, pos(d[fmt.Sprintf("time_%d", j)][i], "下降时间"))
		}
		t := mean(ts)
		base := one.Add(dec(".0226").Mul(sqrt(t)))
		charge := div(dec(".928e-14"), v.Mul(t).Mul(base).Mul(sqrt(base)))
		c := div(charge, ref).RoundBank(0)
		if c.LessThan(one) {
			c = one
		}
		q = append(q, charge)
		counts = append(counts, c)
		reverseSamples = append(reverseSamples, div(charge, c))
		suffix := fmt.Sprintf("_%02d", i+1)
		for k, x := range map[string]D{"time_mean": t, "charge": charge, "electron_count": c, "charge_per_e": div(div(charge, c), scale), "charge_scaled": div(charge, scale)} {
			put(f, k+suffix, x)
		}
	}
	sumNQ, sumN2 := zero, zero
	for i, x := range q {
		sumNQ = sumNQ.Add(counts[i].Mul(x))
		sumN2 = sumN2.Add(sq(counts[i]))
	}
	ls := div(sumNQ, sumN2)
	res := zero
	for i, x := range q {
		res = res.Add(sq(x.Sub(ls.Mul(counts[i]))))
	}
	lsu := sqrt(div(div(res, n(count-1)), sumN2))
	nm, qm := mean(counts), mean(q)
	variance, covariance := zero, zero
	for i, x := range q {
		variance = variance.Add(sq(counts[i].Sub(nm)))
		covariance = covariance.Add(counts[i].Sub(nm).Mul(x.Sub(qm)))
	}
	graph, intercept, gu := ls, zero, lsu
	if !variance.IsZero() {
		graph = div(covariance, variance)
		intercept = qm.Sub(graph.Mul(nm))
		r := zero
		for i, x := range q {
			r = r.Add(sq(x.Sub(graph.Mul(counts[i])).Sub(intercept)))
		}
		gu = sqrt(div(div(r, n(count-2)), variance))
	}
	low, high := counts[0], counts[0]
	points := []string{}
	for i, x := range counts {
		if x.LessThan(low) {
			low = x
		}
		if x.GreaterThan(high) {
			high = x
		}
		points = append(points, point(x, div(q[i], scale)))
	}
	if low.Equal(high) {
		low = zero
		high = high.Add(one)
	}
	f["charge_graph_points"] = strings.Join(points, " ")
	f["charge_graph_fit_points"] = point(low, div(graph.Mul(low).Add(intercept), scale)) + " " + point(high, div(graph.Mul(high).Add(intercept), scale))
	reverse, ru := mean(reverseSamples), sem(reverseSamples)
	pair(f, "electron_charge_reverse", "electron_charge_reverse_u", reverse, ru)
	gp := pair(f, "electron_charge_graph", "electron_charge_graph_u", graph, gu)
	var ex *int
	e := adjusted(graph)
	if !graph.IsZero() && (e < -4 || e > 6) {
		ex = &e
	}
	f["electron_charge_graph_intercept"] = reportAt(intercept, gp, ex)
	pair(f, "electron_charge_ls", "electron_charge_ls_u", ls, lsu)
	f["reverse_error_percent"] = percent(div(reverse.Sub(ref).Abs(), ref).Mul(n(100)), div(ru, reverse))
	f["ls_error_percent"] = percent(div(ls.Sub(ref).Abs(), ref).Mul(n(100)), div(lsu, ls))
}
