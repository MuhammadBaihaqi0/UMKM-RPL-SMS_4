/*
 * ============================================
 *  UMKM Insight - Backend Server (Golang)
 * ============================================
 *
 * Aplikasi analitik READ-ONLY untuk ekosistem UMKM.
 * Semua data berasal dari SmartBank (simulasi dummy data).
 * Tidak ada operasi write (POST/PUT/DELETE) pada data transaksi.
 *
 * Kelompok 6 - Tugas Besar RPL 2
 * Dosen: M. Yusril Helmi Setyawan, S.Kom., M.Kom.
 */

package main

import (
	"fmt"
	"log"
	"umkm-insight-backend/middleware"
	"umkm-insight-backend/routes"
	"umkm-insight-backend/services"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// Inisialisasi data dari SmartBank (dummy)
	if err := services.Init(); err != nil {
		log.Fatal("Gagal memuat data dummy: ", err)
	}

	// Setup Gin
	r := gin.Default()

	// CORS untuk koneksi dari React frontend
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "http://localhost:3000"},
		AllowMethods:     []string{"GET"}, // READ-ONLY: hanya GET
		AllowHeaders:     []string{"Origin", "Content-Type"},
		AllowCredentials: true,
	}))

	// Middleware logging (simulasi API Gateway)
	r.Use(middleware.Logger())

	// API info endpoint
	r.GET("/api", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":      "success",
			"application": "UMKM Insight",
			"version":     "2.0.0",
			"language":    "Golang (Gin Framework)",
			"mode":        "READ-ONLY",
			"endpoints": gin.H{
				"data":         "GET /api/umkm_insight/ambil_data_transaksi?user_id=UMKM001",
				"analisis":     "GET /api/umkm_insight/analisis_penjualan?user_id=UMKM001",
				"dashboard":    "GET /api/umkm_insight/dashboard?user_id=UMKM001",
				"subscription": "GET /api/umkm_insight/biaya_akses_analytics?user_id=UMKM001",
			},
		})
	})

	// Setup routes
	routes.SetupRoutes(r)

	// Start server
	fmt.Println("")
	fmt.Println("╔══════════════════════════════════════════════╗")
	fmt.Println("║         📊 UMKM Insight Server (Go)         ║")
	fmt.Println("║         Sistem Analitik Read-Only            ║")
	fmt.Println("╠══════════════════════════════════════════════╣")
	fmt.Println("║  🌐 Backend : http://localhost:8080          ║")
	fmt.Println("║  🔒 Mode    : READ-ONLY                     ║")
	fmt.Println("║  📦 Source  : SmartBank (Dummy Data)         ║")
	fmt.Println("║  🛠️  Lang   : Golang + Gin Framework         ║")
	fmt.Println("╠══════════════════════════════════════════════╣")
	fmt.Println("║  API Endpoints:                              ║")
	fmt.Println("║  GET /api/umkm_insight/ambil_data_transaksi  ║")
	fmt.Println("║  GET /api/umkm_insight/analisis_penjualan    ║")
	fmt.Println("║  GET /api/umkm_insight/dashboard             ║")
	fmt.Println("║  GET /api/umkm_insight/biaya_akses_analytics ║")
	fmt.Println("╚══════════════════════════════════════════════╝")
	fmt.Println("")

	r.Run(":8080")
}
