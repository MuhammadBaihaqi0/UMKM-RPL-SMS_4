package services

import (
	"fmt"
	"math"
	"sort"
	"strings"
	"time"
	"umkm-insight-backend/models"
)

var namaBulan = []string{
	"Januari", "Februari", "Maret", "April", "Mei", "Juni",
	"Juli", "Agustus", "September", "Oktober", "November", "Desember",
}

// HitungTotalPenjualan menghitung total penjualan (amount > 0 & type = penjualan)
func HitungTotalPenjualan(transactions []models.Transaction) float64 {
	total := 0.0
	for _, t := range transactions {
		if t.Amount > 0 && t.Type == "penjualan" {
			total += t.Amount
		}
	}
	return total
}

// HitungTotalPengeluaran menghitung total pengeluaran (amount < 0)
func HitungTotalPengeluaran(transactions []models.Transaction) float64 {
	total := 0.0
	for _, t := range transactions {
		if t.Amount < 0 {
			total += t.Amount
		}
	}
	return math.Abs(total)
}

// HitungRataRata menghitung rata-rata transaksi penjualan
func HitungRataRata(transactions []models.Transaction) float64 {
	count := 0
	total := 0.0
	for _, t := range transactions {
		if t.Amount > 0 && t.Type == "penjualan" {
			total += t.Amount
			count++
		}
	}
	if count == 0 {
		return 0
	}
	return math.Round(total / float64(count))
}

// HitungTrenBulanan menghitung tren penjualan per bulan
func HitungTrenBulanan(transactions []models.Transaction) []models.TrenBulanan {
	bulanan := make(map[string]*models.TrenBulanan)

	for _, t := range transactions {
		if t.Type != "penjualan" || t.Amount <= 0 {
			continue
		}
		parsed, err := time.Parse(time.RFC3339, t.Date)
		if err != nil {
			continue
		}
		key := fmt.Sprintf("%d-%02d", parsed.Year(), parsed.Month())
		label := fmt.Sprintf("%s %d", namaBulan[parsed.Month()-1], parsed.Year())

		if _, exists := bulanan[key]; !exists {
			bulanan[key] = &models.TrenBulanan{Key: key, Bulan: label}
		}
		bulanan[key].TotalPenjualan += t.Amount
		bulanan[key].JumlahTransaksi++
		bulanan[key].NetAmount += t.NetAmount
	}

	result := make([]models.TrenBulanan, 0, len(bulanan))
	for _, v := range bulanan {
		result = append(result, *v)
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].Key < result[j].Key
	})
	return result
}

// HitungPerformaPerSumber menghitung performa per sumber aplikasi
func HitungPerformaPerSumber(transactions []models.Transaction) []models.PerformaSumber {
	sumberMap := make(map[string]*models.PerformaSumber)

	for _, t := range transactions {
		if _, exists := sumberMap[t.SourceApp]; !exists {
			sumberMap[t.SourceApp] = &models.PerformaSumber{SourceApp: t.SourceApp}
		}
		s := sumberMap[t.SourceApp]
		s.JumlahTransaksi++
		s.TotalAmount += t.Amount
		if t.Amount > 0 {
			s.TotalPenjualan += t.Amount
		} else {
			s.TotalPengeluaran += math.Abs(t.Amount)
		}
	}

	result := make([]models.PerformaSumber, 0, len(sumberMap))
	for _, s := range sumberMap {
		if s.JumlahTransaksi > 0 {
			s.RataRata = math.Round(math.Abs(s.TotalAmount) / float64(s.JumlahTransaksi))
		}
		result = append(result, *s)
	}
	return result
}

// HitungBreakdownFee menghitung total fee per kategori
func HitungBreakdownFee(transactions []models.Transaction) models.BreakdownFee {
	fee := models.BreakdownFee{}
	for _, t := range transactions {
		fee.FeeMarketplace += t.FeeMarketplace
		fee.FeePOS += t.FeePOS
		fee.FeeSupplier += t.FeeSupplier
		fee.FeeLogistik += t.FeeLogistik
		fee.FeeBank += t.FeeBank
		fee.FeeGateway += t.FeeGateway
		fee.Pajak += t.Pajak
	}
	fee.Total = fee.FeeMarketplace + fee.FeePOS + fee.FeeSupplier +
		fee.FeeLogistik + fee.FeeBank + fee.FeeGateway + fee.Pajak
	return fee
}

// HitungDistribusiTipe menghitung distribusi tipe transaksi
func HitungDistribusiTipe(transactions []models.Transaction) map[string]map[string]interface{} {
	dist := make(map[string]map[string]interface{})
	for _, t := range transactions {
		if _, exists := dist[t.Type]; !exists {
			dist[t.Type] = map[string]interface{}{"count": 0, "total": 0.0}
		}
		dist[t.Type]["count"] = dist[t.Type]["count"].(int) + 1
		dist[t.Type]["total"] = dist[t.Type]["total"].(float64) + math.Abs(t.Amount)
	}
	return dist
}

