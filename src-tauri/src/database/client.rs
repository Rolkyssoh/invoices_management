use sqlx::{SqlitePool, Row};
use crate::Client;

pub struct ClientRepository {
    pool: SqlitePool,
}

impl ClientRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn create_table(&self) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS clients (
                id BLOB PRIMARY KEY,
                company_id BLOB NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT NOT NULL,
                address TEXT NOT NULL,
                tax_number TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            "#
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn create_client(&self, client: &Client) -> Result<Client, sqlx::Error> {
        self.add_client(
            client.company_id,
            &client.name,
            &client.email,
            &client.phone,
            &client.address,
            &client.tax_number,
        ).await
    }

    pub async fn add_client(
        &self,
        company_id: sqlx::types::Uuid,
        name: &str,
        email: &str,
        phone: &str,
        address: &str,
        tax_number: &str,
    ) -> Result<Client, sqlx::Error> {
        let id = sqlx::types::Uuid::new_v4();
        let created_at = chrono::Utc::now();

        let row = sqlx::query(
            r#"
            INSERT INTO clients (id, company_id, name, email, phone, address, tax_number, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id, company_id, name, email, phone, address, tax_number, created_at
            "#
        )
        .bind(id)
        .bind(company_id)
        .bind(name)
        .bind(email)
        .bind(phone)
        .bind(address)
        .bind(tax_number)
        .bind(created_at)
        .fetch_one(&self.pool)
        .await?;

        Ok(self.row_to_client(&row))
    }

    pub async fn get_client_by_id(&self, id: sqlx::types::Uuid) -> Result<Option<Client>, sqlx::Error> {
        let row = sqlx::query(
            r#"
            SELECT id, company_id, name, email, phone, address, tax_number, created_at
            FROM clients
            WHERE id = ?
            "#
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|r| self.row_to_client(&r)))
    }

    pub async fn get_all_clients(&self) -> Result<Vec<Client>, sqlx::Error> {
        let rows = sqlx::query(
            r#"
            SELECT id, company_id, name, email, phone, address, tax_number, created_at
            FROM clients
            ORDER BY created_at DESC
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.iter().map(|r| self.row_to_client(r)).collect())
    }

    pub async fn update_client(&self, id: sqlx::types::Uuid, client: &Client) -> Result<Client, sqlx::Error> {
        self.update_client_fields(
            id,
            Some(client.company_id),
            Some(&client.name),
            Some(&client.email),
            Some(&client.phone),
            Some(&client.address),
            Some(&client.tax_number),
        ).await
    }

    async fn update_client_fields(
        &self,
        id: sqlx::types::Uuid,
        company_id: Option<sqlx::types::Uuid>,
        name: Option<&str>,
        email: Option<&str>,
        phone: Option<&str>,
        address: Option<&str>,
        tax_number: Option<&str>,
    ) -> Result<Client, sqlx::Error> {
        let row = sqlx::query(
            r#"
            UPDATE clients
            SET
                company_id = COALESCE(?, company_id),
                name = COALESCE(?, name),
                email = COALESCE(?, email),
                phone = COALESCE(?, phone),
                address = COALESCE(?, address),
                tax_number = COALESCE(?, tax_number)
            WHERE id = ?
            RETURNING id, company_id, name, email, phone, address, tax_number, created_at
            "#
        )
        .bind(company_id)
        .bind(name)
        .bind(email)
        .bind(phone)
        .bind(address)
        .bind(tax_number)
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        row.map(|r| self.row_to_client(&r)).ok_or_else(|| sqlx::Error::RowNotFound)
    }

    pub async fn delete_client(&self, id: sqlx::types::Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(
            r#"
            DELETE FROM clients
            WHERE id = ?
            "#
        )
        .bind(id)
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    fn row_to_client(&self, row: &sqlx::sqlite::SqliteRow) -> Client {
        Client {
            id: row.get("id"),
            company_id: row.get("company_id"),
            name: row.get("name"),
            email: row.get("email"),
            phone: row.get("phone"),
            address: row.get("address"),
            tax_number: row.get("tax_number"),
            created_at: row.get("created_at"),
        }
    }
}
