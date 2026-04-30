import os

from dotenv import load_dotenv

load_dotenv()

from app import create_app


app = create_app()
PORT = int(os.getenv("PORT", "8080"))


if __name__ == "__main__":
    print("")
    print("==============================================")
    print("         UMKM Insight Server v4.0")
    print("         Sistem Analitik Read-Only + SaaS")
    print("==============================================")
    print(f"  Backend  : http://localhost:{PORT}")
    print("  Database : MySQL (XAMPP)")
    print("  Mode     : READ-ONLY (transaksi keuangan)")
    print("  Source   : SmartBank (Dummy Data)")
    print("  Lang     : Python + Flask Framework")
    print("==============================================")
    print("  API Endpoints:")
    print("  POST /api/auth/register")
    print("  POST /api/auth/login")
    print("  GET  /api/auth/me")
    print("  GET  /api/umkm_insight/dashboard")
    print("  GET  /api/umkm_insight/ambil_data_transaksi")
    print("  GET  /api/umkm_insight/analisis_penjualan")
    print("  GET  /api/umkm_insight/biaya_akses_analytics")
    print("  GET  /api/subscriptions/packages")
    print("  GET  /api/smartbank/pay")
    print("  POST /api/smartbank/report-decline")
    print("  GET  /api/admin/users")
    print("  GET  /api/admin/stats")
    print("==============================================")
    print("")
    app.run(host="0.0.0.0", port=PORT, debug=False)
