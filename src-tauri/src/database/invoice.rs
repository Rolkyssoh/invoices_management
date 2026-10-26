use sqlx::{SqlitePool, Row};
use crate::Invoice;

pub struct InvoiceRepository {
    pool: SqlitePool,
}

impl InvoiceRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn create_table(&self) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS invoices (
                id BLOB PRIMARY KEY,
                company_id BLOB NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                client_id BLOB NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                created_by BLOB NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                invoice_number TEXT NOT NULL UNIQUE,
                status TEXT NOT NULL,
                issue_date DATE NOT NULL,
                due_date DATE NOT NULL,
                subtotal REAL NOT NULL,
                tax_rate REAL NOT NULL,
                tax_amount REAL NOT NULL,
                discount REAL NOT NULL DEFAULT 0.00,
                total REAL NOT NULL,
                notes TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            "#
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn create_invoice(&self, invoice: &Invoice) -> Result<Invoice, sqlx::Error> {
        self.add_invoice(
            invoice.company_id,
            invoice.client_id,
            invoice.created_by,
            &invoice.invoice_number,
            &invoice.status,
            invoice.issue_date,
            invoice.due_date,
            invoice.subtotal,
            invoice.tax_rate,
            invoice.tax_amount,
            invoice.discount,
            invoice.total,
            &invoice.notes,
        ).await
    }

    pub async fn add_invoice(
        &self,
        company_id: sqlx::types::Uuid,
        client_id: sqlx::types::Uuid,
        created_by: sqlx::types::Uuid,
        invoice_number: &str,
        status: &str,
        issue_date: chrono::NaiveDate,
        due_date: chrono::NaiveDate,
        subtotal: f64,
        tax_rate: f64,
        tax_amount: f64,
        discount: f64,
        total: f64,
        notes: &str,
    ) -> Result<Invoice, sqlx::Error> {
        let id = sqlx::types::Uuid::new_v4();
        let created_at = chrono::Utc::now();

        let row = sqlx::query(
            r#"
            INSERT INTO invoices (id, company_id, client_id, created_by, invoice_number, status, issue_date, due_date, subtotal, tax_rate, tax_amount, discount, total, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id, company_id, client_id, created_by, invoice_number, status, issue_date, due_date, subtotal, tax_rate, tax_amount, discount, total, notes, created_at
            "#
        )
        .bind(id)
        .bind(company_id)
        .bind(client_id)
        .bind(created_by)
        .bind(invoice_number)
        .bind(status)
        .bind(issue_date)
        .bind(due_date)
        .bind(subtotal)
        .bind(tax_rate)
        .bind(tax_amount)
        .bind(discount)
        .bind(total)
        .bind(notes)
        .bind(created_at)
        .fetch_one(&self.pool)
        .await?;

        Ok(self.row_to_invoice(&row))
    }

    pub async fn get_invoice_by_id(&self, id: sqlx::types::Uuid) -> Result<Option<Invoice>, sqlx::Error> {
        let row = sqlx::query(
            r#"
            SELECT id, company_id, client_id, created_by, invoice_number, status, issue_date, due_date, subtotal, tax_rate, tax_amount, discount, total, notes, created_at
            FROM invoices
            WHERE id = ?
            "#
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|r| self.row_to_invoice(&r)))
    }

    pub async fn get_all_invoices(&self) -> Result<Vec<Invoice>, sqlx::Error> {
        let rows = sqlx::query(
            r#"
            SELECT id, company_id, client_id, created_by, invoice_number, status, issue_date, due_date, subtotal, tax_rate, tax_amount, discount, total, notes, created_at
            FROM invoices
            ORDER BY created_at DESC
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.iter().map(|r| self.row_to_invoice(r)).collect())
    }

    pub async fn update_invoice(&self, id: sqlx::types::Uuid, invoice: &Invoice) -> Result<Invoice, sqlx::Error> {
        self.update_invoice_fields(
            id,
            Some(invoice.company_id),
            Some(invoice.client_id),
            Some(invoice.created_by),
            Some(&invoice.invoice_number),
            Some(&invoice.status),
            Some(invoice.issue_date),
            Some(invoice.due_date),
            Some(invoice.subtotal),
            Some(invoice.tax_rate),
            Some(invoice.tax_amount),
            Some(invoice.discount),
            Some(invoice.total),
            Some(&invoice.notes),
        ).await
    }

    async fn update_invoice_fields(
        &self,
        id: sqlx::types::Uuid,
        company_id: Option<sqlx::types::Uuid>,
        client_id: Option<sqlx::types::Uuid>,
        created_by: Option<sqlx::types::Uuid>,
        invoice_number: Option<&str>,
        status: Option<&str>,
        issue_date: Option<chrono::NaiveDate>,
        due_date: Option<chrono::NaiveDate>,
        subtotal: Option<f64>,
        tax_rate: Option<f64>,
        tax_amount: Option<f64>,
        discount: Option<f64>,
        total: Option<f64>,
        notes: Option<&str>,
    ) -> Result<Invoice, sqlx::Error> {
        let row = sqlx::query(
            r#"
            UPDATE invoices
            SET
                company_id = COALESCE(?, company_id),
                client_id = COALESCE(?, client_id),
                created_by = COALESCE(?, created_by),
                invoice_number = COALESCE(?, invoice_number),
                status = COALESCE(?, status),
                issue_date = COALESCE(?, issue_date),
                due_date = COALESCE(?, due_date),
                subtotal = COALESCE(?, subtotal),
                tax_rate = COALESCE(?, tax_rate),
                tax_amount = COALESCE(?, tax_amount),
                discount = COALESCE(?, discount),
                total = COALESCE(?, total),
                notes = COALESCE(?, notes)
            WHERE id = ?
            RETURNING id, company_id, client_id, created_by, invoice_number, status, issue_date, due_date, subtotal, tax_rate, tax_amount, discount, total, notes, created_at
            "#
        )
        .bind(company_id)
        .bind(client_id)
        .bind(created_by)
        .bind(invoice_number)
        .bind(status)
        .bind(issue_date)
        .bind(due_date)
        .bind(subtotal)
        .bind(tax_rate)
        .bind(tax_amount)
        .bind(discount)
        .bind(total)
        .bind(notes)
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        row.map(|r| self.row_to_invoice(&r)).ok_or_else(|| sqlx::Error::RowNotFound)
    }

    pub async fn delete_invoice(&self, id: sqlx::types::Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(
            r#"
            DELETE FROM invoices
            WHERE id = ?
            "#
        )
        .bind(id)
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    fn row_to_invoice(&self, row: &sqlx::sqlite::SqliteRow) -> Invoice {
        Invoice {
            id: row.get("id"),
            company_id: row.get("company_id"),
            client_id: row.get("client_id"),
            created_by: row.get("created_by"),
            invoice_number: row.get("invoice_number"),
            status: row.get("status"),
            issue_date: row.get("issue_date"),
            due_date: row.get("due_date"),
            subtotal: row.get("subtotal"),
            tax_rate: row.get("tax_rate"),
            tax_amount: row.get("tax_amount"),
            discount: row.get("discount"),
            total: row.get("total"),
            notes: row.get("notes"),
            created_at: row.get("created_at"),
        }
    }
}