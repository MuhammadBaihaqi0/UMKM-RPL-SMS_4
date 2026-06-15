import os

from dotenv import load_dotenv

load_dotenv()

from app import create_app


app = create_app()
PORT = int(os.getenv("PORT", "8080"))


if __name__ == "__main__":
    print("")
    print("==============================================")
    print("         UMKM Insight Server v5.0")
    print("         Sistem Analitik + AI Insight + CS")
    print("==============================================")
    print(f"  Backend  : http://localhost:{PORT}")
    print("  Database : MySQL (XAMPP)")
    print("  Mode     : READ-ONLY (transaksi keuangan)")
    print("  Source   : SmartBank (Dummy Data)")
    print("  Lang     : Python + Flask Framework")
    print("  Swagger  : http://localhost:{}/apidocs/".format(PORT))
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
    print("  ---- AI Insight ----")
    print("  GET  /api/insight/benchmark")
    print("  GET  /api/insight/predict")
    print("  GET  /api/insight/health-score")
    print("  GET  /api/insight/kategori")
    print("  GET  /api/insight/profile")
    print("  PUT  /api/insight/profile")
    print("  ---- Customer Service ----")
    print("  POST /api/tickets/")
    print("  GET  /api/tickets/my")
    print("  GET  /api/tickets/all")
    print("  GET  /api/tickets/<id>")
    print("  POST /api/tickets/<id>/reply")
    print("  PUT  /api/tickets/<id>/assign")
    print("  PUT  /api/tickets/<id>/status")
    print("  GET  /api/tickets/notifications/my")
    print("  ---- Admin ----")
    print("  GET  /api/admin/users")
    print("  GET  /api/admin/stats")
    print("==============================================")
    print("")
    app.run(host="0.0.0.0", port=PORT, debug=False)
