use sqlx::{SqlitePool, Row};
use crate::Company;

pub struct CompanyRepository {
    pool: SqlitePool,
}

impl CompanyRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn create_table(&self) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS companies (
                id BLOB PRIMARY KEY,
                name TEXT NOT NULL,
                logo_url TEXT,
                address TEXT NOT NULL,
                phone1 TEXT NOT NULL,
                phone2 TEXT,
                phone3 TEXT,
                ice TEXT,
                capital TEXT,
                tax_pro_number TEXT,
                register_number TEXT,
                rib_number TEXT,
                email TEXT NOT NULL,
                tax_number TEXT NOT NULL,
                currency TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            "#
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn create_company(&self, company: &Company) -> Result<Company, sqlx::Error> {
        self.add_company(
            &company.name,
            &company.logo_url,
            &company.address,
            &company.phone1,
            &company.phone2,
            &company.phone3,
            &company.ice,
            &company.capital,
            &company.tax_pro_number,
            &company.register_number,
            &company.rib_number,
            &company.email,
            &company.tax_number,
            &company.currency,
        ).await
    }

    pub async fn add_company(
        &self,
        name: &str,
        logo_url: &str,
        address: &str,
        phone1: &str,
        phone2: &str,
        phone3: &str,
        ice: &str,
        capital: &Option<String>,
        tax_pro_number: &str,
        register_number: &str,
        rib_number: &str,
        email: &str,
        tax_number: &str,
        currency: &str,
    ) -> Result<Company, sqlx::Error> {
        let id = sqlx::types::Uuid::new_v4();
        let created_at = chrono::Utc::now();

        let row = sqlx::query(
            r#"
            INSERT INTO companies (id, name, logo_url, address, phone1, phone2, phone3, ice, capital, tax_pro_number, register_number, rib_number, email, tax_number, currency, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id, name, logo_url, address, phone1, phone2, phone3, ice, capital, tax_pro_number, register_number, rib_number, email, tax_number, currency, created_at
            "#
        )
        .bind(id)
        .bind(name)
        .bind(logo_url)
        .bind(address)
        .bind(phone1)
        .bind(phone2)
        .bind(phone3)
        .bind(ice)
        .bind(capital)
        .bind(tax_pro_number)
        .bind(register_number)
        .bind(rib_number)
        .bind(email)
        .bind(tax_number)
        .bind(currency)
        .bind(created_at)
        .fetch_one(&self.pool)
        .await?;

        Ok(self.row_to_company(&row))
    }

    pub async fn get_company_by_id(&self, id: sqlx::types::Uuid) -> Result<Option<Company>, sqlx::Error> {
        let row = sqlx::query(
            r#"
            SELECT id, name, logo_url, address, phone1, phone2, phone3, ice, capital, tax_pro_number, register_number, rib_number, email, tax_number, currency, created_at
            FROM companies
            WHERE id = ?
            "#
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|r| self.row_to_company(&r)))
    }

    pub async fn get_all_companies(&self) -> Result<Vec<Company>, sqlx::Error> {
        let rows = sqlx::query(
            r#"
            SELECT id, name, logo_url, address, phone1, phone2, phone3, ice, capital, tax_pro_number, register_number, rib_number, email, tax_number, currency, created_at
            FROM companies
            ORDER BY created_at DESC
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.iter().map(|r| self.row_to_company(r)).collect())
    }

    pub async fn update_company(&self, id: sqlx::types::Uuid, company: &Company) -> Result<Company, sqlx::Error> {
        self.update_company_fields(
            id,
            Some(&company.name),
            Some(&company.logo_url),
            Some(&company.address),
            Some(&company.phone1),
            Some(&company.phone2),
            Some(&company.phone3),
            Some(&company.ice),
            Some(&company.capital),
            Some(&company.tax_pro_number),
            Some(&company.register_number),
            Some(&company.rib_number),
            Some(&company.email),
            Some(&company.tax_number),
            Some(&company.currency),
        ).await
    }

    async fn update_company_fields(
        &self,
        id: sqlx::types::Uuid,
        name: Option<&str>,
        logo_url: Option<&str>,
        address: Option<&str>,
        phone1: Option<&str>,
        phone2: Option<&str>,
        phone3: Option<&str>,
        ice: Option<&str>,
        capital: Option<&Option<String>>,
        tax_pro_number: Option<&str>,
        register_number: Option<&str>,
        rib_number: Option<&str>,
        email: Option<&str>,
        tax_number: Option<&str>,
        currency: Option<&str>,
    ) -> Result<Company, sqlx::Error> {
        let row = sqlx::query(
            r#"
            UPDATE companies
            SET
                name = COALESCE(?, name),
                logo_url = COALESCE(?, logo_url),
                address = COALESCE(?, address),
                phone1 = COALESCE(?, phone1),
                phone2 = COALESCE(?, phone2),
                phone3 = COALESCE(?, phone3),
                ice = COALESCE(?, ice),
                capital = COALESCE(?, capital),
                tax_pro_number = COALESCE(?, tax_pro_number),
                register_number = COALESCE(?, register_number),
                rib_number = COALESCE(?, rib_number),
                email = COALESCE(?, email),
                tax_number = COALESCE(?, tax_number),
                currency = COALESCE(?, currency)
            WHERE id = ?
            RETURNING id, name, logo_url, address, phone1, phone2, phone3, ice, capital, tax_pro_number, register_number, rib_number, email, tax_number, currency, created_at
            "#
        )
        .bind(name)
        .bind(logo_url)
        .bind(address)
        .bind(phone1)
        .bind(phone2)
        .bind(phone3)
        .bind(ice)
        .bind(capital)
        .bind(tax_pro_number)
        .bind(register_number)
        .bind(rib_number)
        .bind(email)
        .bind(tax_number)
        .bind(currency)
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        row.map(|r| self.row_to_company(&r)).ok_or_else(|| sqlx::Error::RowNotFound)
    }

    pub async fn delete_company(&self, id: sqlx::types::Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(
            r#"
            DELETE FROM companies
            WHERE id = ?
            "#
        )
        .bind(id)
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    fn row_to_company(&self, row: &sqlx::sqlite::SqliteRow) -> Company {
        Company {
            id: row.get("id"),
            name: row.get("name"),
            logo_url: row.get("logo_url"),
            address: row.get("address"),
            phone1: row.get("phone1"),
            phone2: row.get("phone2"),
            phone3: row.get("phone3"),
            ice: row.get("ice"),
            capital: row.get("capital"),
            tax_pro_number: row.get("tax_pro_number"),
            register_number: row.get("register_number"),
            rib_number: row.get("rib_number"),
            email: row.get("email"),
            tax_number: row.get("tax_number"),
            currency: row.get("currency"),
            created_at: row.get("created_at"),
        }
    }
}
