package middleware

import (
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
)

// Logger adalah middleware yang mensimulasikan API Gateway logging
// Sesuai aturan Excel: "Validasi & Logging wajib"
func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		// Log request masuk
		fmt.Printf("[%s] [API-GATEWAY] %s %s - %s\n",
			start.Format(time.RFC3339),
			c.Request.Method,
			c.Request.URL.Path,
			c.ClientIP(),
		)

		// Set header simulasi gateway
		c.Header("X-Gateway-Timestamp", start.Format(time.RFC3339))
		c.Header("X-Gateway-Service", "UMKM-Insight")
		c.Header("X-Gateway-Mode", "READ-ONLY")

		c.Next()

		// Log response
		duration := time.Since(start)
		fmt.Printf("[%s] [API-GATEWAY] %s %s - %d - %v\n",
			time.Now().Format(time.RFC3339),
			c.Request.Method,
			c.Request.URL.Path,
			c.Writer.Status(),
			duration,
		)
	}
}
