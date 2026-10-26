use sqlx::sqlite::{SqliteConnectOptions, SqlitePool, SqlitePoolOptions};
use std::str::FromStr;
use crate::{Company, User, Client, Invoice, InvoiceItem, Payment};

pub mod company;
pub mod user;
pub mod client;
pub mod invoice;
pub mod invoice_item;
pub mod payment;


pub use company::CompanyRepository;
pub use user::UserRepository;
pub use client::ClientRepository;
pub use invoice::InvoiceRepository;
pub use invoice_item::InvoiceItemRepository;
pub use payment::PaymentRepository;

pub struct Database {
    pool: SqlitePool,
    company_repo: CompanyRepository,
    user_repo: UserRepository,
    client_repo: ClientRepository,
    invoice_repo: InvoiceRepository,
    invoice_item_repo: InvoiceItemRepository,
    payment_repo: PaymentRepository,
}

impl Database {
    pub async fn new(database_url: &str) -> Result<Self, sqlx::Error> {
        let options = SqliteConnectOptions::from_str(database_url)?
            .create_if_missing(true)
            .foreign_keys(true);
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(options)
            .await?;

        // Initialize repositories
        let company_repo = CompanyRepository::new(pool.clone());
        let user_repo = UserRepository::new(pool.clone());
        let client_repo = ClientRepository::new(pool.clone());
        let invoice_repo = InvoiceRepository::new(pool.clone());
        let invoice_item_repo = InvoiceItemRepository::new(pool.clone());
        let payment_repo = PaymentRepository::new(pool.clone());

        // Create tables (order matters for foreign key constraints)
        company_repo.create_table().await?;
        user_repo.create_table().await?;
        client_repo.create_table().await?;
        invoice_repo.create_table().await?;
        invoice_item_repo.create_table().await?;
        payment_repo.create_table().await?;

        Ok(Self {
            pool,
            company_repo,
            user_repo,
            client_repo,
            invoice_repo,
            invoice_item_repo,
            payment_repo,
        })
    }

    // Company operations
    pub async fn create_company(&self, company: &Company) -> Result<Company, sqlx::Error> {
        self.company_repo.create_company(company).await
    }

    pub async fn get_all_companies(&self) -> Result<Vec<Company>, sqlx::Error> {
        self.company_repo.get_all_companies().await
    }

    pub async fn get_company_by_id(&self, id: sqlx::types::Uuid) -> Result<Option<Company>, sqlx::Error> {
        self.company_repo.get_company_by_id(id).await
    }

    pub async fn update_company(&self, id: sqlx::types::Uuid, company: &Company) -> Result<Company, sqlx::Error> {
        self.company_repo.update_company(id, company).await
    }

    pub async fn delete_company(&self, id: sqlx::types::Uuid) -> Result<bool, sqlx::Error> {
        self.company_repo.delete_company(id).await
    }

    // User operations
    pub async fn create_user(&self, user: &User) -> Result<User, sqlx::Error> {
        self.user_repo.create_user(user).await
    }

    pub async fn get_user_by_id(&self, id: sqlx::types::Uuid) -> Result<Option<User>, sqlx::Error> {
        self.user_repo.get_user_by_id(id).await
    }

    pub async fn get_all_users(&self) -> Result<Vec<User>, sqlx::Error> {
        self.user_repo.get_all_users().await
    }

    pub async fn get_user_by_email(&self, email: &str) -> Result<Option<User>, sqlx::Error> {
        self.user_repo.get_user_by_email(email).await
    }

    pub fn verify_password(&self, password: &str, password_hash: &str) -> bool {
        self.user_repo.verify_password(password, password_hash)
    }

    pub async fn update_user(&self, id: sqlx::types::Uuid, user: &User) -> Result<User, sqlx::Error> {
        self.user_repo.update_user(id, user).await
    }

    pub async fn delete_user(&self, id: sqlx::types::Uuid) -> Result<bool, sqlx::Error> {
        self.user_repo.delete_user(id).await
    }

