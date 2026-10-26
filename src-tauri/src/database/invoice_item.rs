use sqlx::{SqlitePool, Row};
use crate::InvoiceItem;

pub struct InvoiceItemRepository {
    pool: SqlitePool,
}

impl InvoiceItemRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn create_table(&self) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS invoice_items (
                id BLOB PRIMARY KEY,
                invoice_id BLOB NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
                description TEXT NOT NULL,
                quantity REAL NOT NULL,
                unit_price REAL NOT NULL,
                total_price_ht REAL NOT NULL
            )
            "#
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn create_invoice_item(&self, invoice_item: &InvoiceItem) -> Result<InvoiceItem, sqlx::Error> {
        self.add_invoice_item(
            invoice_item.invoice_id,
            &invoice_item.description,
            invoice_item.quantity,
            invoice_item.unit_price,
            invoice_item.total_price_ht,
        ).await
    }

    pub async fn add_invoice_item(
        &self,
        invoice_id: sqlx::types::Uuid,
        description: &str,
        quantity: f64,
        unit_price: f64,
        total_price_ht: f64,
    ) -> Result<InvoiceItem, sqlx::Error> {
        let id = sqlx::types::Uuid::new_v4();

        let row = sqlx::query(
            r#"
            INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, total_price_ht)
            VALUES (?, ?, ?, ?, ?, ?)
            RETURNING id, invoice_id, description, quantity, unit_price, total_price_ht
            "#
        )
        .bind(id)
        .bind(invoice_id)
        .bind(description)
        .bind(quantity)
        .bind(unit_price)
        .bind(total_price_ht)
        .fetch_one(&self.pool)
        .await?;

        Ok(self.row_to_invoice_item(&row))
    }

    pub async fn get_invoice_item_by_id(&self, id: sqlx::types::Uuid) -> Result<Option<InvoiceItem>, sqlx::Error> {
        let row = sqlx::query(
            r#"
            SELECT id, invoice_id, description, quantity, unit_price, total_price_ht
            FROM invoice_items
            WHERE id = ?
            "#
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|r| self.row_to_invoice_item(&r)))
    }

    pub async fn get_invoice_items_by_invoice_id(&self, invoice_id: sqlx::types::Uuid) -> Result<Vec<InvoiceItem>, sqlx::Error> {
        let rows = sqlx::query(
            r#"
            SELECT id, invoice_id, description, quantity, unit_price, total_price_ht
            FROM invoice_items
            WHERE invoice_id = ?
            "#
        )
        .bind(invoice_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.iter().map(|r| self.row_to_invoice_item(r)).collect())
    }

    pub async fn get_all_invoice_items(&self) -> Result<Vec<InvoiceItem>, sqlx::Error> {
        let rows = sqlx::query(
            r#"
            SELECT id, invoice_id, description, quantity, unit_price, total_price_ht
            FROM invoice_items
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.iter().map(|r| self.row_to_invoice_item(r)).collect())
    }

    pub async fn update_invoice_item(&self, id: sqlx::types::Uuid, invoice_item: &InvoiceItem) -> Result<InvoiceItem, sqlx::Error> {
        self.update_invoice_item_fields(
            id,
            Some(invoice_item.invoice_id),
            Some(&invoice_item.description),
            Some(invoice_item.quantity),
            Some(invoice_item.unit_price),
            Some(invoice_item.total_price_ht),
        ).await
    }

    async fn update_invoice_item_fields(
        &self,
        id: sqlx::types::Uuid,
        invoice_id: Option<sqlx::types::Uuid>,
        description: Option<&str>,
        quantity: Option<f64>,
        unit_price: Option<f64>,
        total_price_ht: Option<f64>,
    ) -> Result<InvoiceItem, sqlx::Error> {
        let row = sqlx::query(
            r#"
            UPDATE invoice_items
            SET
                invoice_id = COALESCE(?, invoice_id),
                description = COALESCE(?, description),
                quantity = COALESCE(?, quantity),
                unit_price = COALESCE(?, unit_price),
                total_price_ht = COALESCE(?, total_price_ht)
            WHERE id = ?
            RETURNING id, invoice_id, description, quantity, unit_price, total_price_ht
            "#
        )
        .bind(invoice_id)
        .bind(description)
        .bind(quantity)
        .bind(unit_price)
        .bind(total_price_ht)
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        row.map(|r| self.row_to_invoice_item(&r)).ok_or_else(|| sqlx::Error::RowNotFound)
    }

    pub async fn delete_invoice_item(&self, id: sqlx::types::Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(
            r#"
            DELETE FROM invoice_items
            WHERE id = ?
            "#
        )
        .bind(id)
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    fn row_to_invoice_item(&self, row: &sqlx::sqlite::SqliteRow) -> InvoiceItem {
        InvoiceItem {
            id: row.get("id"),
            invoice_id: row.get("invoice_id"),
            description: row.get("description"),
            quantity: row.get("quantity"),
            unit_price: row.get("unit_price"),
            total_price_ht: row.get("total_price_ht"),
        }
    }
}