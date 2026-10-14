package experiments

import (
	"fmt"
	"github.com/shopspring/decimal"
	"math"
	"math/big"
	"strconv"
	"strings"
)

// D keeps all input and algebra in decimal. Only transcendental log/atan2 use
// float64, matching the reference implementation. Never round intermediates.
type D = decimal.Decimal

var zero = dec("0")
var one = dec("1")
var pi = dec("3.141592653589793")

func dec(s string) D {
	v, e := decimal.NewFromString(strings.TrimSpace(s))
	if e != nil {
		panic(inputError("必须是有限数字: " + s))
	}
	if v.Exponent() < -1000 || v.Exponent() > 1000 {
		panic(inputError("数字指数超出允许范围"))
	}
	return v
}
func n(i int) D { return decimal.NewFromInt(int64(i)) }
func div(a, b D) D {
	if b.IsZero() {
		panic(inputError("计算分母不能为零"))
	}
	return a.DivRound(b, 60)
}
func sq(a D) D { return a.Mul(a) }
func sqrt(a D) D {
	if a.IsNegative() {
		panic(inputError("平方根参数不能为负数"))
	}
	f, _, e := big.ParseFloat(a.String(), 10, 256, big.ToNearestEven)
	if e != nil {
		panic(e)
	}
	return dec(new(big.Float).SetPrec(256).Sqrt(f).Text('g', 70))
}
func sum(a []D) D {
	v := zero
	for _, x := range a {
		v = v.Add(x)
	}
	return v
}
func mean(a []D) D { return div(sum(a), n(len(a))) }
func sem(a []D) D {
	if len(a) < 2 {
		return zero
	}
	m := mean(a)
	v := zero
	for _, x := range a {
		v = v.Add(sq(x.Sub(m)))
	}
	return sqrt(div(v, n(len(a)*(len(a)-1))))
}
func hypot(a ...D) D {
	v := zero
	for _, x := range a {
		v = v.Add(sq(x))
	}
	return sqrt(v)
}
func pos(x D, label string) D {
	if !x.IsPositive() {
		panic(inputError(label + " 必须大于零"))
	}
	return x
}
func nonneg(x D, label string) D {
	if x.IsNegative() {
		panic(inputError(label + " 不能小于零"))
	}
	return x
}
func adjusted(x D) int {
	if x.IsZero() {
		return 0
	}
	return len(x.Coefficient().Abs(x.Coefficient()).String()) + int(x.Exponent()) - 1
}
func fixed(x D, digits int) string { return x.StringFixedBank(int32(digits)) }
func general(x D) string {
	if x.IsZero() {
		return "0"
	}
	e := adjusted(x)
	v := x.RoundBank(int32(5 - e))
	if e < -4 || e >= 6 {
		return v.Shift(int32(-e)).String() + fmt.Sprintf("e%+d", e)
	}
	return v.String()
}

// place is a base-10 exponent; nil denotes an exact/zero uncertainty.
func uncertaintyPlace(u D) *int {
	nonneg(u, "不确定度")
	if u.IsZero() {
		return nil
	}
	e := adjusted(u)
	if u.Shift(int32(-e)).LessThan(n(3)) {
		e--
	}
	return &e
}
func at(x D, p *int) string {
	if p == nil {
		return x.String()
	}
	if *p > 0 {
		return x.RoundBank(int32(-*p)).StringFixed(0)
	}
	return fixed(x, -*p)
}
func reportAt(x D, p *int, exponent *int) string {
	if p == nil {
		return general(x)
	}
	if exponent == nil {
		return at(x, p)
	}
	q := *p - *exponent
	return at(x.Shift(int32(-*exponent)), &q) + fmt.Sprintf("e%+d", *exponent)
}
func uncertainty(u D) string {
	p := uncertaintyPlace(u)
	if p == nil {
		return "0"
	}
	return at(u, p)
}
func finish(f map[string]string, vk, uk string, v, u D, scientific bool) *int {
	p := uncertaintyPlace(u)
	if scientific && p == nil {
		f[vk] = general(v)
		f[uk] = "0"
		return p
	}
	var e *int
	if scientific {
		ref := v
		if ref.IsZero() {
			ref = u
		}
		a := adjusted(ref)
		if a < -4 || a > 6 {
			e = &a
		}
	}
	f[vk] = reportAt(v, p, e)
	f[uk] = reportAt(u, p, e)
	if !scientific {
		f[vk] = at(v, p)
		f[uk] = at(u, p)
	}
	return p
}
func pair(f map[string]string, vk, uk string, v, u D) *int { return finish(f, vk, uk, v, u, true) }
func percent(v, r D) string {
	f := map[string]string{}
	pair(f, "v", "u", v, r.Mul(n(100)))
	return f["v"]
}
func put(f map[string]string, key string, v D) { f[key] = general(v) }
func point(x, y D) string                      { return "(" + general(x) + "," + general(y) + ")" }
func floatD(v float64) D {
	if math.IsNaN(v) || math.IsInf(v, 0) {
		panic(inputError("无效计算结果"))
	}
	return dec(strconv.FormatFloat(v, 'g', -1, 64))
}
func fl(v D) float64 { x, _ := v.Float64(); return x }