    // Client operations
    pub async fn create_client(&self, client: &Client) -> Result<Client, sqlx::Error> {
        self.client_repo.create_client(client).await
    }

    pub async fn get_client_by_id(&self, id: sqlx::types::Uuid) -> Result<Option<Client>, sqlx::Error> {
        self.client_repo.get_client_by_id(id).await
    }

    pub async fn get_all_clients(&self) -> Result<Vec<Client>, sqlx::Error> {
        self.client_repo.get_all_clients().await
    }

    pub async fn update_client(&self, id: sqlx::types::Uuid, client: &Client) -> Result<Client, sqlx::Error> {
        self.client_repo.update_client(id, client).await
    }

    pub async fn delete_client(&self, id: sqlx::types::Uuid) -> Result<bool, sqlx::Error> {
        self.client_repo.delete_client(id).await
    }

    // Invoice operations
    pub async fn create_invoice(&self, invoice: &Invoice) -> Result<Invoice, sqlx::Error> {
        self.invoice_repo.create_invoice(invoice).await
    }

    pub async fn get_invoice_by_id(&self, id: sqlx::types::Uuid) -> Result<Option<Invoice>, sqlx::Error> {
        self.invoice_repo.get_invoice_by_id(id).await
    }

    pub async fn get_all_invoices(&self) -> Result<Vec<Invoice>, sqlx::Error> {
        self.invoice_repo.get_all_invoices().await
    }

    pub async fn update_invoice(&self, id: sqlx::types::Uuid, invoice: &Invoice) -> Result<Invoice, sqlx::Error> {
        self.invoice_repo.update_invoice(id, invoice).await
    }

    pub async fn delete_invoice(&self, id: sqlx::types::Uuid) -> Result<bool, sqlx::Error> {
        self.invoice_repo.delete_invoice(id).await
    }

    // Invoice item operations
    pub async fn create_invoice_item(&self, invoice_item: &InvoiceItem) -> Result<InvoiceItem, sqlx::Error> {
        self.invoice_item_repo.create_invoice_item(invoice_item).await
    }

    pub async fn get_invoice_item_by_id(&self, id: sqlx::types::Uuid) -> Result<Option<InvoiceItem>, sqlx::Error> {
        self.invoice_item_repo.get_invoice_item_by_id(id).await
    }

    pub async fn get_all_invoice_items(&self) -> Result<Vec<InvoiceItem>, sqlx::Error> {
        self.invoice_item_repo.get_all_invoice_items().await
    }

    pub async fn update_invoice_item(&self, id: sqlx::types::Uuid, invoice_item: &InvoiceItem) -> Result<InvoiceItem, sqlx::Error> {
        self.invoice_item_repo.update_invoice_item(id, invoice_item).await
    }

    pub async fn delete_invoice_item(&self, id: sqlx::types::Uuid) -> Result<bool, sqlx::Error> {
        self.invoice_item_repo.delete_invoice_item(id).await
    }

    // Payment operations
    pub async fn create_payment(&self, payment: &Payment) -> Result<Payment, sqlx::Error> {
        self.payment_repo.create_payment(payment).await
    }

    pub async fn get_payment_by_id(&self, id: sqlx::types::Uuid) -> Result<Option<Payment>, sqlx::Error> {
        self.payment_repo.get_payment_by_id(id).await
    }

    pub async fn get_all_payments(&self) -> Result<Vec<Payment>, sqlx::Error> {
        self.payment_repo.get_all_payments().await
    }

    pub async fn update_payment(&self, id: sqlx::types::Uuid, payment: &Payment) -> Result<Payment, sqlx::Error> {
        self.payment_repo.update_payment(id, payment).await
    }

    pub async fn delete_payment(&self, id: sqlx::types::Uuid) -> Result<bool, sqlx::Error> {
        self.payment_repo.delete_payment(id).await
    }
}
