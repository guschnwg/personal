package database

import (
	"math"
	"testing"
)

func Abs(number float64) float64 {
	return math.Abs(number)
}

func TestAbs(t *testing.T) {
	got := Abs(-1)
	if got != 1 {
		t.Errorf("Abs(-1) = %f; want 1", got)
	}
}
