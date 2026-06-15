from __future__ import annotations

import json

from flask import Blueprint, jsonify, request

from .db import (
    fetch_all,
    fetch_one,
    generate_uuid,
    get_cursor,
    log_activity,
    normalize_value,
    utc_now,
)
from .middleware import require_auth, require_admin_or_operator

ticket_bp = Blueprint("ticket", __name__, url_prefix="/api/tickets")


# =============================================
# User: Membuat tiket baru
# =============================================
@ticket_bp.post("/")
@require_auth
def create_ticket():
    """
    Buat tiket baru (Customer Service).
    ---
    tags: [Customer Service]
    security: [{BearerAuth: []}]
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required: [subject, description]
          properties:
            subject: {type: string}
            description: {type: string}
            kategori: {type: string, enum: [umum, teknis, pembayaran, akun, lainnya]}
            prioritas: {type: string, enum: [rendah, sedang, tinggi]}
    responses:
      201:
        description: Tiket berhasil dibuat
    """
    data = request.get_json() or {}
    subject = (data.get("subject") or "").strip()
    description = (data.get("description") or "").strip()
    kategori = (data.get("kategori") or "umum").strip().lower()
    prioritas = (data.get("prioritas") or "sedang").strip().lower()

    if not subject or not description:
        return jsonify({"status": "error", "message": "Subject dan description wajib diisi"}), 400

    if kategori not in {"umum", "teknis", "pembayaran", "akun", "lainnya"}:
        kategori = "umum"
    if prioritas not in {"rendah", "sedang", "tinggi"}:
        prioritas = "sedang"

    ticket_id = generate_uuid()
    now = utc_now()
    user_id = request.user["id"]

    with get_cursor() as (connection, cursor):
        cursor.execute(
            """
            INSERT INTO tickets (id, user_id, subject, description, kategori, prioritas, status, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (ticket_id, user_id, subject, description, kategori, prioritas, "open", now, now),
        )

        # Create WA simulation notification for operators
        cursor.execute("SELECT id FROM users WHERE role = 'operator'")
        operators = cursor.fetchall()
        for op in operators:
            cursor.execute(
                """
                INSERT INTO notifications (id, user_id, title, message, type, reference_type, reference_id, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    generate_uuid(),
                    op["id"],
                    f"📩 Tiket Baru: {subject}",
                    f"[WhatsApp Simulation] Keluhan baru dari {request.user.get('email', 'user')}. Kategori: {kategori}. Segera ditangani.",
                    "wa_simulation",
                    "ticket",
                    ticket_id,
                    now,
                ),
            )

        log_activity(
            cursor,
            user_id,
            "ticket_created",
            f"Membuat tiket: {subject}",
            {"ticket_id": ticket_id, "kategori": kategori, "prioritas": prioritas},
            now,
        )
        connection.commit()

    return jsonify({
        "status": "success",
        "message": "Tiket berhasil dibuat! Operator kami akan segera merespons.",
        "ticket": {
            "id": ticket_id,
            "subject": subject,
            "status": "open",
            "kategori": kategori,
            "prioritas": prioritas,
        },
    }), 201


# =============================================
# User: Melihat tiket miliknya
# =============================================
@ticket_bp.get("/my")
@require_auth
def my_tickets():
    """
    Lihat semua tiket milik user.
    ---
    tags: [Customer Service]
    security: [{BearerAuth: []}]
    responses:
      200:
        description: Daftar tiket user
    """
    user_id = request.user["id"]
    tickets = fetch_all(
        """
        SELECT t.*, u.nama_umkm AS operator_name
        FROM tickets t
        LEFT JOIN users u ON u.id = t.operator_id
        WHERE t.user_id = %s
        ORDER BY t.created_at DESC
        """,
        (user_id,),
    )
    return jsonify({"status": "success", "data": tickets, "total": len(tickets)})


# =============================================
# Operator: Melihat semua tiket
# =============================================
@ticket_bp.get("/all")
@require_admin_or_operator
def all_tickets():
    """
    Lihat semua tiket (untuk Operator/Admin).
    ---
    tags: [Customer Service]
    security: [{BearerAuth: []}]
    parameters:
      - in: query
        name: status
        type: string
        enum: [open, in_progress, resolved, closed]
    responses:
      200:
        description: Daftar semua tiket
    """
    status_filter = (request.args.get("status") or "").strip().lower()

    query = """
        SELECT t.*, 
               u.nama_umkm AS user_name, u.email AS user_email,
               op.nama_umkm AS operator_name
        FROM tickets t
        JOIN users u ON u.id = t.user_id
        LEFT JOIN users op ON op.id = t.operator_id
    """
    params: list = []
    if status_filter and status_filter in {"open", "in_progress", "resolved", "closed"}:
        query += " WHERE t.status = %s"
        params.append(status_filter)
    query += " ORDER BY t.created_at DESC"

    tickets = fetch_all(query, tuple(params))
    return jsonify({"status": "success", "data": tickets, "total": len(tickets)})


