from app import create_app


app = create_app()


if __name__ == "__main__":
    print("")
    print("==============================================")
    print("         UMKM Insight Server (Python)")
    print("         Sistem Analitik Read-Only")
    print("==============================================")
    print("  Backend : http://localhost:8080")
    print("  Mode    : READ-ONLY")
    print("  Source  : SmartBank (Dummy Data)")
    print("  Lang    : Python + Flask Framework")
    print("==============================================")
    print("  API Endpoints:")
    print("  GET /api/umkm_insight/ambil_data_transaksi")
    print("  GET /api/umkm_insight/analisis_penjualan")
    print("  GET /api/umkm_insight/dashboard")
    print("  GET /api/umkm_insight/biaya_akses_analytics")
    print("")
    app.run(host="0.0.0.0", port=8080, debug=False)
