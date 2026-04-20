package routes

import (
	"umkm-insight-backend/controllers"

	"github.com/gin-gonic/gin"
)

// SetupRoutes mendaftarkan semua route API
// SEMUA ENDPOINT HANYA GET — READ-ONLY SYSTEM
func SetupRoutes(r *gin.Engine) {
	api := r.Group("/api/umkm_insight")
	{
		// Sesuai mapping Excel Kelompok 6
		api.GET("/ambil_data_transaksi", controllers.AmbilDataTransaksi)
		api.GET("/analisis_penjualan", controllers.AnalisisPenjualan)
		api.GET("/dashboard", controllers.GetDashboard)
		api.GET("/biaya_akses_analytics", controllers.BiayaAksesAnalytics)
		api.GET("/user_profile", controllers.GetUserProfile)
	}
}
