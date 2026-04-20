package controllers

import (
	"net/http"
	"sort"
	"time"
	"umkm-insight-backend/services"

	"github.com/gin-gonic/gin"
)

// GetDashboard handles GET /api/umkm_insight/dashboard
// Menggabungkan profil + analisis + transaksi terbaru untuk frontend
func GetDashboard(c *gin.Context) {
	userID := c.Query("user_id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Parameter user_id wajib diisi",
			"contoh":  "/api/umkm_insight/dashboard?user_id=UMKM001",
		})
		return
	}

	// Step 1: Ambil profil user
	user, err := services.GetUserProfile(userID)
	if err != nil || user == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "User tidak ditemukan: " + userID,
		})
		return
	}

	// Step 2: Ambil transaksi
	transactions, err := services.GetTransactions(userID)
	if err != nil || len(transactions) == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "Tidak ada data transaksi untuk user: " + userID,
		})
		return
	}

	// Step 3: Analisis
	analisis := services.AnalisisLengkap(transactions)

	// Step 4: Sort transaksi terbaru (max 10)
	sort.Slice(transactions, func(i, j int) bool {
		ti, _ := time.Parse(time.RFC3339, transactions[i].Date)
		tj, _ := time.Parse(time.RFC3339, transactions[j].Date)
		return ti.After(tj)
	})
	recentTx := transactions
	if len(recentTx) > 10 {
		recentTx = recentTx[:10]
	}

	// Step 5: Fee structure
	feeStructure := services.GetFeeStructure()

	c.JSON(http.StatusOK, gin.H{
		"status":            "success",
		"endpoint":          "/umkm_insight/dashboard",
		"source":            "SmartBank (via API Gateway)",
		"mode":              "READ-ONLY",
		"user":              user,
		"analisis":          analisis,
		"transaksi_terbaru": recentTx,
		"fee_structure":     feeStructure,
		"meta": gin.H{
			"total_records": len(transactions),
		},
	})
}

// BiayaAksesAnalytics handles GET /api/umkm_insight/biaya_akses_analytics
// Menampilkan info subscription SaaS (READ-ONLY, tidak memproses pembayaran)
func BiayaAksesAnalytics(c *gin.Context) {
	userID := c.Query("user_id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Parameter user_id wajib diisi",
		})
		return
	}

	user, err := services.GetUserProfile(userID)
	if err != nil || user == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "User tidak ditemukan: " + userID,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":   "success",
		"endpoint": "/umkm_insight/biaya_akses_analytics",
		"mode":     "READ-ONLY (Simulasi SaaS)",
		"user_id":  userID,
		"subscription": gin.H{
			"current_status": user.Subscription.Status,
			"biaya":          "Rp10.000/minggu",
			"biaya_numerik":  10000,
			"periode":        "mingguan",
			"aktif_sampai":   user.Subscription.AktifSampai,
			"fitur_premium": []string{
				"Dashboard lengkap dengan semua grafik",
				"Analisis tren penjualan detail",
				"Insight bisnis otomatis",
				"Breakdown fee & pajak",
				"Export laporan (coming soon)",
			},
		},
		"catatan": "Pembayaran diproses melalui SmartBank. UMKM Insight hanya membaca status.",
	})
}
