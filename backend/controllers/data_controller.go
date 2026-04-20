package controllers

import (
	"net/http"
	"umkm-insight-backend/services"

	"github.com/gin-gonic/gin"
)

// AmbilDataTransaksi handles GET /api/umkm_insight/ambil_data_transaksi
// Sesuai spesifikasi Excel: mengambil data dari SmartBank (READ-ONLY)
func AmbilDataTransaksi(c *gin.Context) {
	userID := c.Query("user_id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Parameter user_id wajib diisi",
			"contoh":  "/api/umkm_insight/ambil_data_transaksi?user_id=UMKM001",
		})
		return
	}

	transactions, err := services.GetTransactions(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  "error",
			"message": "Gagal mengambil data dari SmartBank",
		})
		return
	}

	if len(transactions) == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  "error",
			"message": "Tidak ada data untuk user_id: " + userID,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":        "success",
		"endpoint":      "/umkm_insight/ambil_data_transaksi",
		"source":        "SmartBank (via API Gateway)",
		"mode":          "READ-ONLY",
		"user_id":       userID,
		"total_records": len(transactions),
		"data":          transactions,
	})
}

// GetUserProfile handles GET /api/umkm_insight/user_profile
func GetUserProfile(c *gin.Context) {
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
		"status": "success",
		"source": "SmartBank (via API Gateway)",
		"mode":   "READ-ONLY",
		"data":   user,
	})
}
