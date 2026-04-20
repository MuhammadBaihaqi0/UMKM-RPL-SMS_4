package models

// Transaction merepresentasikan satu transaksi dari ledger SmartBank
type Transaction struct {
	ID             string  `json:"id"`
	UserID         string  `json:"user_id"`
	Type           string  `json:"type"`
	SourceApp      string  `json:"source_app"`
	Description    string  `json:"description"`
	Amount         float64 `json:"amount"`
	FeeMarketplace float64 `json:"fee_marketplace,omitempty"`
	FeePOS         float64 `json:"fee_pos,omitempty"`
	FeeSupplier    float64 `json:"fee_supplier,omitempty"`
	FeeLogistik    float64 `json:"fee_logistik,omitempty"`
	FeeBank        float64 `json:"fee_bank,omitempty"`
	FeeGateway     float64 `json:"fee_gateway,omitempty"`
	Pajak          float64 `json:"pajak,omitempty"`
	NetAmount      float64 `json:"net_amount"`
	Date           string  `json:"date"`
	Status         string  `json:"status"`
}

// Subscription merepresentasikan status langganan user
type Subscription struct {
	Status      string  `json:"status"`
	Biaya       float64 `json:"biaya"`
	Periode     string  `json:"periode"`
	AktifSampai string  `json:"aktif_sampai"`
}

// User merepresentasikan profil UMKM dari SmartBank
type User struct {
	UserID       string       `json:"user_id"`
	Nama         string       `json:"nama"`
	Pemilik      string       `json:"pemilik"`
	JenisUsaha   string       `json:"jenis_usaha"`
	Saldo        float64      `json:"saldo"`
	SaldoAwal    float64      `json:"saldo_awal"`
	Subscription Subscription `json:"subscription"`
	Bergabung    string       `json:"bergabung"`
}

// DummyData adalah root structure dari file JSON
type DummyData struct {
	Metadata     map[string]interface{} `json:"metadata"`
	Users        map[string]User        `json:"users"`
	Transactions []Transaction          `json:"transactions"`
	FeeStructure map[string]string      `json:"fee_structure"`
}

// Ringkasan berisi ringkasan analisis bisnis
type Ringkasan struct {
	TotalPenjualan   float64 `json:"total_penjualan"`
	TotalPengeluaran float64 `json:"total_pengeluaran"`
	LabaKotor        float64 `json:"laba_kotor"`
	RataRata         float64 `json:"rata_rata_transaksi"`
	JumlahTransaksi  int     `json:"jumlah_transaksi"`
	JumlahPenjualan  int     `json:"jumlah_penjualan"`
}

// TrenBulanan merepresentasikan tren penjualan per bulan
type TrenBulanan struct {
	Key             string  `json:"key"`
	Bulan           string  `json:"bulan"`
	TotalPenjualan  float64 `json:"total_penjualan"`
	JumlahTransaksi int     `json:"jumlah_transaksi"`
	NetAmount       float64 `json:"net_amount"`
}

// PerformaSumber merepresentasikan performa per sumber aplikasi
type PerformaSumber struct {
	SourceApp       string  `json:"source_app"`
	TotalAmount     float64 `json:"total_amount"`
	JumlahTransaksi int     `json:"jumlah_transaksi"`
	TotalPenjualan  float64 `json:"total_penjualan"`
	TotalPengeluaran float64 `json:"total_pengeluaran"`
	RataRata        float64 `json:"rata_rata"`
}

// BreakdownFee berisi detail fee yang dibayarkan
type BreakdownFee struct {
	FeeMarketplace float64 `json:"fee_marketplace"`
	FeePOS         float64 `json:"fee_pos"`
	FeeSupplier    float64 `json:"fee_supplier"`
	FeeLogistik    float64 `json:"fee_logistik"`
	FeeBank        float64 `json:"fee_bank"`
	FeeGateway     float64 `json:"fee_gateway"`
	Pajak          float64 `json:"pajak"`
	Total          float64 `json:"total"`
}

// Insight merepresentasikan satu insight bisnis
type Insight struct {
	Type    string `json:"type"`
	Icon    string `json:"icon"`
	Message string `json:"message"`
}

// AnalisisResult adalah hasil analisis lengkap
type AnalisisResult struct {
	Ringkasan        Ringkasan                `json:"ringkasan"`
	TrenBulanan      []TrenBulanan            `json:"tren_bulanan"`
	PerformaPerSumber []PerformaSumber        `json:"performa_per_sumber"`
	DistribusiTipe   map[string]map[string]interface{} `json:"distribusi_tipe"`
	BreakdownFee     BreakdownFee             `json:"breakdown_fee"`
	Insights         []Insight                `json:"insights"`
}