# =============================================
# Operator: Ambil alih tiket
# =============================================
@ticket_bp.put("/<ticket_id>/assign")
@require_admin_or_operator
def assign_ticket(ticket_id):
    """
    Operator mengambil alih tiket.
    ---
    tags: [Customer Service]
    security: [{BearerAuth: []}]
    responses:
      200:
        description: Tiket berhasil diambil alih
    """
    operator_id = request.user["id"]
    now = utc_now()

    with get_cursor() as (connection, cursor):
        cursor.execute("SELECT id, user_id, status FROM tickets WHERE id = %s", (ticket_id,))
        ticket = cursor.fetchone()
        if not ticket:
            return jsonify({"status": "error", "message": "Tiket tidak ditemukan"}), 404

        cursor.execute(
            "UPDATE tickets SET operator_id = %s, status = 'in_progress', updated_at = %s WHERE id = %s",
            (operator_id, now, ticket_id),
        )

        # Notify user via WA simulation
        cursor.execute(
            """
            INSERT INTO notifications (id, user_id, title, message, type, reference_type, reference_id, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                generate_uuid(),
                ticket["user_id"],
                "🔔 Tiket Anda Sedang Ditangani",
                f"[WhatsApp Simulation] Operator kami sedang menangani keluhan Anda. Kami akan segera memberikan solusi.",
                "wa_simulation",
                "ticket",
                ticket_id,
                now,
            ),
        )

        log_activity(cursor, operator_id, "ticket_assigned", f"Mengambil alih tiket {ticket_id}", {"ticket_id": ticket_id}, now)
        connection.commit()

    return jsonify({"status": "success", "message": "Tiket berhasil diambil alih."})


# =============================================
# Operator: Ubah status tiket
# =============================================
@ticket_bp.put("/<ticket_id>/status")
@require_admin_or_operator
def update_ticket_status(ticket_id):
    """
    Ubah status tiket.
    ---
    tags: [Customer Service]
    security: [{BearerAuth: []}]
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required: [status]
          properties:
            status: {type: string, enum: [open, in_progress, resolved, closed]}
    responses:
      200:
        description: Status tiket berhasil diubah
    """
    data = request.get_json() or {}
    new_status = (data.get("status") or "").strip().lower()

    if new_status not in {"open", "in_progress", "resolved", "closed"}:
        return jsonify({"status": "error", "message": "Status tidak valid"}), 400

    now = utc_now()
    with get_cursor() as (connection, cursor):
        cursor.execute("SELECT id, user_id, subject FROM tickets WHERE id = %s", (ticket_id,))
        ticket = cursor.fetchone()
        if not ticket:
            return jsonify({"status": "error", "message": "Tiket tidak ditemukan"}), 404

        cursor.execute(
            "UPDATE tickets SET status = %s, updated_at = %s WHERE id = %s",
            (new_status, now, ticket_id),
        )

        # WA simulation notification to user
        status_labels = {"resolved": "✅ Selesai", "closed": "🔒 Ditutup", "in_progress": "⏳ Sedang Diproses"}
        cursor.execute(
            """
            INSERT INTO notifications (id, user_id, title, message, type, reference_type, reference_id, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                generate_uuid(),
                ticket["user_id"],
                f"📋 Status Tiket: {status_labels.get(new_status, new_status)}",
                f"[WhatsApp Simulation] Status tiket \"{ticket['subject']}\" telah diubah menjadi {new_status}.",
                "wa_simulation",
                "ticket",
                ticket_id,
                now,
            ),
        )

        log_activity(cursor, request.user["id"], "ticket_status_updated", f"Status tiket {ticket_id} → {new_status}", {"ticket_id": ticket_id, "new_status": new_status}, now)
        connection.commit()

    return jsonify({"status": "success", "message": f"Status tiket berhasil diubah menjadi {new_status}."})


