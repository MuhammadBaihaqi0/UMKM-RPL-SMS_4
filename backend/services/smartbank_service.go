package services

import (
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"umkm-insight-backend/models"
)

var dummyData *models.DummyData

// Init memuat data dummy dari file JSON
func Init() error {
	// Cari path file data
	_, filename, _, _ := runtime.Caller(0)
	dir := filepath.Dir(filename)
	dataPath := filepath.Join(dir, "..", "data", "dummy_data.json")

	file, err := os.ReadFile(dataPath)
	if err != nil {
		return err
	}

	dummyData = &models.DummyData{}
	return json.Unmarshal(file, dummyData)
}

// GetTransactions mengambil data transaksi berdasarkan user_id
// Simulasi GET request ke SmartBank via API Gateway (READ-ONLY)
func GetTransactions(userID string) ([]models.Transaction, error) {
	if dummyData == nil {
		if err := Init(); err != nil {
			return nil, err
		}
	}

	var result []models.Transaction
	for _, t := range dummyData.Transactions {
		if t.UserID == userID {
			result = append(result, t)
		}
	}
	return result, nil
}

// GetUserProfile mengambil profil user dari SmartBank (simulasi)
func GetUserProfile(userID string) (*models.User, error) {
	if dummyData == nil {
		if err := Init(); err != nil {
			return nil, err
		}
	}

	user, exists := dummyData.Users[userID]
	if !exists {
		return nil, nil
	}
	return &user, nil
}

// GetFeeStructure mengambil struktur fee dari ekosistem
func GetFeeStructure() map[string]string {
	if dummyData == nil {
		Init()
	}
	return dummyData.FeeStructure
}
