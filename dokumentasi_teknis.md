# Dokumentasi Teknis Aplikasi: UMKM Insight

Dokumen ini menjelaskan tumpukan teknologi (*tech stack*), alur logika aplikasi, serta daftar fitur yang ada di dalam proyek UMKM Insight. Aplikasi ini dibangun sebagai prototipe SaaS (*Software as a Service*) *Read-Only* yang terhubung dengan simulasi sistem perbankan (SmartBank).

---

## 🛠️ 1. Bahasa Pemrograman & Teknologi yang Digunakan

Aplikasi ini menggunakan arsitektur *Client-Server* modern yang memisahkan antara antarmuka pengguna (Frontend) dan logika server (Backend).

### **Frontend (Antarmuka Pengguna)**
*   **Bahasa:** HTML5, CSS3 (Vanilla/Native), dan JavaScript (ES6+).
*   **Framework/Tools:** 
    *   **Vite:** Digunakan sebagai *build tool* dan *local dev server* agar proses *development* sangat cepat. (Bukan menggunakan React/Vue, melainkan murni Vanilla JS).
    *   **Axios:** Library untuk mempermudah pemanggilan API (HTTP Request) ke Backend.
    *   **Chart.js:** Library untuk menggambar grafik visual interaktif (seperti *Bar Chart* dan *Donut Chart*).

### **Backend (Logika Server & API Gateway)**
*   **Bahasa:** Python 3.
*   **Framework:** **Flask** (Micro-framework Python yang ringan dan cepat untuk membuat REST API).
*   **Library Tambahan:**
    *   `flask-cors`: Menangani perizinan *Cross-Origin Resource Sharing* agar Frontend (port 5173) bisa meminta data ke Backend (port 5000).
    *   `mysql-connector-python`: Driver untuk menghubungkan aplikasi Python dengan database MySQL.

### **Database & Infrastruktur**
*   **Database:** **MySQL** (dijalankan secara lokal melalui **XAMPP**).
*   **Penyimpanan Data Transaksi:** Menggunakan **JSON (File-based)** (`dummy_data.json`) untuk mensimulasikan sistem *Read-Only* dari bank eksternal.

---

## 🔄 2. Logika dan Alur Aplikasi (Application Flow)

Aplikasi ini memegang prinsip **"Read-Only Analytics"**, yang berarti aplikasi tidak bisa menambah, mengubah, atau menghapus (No CRUD) data uang/transaksi pengguna. Semua data seolah-olah ditarik dari sistem bank.

### **A. Alur Otentikasi (Login/Register)**
1. Pengguna memasukkan email dan password di halaman login Frontend.
2. Frontend mengirim permintaan POST via Axios ke endpoint `/api/auth/login`.
3. Backend memeriksa tabel `users` di database **MySQL**.
4. Jika cocok, Backend mengirimkan respon berhasil beserta data profil pengguna.
5. Frontend menyimpan status *login* di *Local Storage* dan mengarahkan pengguna ke Dashboard.

### **B. Alur Dashboard & Analisis (Core Logic)**
1. Saat pengguna membuka halaman Dashboard, Frontend memanggil API `/api/umkm_insight/dashboard`.
2. Backend menerima *request* tersebut dan mulai bekerja:
   *   Mengambil data transaksi mentah pengguna dari file `dummy_data.json`.
   *   Mengirim data tersebut ke modul `analysis.py` untuk diolah secara *real-time* (menghitung total, laba, margin, tren bulanan).
   *   Backend mengecek **Paket Langganan** pengguna (Free/Basic/Pro/Enterprise) di database MySQL.
   *   Berdasarkan paket langganan, Backend menjalankan fungsi **Limitasi** (menyembunyikan/menghapus data tertentu jika pengguna masih pakai paket gratis).
3. Backend mengembalikan data JSON yang sudah "matang" dan "disensor" (sesuai paket) ke Frontend.
4. Frontend memproses JSON tersebut dan menggambarnya menjadi teks, angka, serta grafik menggunakan Chart.js.

### **C. Alur Upgrade Paket Langganan**
1. Pengguna masuk ke menu Langganan dan memilih paket (misal: Enterprise).
2. Saat tombol "Pilih Paket" ditekan, Frontend mengirim permintaan ke `/api/smartbank/pay` untuk mensimulasikan pembayaran via bank.
3. Backend memproses pembayaran buatan ini, lalu **meng-update status paket langganan** pengguna di tabel `subscriptions` (MySQL).
4. Frontend me-restart halaman, dan pengguna kini bisa melihat fitur premium (grafik terbuka, tombol export menyala).

---

## 🌟 3. Daftar Fitur Aplikasi

Aplikasi UMKM Insight terbagi ke dalam empat kategori fitur akses berdasarkan model bisnis berlangganan:

### **Fitur Umum (Tersedia untuk Semua Paket)**
*   **Dashboard Ringkasan:** Menampilkan Total Penjualan, Total Transaksi, Rata-rata Penjualan, dan Total Pengeluaran.
*   **Data Read-Only:** Daftar tabel riwayat transaksi (simulasi yang ditarik dari SmartBank).
*   **Upgrade Langganan:** Menu khusus untuk mengubah durasi dan tier paket secara mandiri.

### **Limitasi Fitur Berdasarkan Paket Langganan**
1.  **Paket Free (Gratis):**
    *   Hanya bisa melihat ringkasan kasar.
    *   Nilai Rata-rata Penjualan **terkunci** (diganti ikon gembok).
    *   Tidak bisa memfilter data transaksi (dropdown mati) dan tidak bisa Export CSV.
2.  **Paket Basic:**
    *   Semua fitur Free terbuka.
    *   Menampilkan grafik Perbandingan Bulanan.
    *   Grafik Distribusi Transaksi (Donut Chart) masih **terkunci**.
3.  **Paket Pro:**
    *   Grafik Distribusi Transaksi terbuka.
    *   Tombol filter transaksi penuh dan fitur **Export CSV** terbuka.
    *   Membuka fitur **Pelaporan ke SmartBank** (HANYA AKTIF jika performa penjualan sedang turun. Jika naik, maka akan ditahan oleh sistem).
4.  **Paket Enterprise:**
    *   Semua fitur Pro terbuka.
    *   **Fitur AI Proyeksi Bisnis:** Sebuah modul di halaman Analisis yang bisa memprediksi naik-turunnya performa pendapatan bulan depan berdasarkan pola data transaksi historis.

---
*Dokumen ini dibuat untuk mempermudah presentasi logika pemrograman serta batasan fungsional dari arsitektur backend Python dan frontend JavaScript yang digunakan dalam proyek ini.*