# =============================================
# Balasan tiket (User & Operator)
# =============================================
@ticket_bp.post("/<ticket_id>/reply")
@require_auth
def reply_ticket(ticket_id):
    """
    Balas tiket (bisa dari user maupun operator).
    ---
    tags: [Customer Service]
    security: [{BearerAuth: []}]
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required: [message]
          properties:
            message: {type: string}
    responses:
      201:
        description: Balasan berhasil dikirim
    """
    data = request.get_json() or {}
    message = (data.get("message") or "").strip()
    if not message:
        return jsonify({"status": "error", "message": "Pesan tidak boleh kosong"}), 400

    user_id = request.user["id"]
    now = utc_now()

    with get_cursor() as (connection, cursor):
        cursor.execute("SELECT id, user_id, operator_id FROM tickets WHERE id = %s", (ticket_id,))
        ticket = cursor.fetchone()
        if not ticket:
            return jsonify({"status": "error", "message": "Tiket tidak ditemukan"}), 404

        # Verify access: must be ticket owner, operator, or admin
        role = request.user.get("role", "user")
        if role == "user" and ticket["user_id"] != user_id:
            return jsonify({"status": "error", "message": "Akses ditolak"}), 403

        reply_id = generate_uuid()
        cursor.execute(
            """
            INSERT INTO ticket_replies (id, ticket_id, user_id, message, created_at)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (reply_id, ticket_id, user_id, message, now),
        )

        # Notify the other party via WA simulation
        notify_user_id = ticket["user_id"] if role in {"admin", "operator"} else ticket.get("operator_id")
        if notify_user_id:
            sender_label = "Operator" if role in {"admin", "operator"} else "User"
            cursor.execute(
                """
                INSERT INTO notifications (id, user_id, title, message, type, reference_type, reference_id, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    generate_uuid(),
                    notify_user_id,
                    f"💬 Balasan Baru dari {sender_label}",
                    f"[WhatsApp Simulation] {sender_label} membalas tiket Anda: \"{message[:100]}...\"" if len(message) > 100 else f"[WhatsApp Simulation] {sender_label} membalas tiket Anda: \"{message}\"",
                    "wa_simulation",
                    "ticket_reply",
                    ticket_id,
                    now,
                ),
            )

        connection.commit()

    return jsonify({"status": "success", "message": "Balasan berhasil dikirim.", "reply": {"id": reply_id}}), 201


# =============================================
# Detail tiket + semua balasan
# =============================================
@ticket_bp.get("/<ticket_id>")
@require_auth
def ticket_detail(ticket_id):
    """
    Detail tiket beserta semua balasan.
    ---
    tags: [Customer Service]
    security: [{BearerAuth: []}]
    responses:
      200:
        description: Detail tiket
    """
    ticket = fetch_one(
        """
        SELECT t.*, u.nama_umkm AS user_name, u.email AS user_email,
               op.nama_umkm AS operator_name
        FROM tickets t
        JOIN users u ON u.id = t.user_id
        LEFT JOIN users op ON op.id = t.operator_id
        WHERE t.id = %s
        """,
        (ticket_id,),
    )
    if not ticket:
        return jsonify({"status": "error", "message": "Tiket tidak ditemukan"}), 404

    # Access check
    role = request.user.get("role", "user")
    if role == "user" and ticket["user_id"] != request.user["id"]:
        return jsonify({"status": "error", "message": "Akses ditolak"}), 403

    replies = fetch_all(
        """
        SELECT tr.*, u.nama_umkm AS sender_name, u.role AS sender_role
        FROM ticket_replies tr
        JOIN users u ON u.id = tr.user_id
        WHERE tr.ticket_id = %s
        ORDER BY tr.created_at ASC
        """,
        (ticket_id,),
    )

    return jsonify({"status": "success", "ticket": ticket, "replies": replies})


# =============================================
# Notifications
# =============================================
@ticket_bp.get("/notifications/my")
@require_auth
def my_notifications():
    """
    Ambil notifikasi user (termasuk simulasi WhatsApp).
    ---
    tags: [Notifications]
    security: [{BearerAuth: []}]
    responses:
      200:
        description: Daftar notifikasi
    """
    user_id = request.user["id"]
    notifications = fetch_all(
        """
        SELECT * FROM notifications
        WHERE user_id = %s
        ORDER BY created_at DESC
        LIMIT 50
        """,
        (user_id,),
    )
    unread_count = sum(1 for n in notifications if not n.get("is_read"))
    return jsonify({"status": "success", "data": notifications, "unread_count": unread_count})


@ticket_bp.put("/notifications/<notif_id>/read")
@require_auth
def mark_notification_read(notif_id):
    """
    Tandai notifikasi sebagai sudah dibaca.
    ---
    tags: [Notifications]
    security: [{BearerAuth: []}]
    responses:
      200:
        description: Notifikasi ditandai sudah dibaca
    """
    with get_cursor() as (connection, cursor):
        cursor.execute(
            "UPDATE notifications SET is_read = 1 WHERE id = %s AND user_id = %s",
            (notif_id, request.user["id"]),
        )
        connection.commit()
    return jsonify({"status": "success", "message": "Notifikasi ditandai sudah dibaca."})
