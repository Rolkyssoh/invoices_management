use sqlx::{SqlitePool, Row};
use crate::User;
use argon2::{Argon2, PasswordHash, PasswordVerifier};

pub struct UserRepository {
    pool: SqlitePool,
}

impl UserRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn create_table(&self) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS users (
                id BLOB PRIMARY KEY,
                company_id BLOB NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1,
                is_first_login INTEGER NOT NULL DEFAULT false,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            "#
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn create_user(&self, user: &User) -> Result<User, sqlx::Error> {
        self.add_user(
            user.company_id,
            &user.name,
            &user.email,
            &user.password_hash,
            &user.role,
            user.is_active,
            user.is_first_login,
        ).await
    }

    pub async fn add_user(
        &self,
        company_id: sqlx::types::Uuid,
        name: &str,
        email: &str,
        password_hash: &str,
        role: &str,
        is_active: bool,
        is_first_login: bool,
    ) -> Result<User, sqlx::Error> {
        let id = sqlx::types::Uuid::new_v4();
        let created_at = chrono::Utc::now();

        let row = sqlx::query(
            r#"
            INSERT INTO users (id, company_id, name, email, password_hash, role, is_active, is_first_login, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id, company_id, name, email, password_hash, role, is_active, is_first_login, created_at
            "#
        )
        .bind(id)
        .bind(company_id)
        .bind(name)
        .bind(email)
        .bind(password_hash)
        .bind(role)
        .bind(is_active)
        .bind(is_first_login)
        .bind(created_at)
        .fetch_one(&self.pool)
        .await?;

        Ok(self.row_to_user(&row))
    }

    pub async fn get_user_by_id(&self, id: sqlx::types::Uuid) -> Result<Option<User>, sqlx::Error> {
        let row = sqlx::query(
            r#"
            SELECT id, company_id, name, email, password_hash, role, is_active, is_first_login, created_at
            FROM users
            WHERE id = ?
            "#
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|r| self.row_to_user(&r)))
    }

    pub async fn get_user_by_email(&self, email: &str) -> Result<Option<User>, sqlx::Error> {
        let row = sqlx::query(
            r#"
            SELECT id, company_id, name, email, password_hash, role, is_active, is_first_login, created_at
            FROM users
            WHERE email = ?
            "#
        )
        .bind(email)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|r| self.row_to_user(&r)))
    }

    pub fn verify_password(&self, password: &str, password_hash: &str) -> bool {
        let argon2 = Argon2::default();
        let parsed_hash = match PasswordHash::new(password_hash) {
            Ok(hash) => hash,
            Err(_) => return false,
        };
        argon2.verify_password(password.as_bytes(), &parsed_hash).is_ok()
    }

    pub async fn get_all_users(&self) -> Result<Vec<User>, sqlx::Error> {
        let rows = sqlx::query(
            r#"
            SELECT id, company_id, name, email, password_hash, role, is_active, is_first_login, created_at
            FROM users
            ORDER BY created_at DESC
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.iter().map(|r| self.row_to_user(r)).collect())
    }

    pub async fn update_user(&self, id: sqlx::types::Uuid, user: &User) -> Result<User, sqlx::Error> {
        self.update_user_fields(
            id,
            Some(user.company_id),
            Some(&user.name),
            Some(&user.email),
            Some(&user.password_hash),
            Some(&user.role),
            Some(user.is_active),
            Some(user.is_first_login),
        ).await
    }

    async fn update_user_fields(
        &self,
        id: sqlx::types::Uuid,
        company_id: Option<sqlx::types::Uuid>,
        name: Option<&str>,
        email: Option<&str>,
        password_hash: Option<&str>,
        role: Option<&str>,
        is_active: Option<bool>,
        is_first_login: Option<bool>,
    ) -> Result<User, sqlx::Error> {
        let row = sqlx::query(
            r#"
            UPDATE users
            SET
                company_id = COALESCE(?, company_id),
                name = COALESCE(?, name),
                email = COALESCE(?, email),
                password_hash = COALESCE(?, password_hash),
                role = COALESCE(?, role),
                is_active = COALESCE(?, is_active),
                is_first_login = COALESCE(?, is_first_login)
            WHERE id = ?
            RETURNING id, company_id, name, email, password_hash, role, is_active, is_first_login, created_at
            "#
        )
        .bind(company_id)
        .bind(name)
        .bind(email)
        .bind(password_hash)
        .bind(role)
        .bind(is_active)
        .bind(is_first_login)
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        row.map(|r| self.row_to_user(&r)).ok_or_else(|| sqlx::Error::RowNotFound)
    }

    pub async fn delete_user(&self, id: sqlx::types::Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(
            r#"
            DELETE FROM users
            WHERE id = ?
            "#
        )
        .bind(id)
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    fn row_to_user(&self, row: &sqlx::sqlite::SqliteRow) -> User {
        User {
            id: row.get("id"),
            company_id: row.get("company_id"),
            name: row.get("name"),
            email: row.get("email"),
            password_hash: row.get("password_hash"),
            role: row.get("role"),
            is_active: row.get("is_active"),
            is_first_login: row.get("is_first_login"),
            created_at: row.get("created_at"),
        }
    }
}
