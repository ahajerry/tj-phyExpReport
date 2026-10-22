package experiments

import (
	"encoding/json"
	"fmt"
	"os"
	"phyexp/server/internal/domain"
	"testing"
)

func TestLensPositionDirection(t *testing.T) {
	b, err := os.ReadFile("../../testdata/web-samples.json")
	if err != nil {
		t.Fatal(err)
	}
	var samples map[string]domain.Payload
	if err := json.Unmarshal(b, &samples); err != nil {
		t.Fatal(err)
	}
	left := samples["focal-length"]
	want, _, err := Calculate(left)
	if err != nil {
		t.Fatal(err)
	}
	legacy := clone(left)
	legacy.Parameters = nil
	got, normalized, err := Calculate(legacy)
	if err != nil || got["focus_single_mean_mm"] != want["focus_single_mean_mm"] || normalized.Parameters["position_direction"] != "1" {
		t.Fatalf("legacy direction: %v, %v", normalized.Parameters, err)
	}
	for _, origin := range []string{"1200", "0"} {
		t.Run("mirrored_at_"+origin, func(t *testing.T) {
			right := clone(left)
			right.Parameters["position_direction"] = "-1"
			for key, values := range right.Data {
				for i, value := range values {
					right.Data[key][i] = domain.Scalar(dec(origin).Sub(dec(string(value))).StringFixed(2))
				}
			}
			got, normalized, err := Calculate(right)
			if err != nil {
				t.Fatal(err)
			}
			for key := range left.Data {
				for i, value := range right.Data[key] {
					if got[fmt.Sprintf("%s_%02d", key, i+1)] != string(value) || normalized.Data[key][i] != value {
						t.Fatalf("raw coordinate changed: %s", key)
					}
				}
			}
			for _, key := range []string{"object_distance", "image_distance", "bessel_length", "bessel_separation", "single_focus", "bessel_focus", "auto_focus"} {
				for i := 1; i <= 3; i++ {
					field := fmt.Sprintf("%s_%02d", key, i)
					if got[field] != want[field] {
						t.Errorf("%s: %s != %s", field, got[field], want[field])
					}
				}
			}
			for _, method := range []string{"single", "bessel", "auto"} {
				for _, suffix := range []string{"mean_mm", "u_mm"} {
					key := "focus_" + method + "_" + suffix
					if got[key] != want[key] {
						t.Errorf("%s: %s != %s", key, got[key], want[key])
					}
				}
			}
			for _, key := range []string{"single_lens", "bessel_lens_large", "auto_lens"} {
				bad := clone(right)
				bad.Data[key][0] = "2000"
				if key == "auto_lens" {
					bad.Data[key][0] = bad.Data["auto_object"][0]
				}
				if _, _, err := Calculate(bad); err == nil {
					t.Errorf("accepted invalid right-side position: %s", key)
				}
			}
			right.Parameters["position_direction"] = "1"
			if got, _, err := Calculate(right); err != nil || got["focus_single_mean_mm"] != want["focus_single_mean_mm"] {
				t.Errorf("absolute distances depend on saved direction: %v", err)
			}
		})
	}
	for _, direction := range []domain.Scalar{"0", "2", "-0.5", ""} {
		bad := clone(left)
		bad.Parameters["position_direction"] = direction
		if _, _, err := Calculate(bad); err == nil {
			t.Errorf("accepted invalid direction %q", direction)
		}
	}
}

func TestLensScreenshotCoordinates(t *testing.T) {
	b, err := os.ReadFile("../../testdata/lens-reversed.json")
	if err != nil {
		t.Fatal(err)
	}
	var p domain.Payload
	if err := json.Unmarshal(b, &p); err != nil {
		t.Fatal(err)
	}
	f, normalized, err := Calculate(p)
	if err != nil {
		t.Fatal(err)
	}
	for key, want := range map[string]string{"object_distance_01": "220", "image_distance_01": "180", "bessel_length_01": "500", "bessel_separation_01": "228", "focus_auto_mean_mm": "100.0"} {
		if f[key] != want {
			t.Errorf("%s: got %s want %s", key, f[key], want)
		}
	}
	if normalized.Data["single_object"][0] != "930.0" {
		t.Fatal("raw reading text changed")
	}
}
