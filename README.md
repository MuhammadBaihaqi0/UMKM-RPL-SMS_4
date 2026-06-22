# 📈 UMKM Insight

**UMKM Insight** adalah aplikasi web analitik berbasis kecerdasan buatan (AI) yang dirancang layaknya *Chief Financial Officer* (CFO) digital untuk Usaha Mikro, Kecil, dan Menengah (UMKM) di Indonesia. 

Aplikasi ini tidak sekadar mencatat keuangan, melainkan mengambil data mentah dari bank secara asinkron, menganalisisnya, dan memberikan rekomendasi aksi nyata (AI Insight) guna menunjang keputusan bisnis serta ekspansi UMKM.

---

## ✨ Fitur Utama

1. **Dashboard Finansial Real-Time**
   Visualisasi arus kas (pemasukan & pengeluaran) yang menarik, disajikan dalam bentuk chart interaktif.
2. **Sinkronisasi Bank Otomatis (SmartBank Integration)**
   Mengambil data mutasi rekening UMKM secara instan menggunakan mock-API dari bank (SmartBank).
3. **AI Business Insight & Health Score**
   Menganalisis tren penjualan, mendeteksi kesehatan bisnis (*Health Score*), dan memberikan rekomendasi otomatis apakah UMKM tersebut layak untuk melakukan ekspansi bisnis.
4. **Customer Service Ticketing System**
   Sistem pelaporan masalah/kendala teknis (Tiket Bantuan) yang terintegrasi dengan simulasi notifikasi pesan (layaknya WhatsApp) antara Pengguna dan Operator.
5. **Role-Based Access Control (RBAC)**
   - **Admin:** Memantau statistik global dan manajemen akun.
   - **Operator:** Merespons keluhan dan mengelola tiket CS.
   - **User (UMKM):** Mengelola dasbor bisnisnya sendiri.
6. **Manajemen Berlangganan (Subscription)**
   Pilihan paket langganan (Free, Basic, Pro, Enterprise) yang membuka batas limit sinkronisasi dan fitur AI.

---

## 🛠️ Teknologi yang Digunakan

Aplikasi ini dibangun menggunakan arsitektur *Client-Server* modern (SPA + REST API):

**Frontend (Client):**
- **HTML, CSS, Vanilla JavaScript:** Mengedepankan performa tinggi tanpa framework berat.
- **Vite:** Sebagai *build tool* dan pengembangan server lokal yang sangat cepat.
- **Chart.js / Recharts:** Untuk rendering grafik analitik.

**Backend (Server):**
- **Python 3.10+ & Flask:** Framework ringan untuk membangun REST API yang solid.
- **MySQL (via XAMPP):** Sebagai sistem manajemen basis data relasional.
- **Bcrypt & PyJWT:** Enkripsi *password* dan manajemen sesi otentikasi.

---

## 🚀 Cara Menjalankan Proyek (Setup & Instalasi)

### 1. Persiapan Database
1. Pastikan **XAMPP** sudah terinstal.
2. Buka XAMPP Control Panel, lalu jalankan modul **Apache** dan **MySQL**.
3. *Database* dan tabel biasanya akan terbuat otomatis (melalui sistem DB backend), namun pastikan Anda memiliki kredensial MySQL lokal (biasanya root tanpa *password*).

### 2. Menjalankan Backend (Flask API)
Buka terminal baru, lalu masuk ke folder `backend`:
```bash
cd backend

# 1. (Opsional) Buat virtual environment
python -m venv venv
venv\Scripts\activate   # (Untuk Windows)

# 2. Instal dependensi
pip install -r requirements.txt

# 3. Jalankan Seeder untuk mengisi data awal (Sangat Penting!)
python seed.py

# 4. Jalankan server backend
python main.py
```
> Server backend akan berjalan di `http://127.0.0.1:5000` (atau port 8080 sesuai `.env`).

### 3. Menjalankan Frontend (Vite)
Buka terminal baru, lalu masuk ke folder `frontend`:
```bash
cd frontend

# 1. Instal dependensi Node.js
npm install

# 2. Jalankan server pengembangan Vite
npm run dev
```
> Aplikasi web dapat diakses melalui browser di alamat `http://localhost:5173`.

---

## 👥 Akun Demo (Dihasilkan dari `seed.py`)

Setelah Anda menjalankan perintah `python seed.py`, sistem akan otomatis membuat akun berikut untuk mempermudah pengujian:

| Role | Email | Password | Keterangan |
|---|---|---|---|
| **Admin** | `admin@umkminsight.local` | `admin123` | Akses penuh statistik sistem |
| **Operator** | `operator@umkminsight.local` | `operator123` | CS untuk membalas tiket pengguna |
| **User (UMKM)** | `berkah@umkm.local` | `umkm123` | Akun UMKM Kuliner (Paket Pro) |
| **User (UMKM)** | `elektronik@umkm.local` | `umkm123` | Akun UMKM Elektronik (Paket Basic) |

---

## 📂 Struktur Direktori Utama
```text
UMKM-RPL-SMS_4/
├── backend/                  # REST API Server
│   ├── app/                  # Logika Bisnis & Routes
│   │   ├── auth_routes.py    # Modul Login/Register
│   │   ├── ticket_routes.py  # Modul Customer Service
│   │   ├── insight_routes.py # Modul AI & Prediksi
│   │   └── db.py             # Koneksi Database
│   ├── main.py               # Entry point Flask
│   └── seed.py               # Script pengisi data dummy
│
├── frontend/                 # Client UI
│   ├── src/
│   │   ├── pages/            # View per Halaman (JS/HTML generator)
│   │   ├── main.js           # Sistem Routing & State Global
│   │   └── api.js            # Fungsi pemanggil endpoint Backend
│   └── index.html            # Entry point SPA
│
├── Laporan_Refactoring...md  # Laporan Tugas Kuliah Rekayasa Perangkat Lunak
└── README.md                 # Dokumentasi Aplikasi
```

---
*Dikembangkan untuk Praktikum Rekayasa Perangkat Lunak 2* 
*2026*
