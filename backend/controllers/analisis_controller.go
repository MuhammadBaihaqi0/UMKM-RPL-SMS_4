package controllers

import (
	"net/http"
	"umkm-insight-backend/services"

	"github.com/gin-gonic/gin"
)

// AnalisisPenjualan handles GET /api/umkm_insight/analisis_penjualan
// Sesuai spesifikasi Excel: mengolah data transaksi (READ-ONLY)
func AnalisisPenjualan(c *gin.Context) {
	userID := c.Query("user_id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Parameter user_id wajib diisi",
			"contoh":  "/api/umkm_insight/analisis_penjualan?user_id=UMKM001",
		})
		return
	}

	transactions, err := services.GetTransactions(userID)
	if err != nil || len(transactions) == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "Tidak ada data untuk user_id: " + userID,
		})
		return
	}

	// Proses analisis (read-only, tidak menyimpan ulang)
	analisis := services.AnalisisLengkap(transactions)

	c.JSON(http.StatusOK, gin.H{
		"status":   "success",
		"endpoint": "/umkm_insight/analisis_penjualan",
		"source":   "SmartBank (via API Gateway)",
		"mode":     "READ-ONLY",
		"user_id":  userID,
		"analisis": analisis,
	})
}
