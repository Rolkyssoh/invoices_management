use sqlx::{SqlitePool, Row};
use crate::Payment;

pub struct PaymentRepository {
    pool: SqlitePool,
}

impl PaymentRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn create_table(&self) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS payments (
                id BLOB PRIMARY KEY,
                invoice_id BLOB NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
                recorded_by BLOB NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                amount REAL NOT NULL,
                method TEXT NOT NULL,
                payment_date DATE NOT NULL,
                reference TEXT,
                notes TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            "#
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn create_payment(&self, payment: &Payment) -> Result<Payment, sqlx::Error> {
        self.add_payment(
            payment.invoice_id,
            payment.recorded_by,
            payment.amount,
            &payment.method,
            payment.payment_date,
            &payment.reference,
            &payment.notes,
        ).await
    }

    pub async fn add_payment(
        &self,
        invoice_id: sqlx::types::Uuid,
        recorded_by: sqlx::types::Uuid,
        amount: f64,
        method: &str,
        payment_date: chrono::NaiveDate,
        reference: &str,
        notes: &str,
    ) -> Result<Payment, sqlx::Error> {
        let id = sqlx::types::Uuid::new_v4();
        let created_at = chrono::Utc::now();

        let row = sqlx::query(
            r#"
            INSERT INTO payments (id, invoice_id, recorded_by, amount, method, payment_date, reference, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id, invoice_id, recorded_by, amount, method, payment_date, reference, notes, created_at
            "#
        )
        .bind(id)
        .bind(invoice_id)
        .bind(recorded_by)
        .bind(amount)
        .bind(method)
        .bind(payment_date)
        .bind(reference)
        .bind(notes)
        .bind(created_at)
        .fetch_one(&self.pool)
        .await?;

        Ok(self.row_to_payment(&row))
    }

    pub async fn get_payment_by_id(&self, id: sqlx::types::Uuid) -> Result<Option<Payment>, sqlx::Error> {
        let row = sqlx::query(
            r#"
            SELECT id, invoice_id, recorded_by, amount, method, payment_date, reference, notes, created_at
            FROM payments
            WHERE id = ?
            "#
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|r| self.row_to_payment(&r)))
    }

    pub async fn get_payments_by_invoice_id(&self, invoice_id: sqlx::types::Uuid) -> Result<Vec<Payment>, sqlx::Error> {
        let rows = sqlx::query(
            r#"
            SELECT id, invoice_id, recorded_by, amount, method, payment_date, reference, notes, created_at
            FROM payments
            WHERE invoice_id = ?
            ORDER BY payment_date DESC, created_at DESC
            "#
        )
        .bind(invoice_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.iter().map(|r| self.row_to_payment(r)).collect())
    }

    pub async fn get_all_payments(&self) -> Result<Vec<Payment>, sqlx::Error> {
        let rows = sqlx::query(
            r#"
            SELECT id, invoice_id, recorded_by, amount, method, payment_date, reference, notes, created_at
            FROM payments
            ORDER BY payment_date DESC, created_at DESC
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.iter().map(|r| self.row_to_payment(r)).collect())
    }

    pub async fn update_payment(&self, id: sqlx::types::Uuid, payment: &Payment) -> Result<Payment, sqlx::Error> {
        self.update_payment_fields(
            id,
            Some(payment.invoice_id),
            Some(payment.recorded_by),
            Some(payment.amount),
            Some(&payment.method),
            Some(payment.payment_date),
            Some(&payment.reference),
            Some(&payment.notes),
        ).await
    }

    async fn update_payment_fields(
        &self,
        id: sqlx::types::Uuid,
        invoice_id: Option<sqlx::types::Uuid>,
        recorded_by: Option<sqlx::types::Uuid>,
        amount: Option<f64>,
        method: Option<&str>,
        payment_date: Option<chrono::NaiveDate>,
        reference: Option<&str>,
        notes: Option<&str>,
    ) -> Result<Payment, sqlx::Error> {
        let row = sqlx::query(
            r#"
            UPDATE payments
            SET
                invoice_id = COALESCE(?, invoice_id),
                recorded_by = COALESCE(?, recorded_by),
                amount = COALESCE(?, amount),
                method = COALESCE(?, method),
                payment_date = COALESCE(?, payment_date),
                reference = COALESCE(?, reference),
                notes = COALESCE(?, notes)
            WHERE id = ?
            RETURNING id, invoice_id, recorded_by, amount, method, payment_date, reference, notes, created_at
            "#
        )
        .bind(invoice_id)
        .bind(recorded_by)
        .bind(amount)
        .bind(method)
        .bind(payment_date)
        .bind(reference)
        .bind(notes)
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        row.map(|r| self.row_to_payment(&r)).ok_or_else(|| sqlx::Error::RowNotFound)
    }

    pub async fn delete_payment(&self, id: sqlx::types::Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(
            r#"
            DELETE FROM payments
            WHERE id = ?
            "#
        )
        .bind(id)
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    fn row_to_payment(&self, row: &sqlx::sqlite::SqliteRow) -> Payment {
        Payment {
            id: row.get("id"),
            invoice_id: row.get("invoice_id"),
            recorded_by: row.get("recorded_by"),
            amount: row.get("amount"),
            method: row.get("method"),
            payment_date: row.get("payment_date"),
            reference: row.get("reference"),
            notes: row.get("notes"),
            created_at: row.get("created_at"),
        }
    }
}