// GenerateInsights menghasilkan insight bisnis otomatis
func GenerateInsights(transactions []models.Transaction) []models.Insight {
	insights := []models.Insight{}
	tren := HitungTrenBulanan(transactions)

	// Insight 1: Tren penjualan
	if len(tren) >= 2 {
		last := tren[len(tren)-1]
		prev := tren[len(tren)-2]
		pct := math.Round(((last.TotalPenjualan - prev.TotalPenjualan) / prev.TotalPenjualan) * 100)
		if pct > 0 {
			insights = append(insights, models.Insight{
				Type: "positive", Icon: "📈",
				Message: fmt.Sprintf("Penjualan bulan %s naik %.0f%% dibanding bulan sebelumnya!", last.Bulan, pct),
			})
		} else if pct < 0 {
			insights = append(insights, models.Insight{
				Type: "negative", Icon: "📉",
				Message: fmt.Sprintf("Penjualan bulan %s turun %.0f%% dibanding bulan sebelumnya.", last.Bulan, math.Abs(pct)),
			})
		}
	}

	// Insight 2: Sumber terbesar
	performa := HitungPerformaPerSumber(transactions)
	var best *models.PerformaSumber
	for i := range performa {
		if best == nil || performa[i].TotalPenjualan > best.TotalPenjualan {
			best = &performa[i]
		}
	}
	if best != nil && best.TotalPenjualan > 0 {
		insights = append(insights, models.Insight{
			Type: "info", Icon: "🏆",
			Message: fmt.Sprintf("Sumber pendapatan terbesar berasal dari %s dengan total Rp%s.",
				best.SourceApp, formatNumber(best.TotalPenjualan)),
		})
	}

	// Insight 3: Rata-rata
	avg := HitungRataRata(transactions)
	insights = append(insights, models.Insight{
		Type: "info", Icon: "💰",
		Message: fmt.Sprintf("Rata-rata nilai penjualan per transaksi adalah Rp%s.", formatNumber(avg)),
	})

	// Insight 4: Fee
	fees := HitungBreakdownFee(transactions)
	insights = append(insights, models.Insight{
		Type: "warning", Icon: "🏦",
		Message: fmt.Sprintf("Total biaya operasional (fee + pajak) mencapai Rp%s. Pertimbangkan optimasi channel penjualan.", formatNumber(fees.Total)),
	})

	// Insight 5: Bulan terbaik
	if len(tren) > 0 {
		bestMonth := tren[0]
		for _, t := range tren {
			if t.TotalPenjualan > bestMonth.TotalPenjualan {
				bestMonth = t
			}
		}
		insights = append(insights, models.Insight{
			Type: "positive", Icon: "⭐",
			Message: fmt.Sprintf("Bulan terbaik untuk penjualan adalah %s dengan total Rp%s.", bestMonth.Bulan, formatNumber(bestMonth.TotalPenjualan)),
		})
	}

	// Insight 6: Jumlah transaksi
	count := 0
	for _, t := range transactions {
		if t.Type == "penjualan" {
			count++
		}
	}
	insights = append(insights, models.Insight{
		Type: "info", Icon: "📊",
		Message: fmt.Sprintf("Total %d transaksi penjualan tercatat dalam periode ini.", count),
	})

	return insights
}

// AnalisisLengkap melakukan semua analisis sekaligus
func AnalisisLengkap(transactions []models.Transaction) models.AnalisisResult {
	totalPenjualan := HitungTotalPenjualan(transactions)
	totalPengeluaran := HitungTotalPengeluaran(transactions)
	jumlahPenjualan := 0
	for _, t := range transactions {
		if t.Type == "penjualan" {
			jumlahPenjualan++
		}
	}

	return models.AnalisisResult{
		Ringkasan: models.Ringkasan{
			TotalPenjualan:   totalPenjualan,
			TotalPengeluaran: totalPengeluaran,
			LabaKotor:        totalPenjualan - totalPengeluaran,
			RataRata:         HitungRataRata(transactions),
			JumlahTransaksi:  len(transactions),
			JumlahPenjualan:  jumlahPenjualan,
		},
		TrenBulanan:       HitungTrenBulanan(transactions),
		PerformaPerSumber: HitungPerformaPerSumber(transactions),
		DistribusiTipe:    HitungDistribusiTipe(transactions),
		BreakdownFee:      HitungBreakdownFee(transactions),
		Insights:          GenerateInsights(transactions),
	}
}

func formatNumber(n float64) string {
	s := fmt.Sprintf("%.0f", n)
	if len(s) <= 3 {
		return s
	}
	var result []string
	for i := len(s); i > 0; i -= 3 {
		start := i - 3
		if start < 0 {
			start = 0
		}
		result = append([]string{s[start:i]}, result...)
	}
	return strings.Join(result, ".")
}
