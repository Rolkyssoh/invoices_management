// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod database;

use database::Database;
use serde::{Deserialize, Serialize};
use sqlx::types::uuid;
use std::sync::Arc;
use std::io::Write;
use tauri::{Manager, State};
use tokio::sync::Mutex;
use base64::Engine;
use argon2::{Argon2, PasswordHasher};
use argon2::password_hash::{rand_core::OsRng, SaltString};

// App state holding the database connection
pub struct AppState {
    db: Arc<Mutex<Database>>,
}

// Session state for authentication
pub struct SessionState {
    current_user: Mutex<Option<LoggedInUser>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoggedInUser {
    pub id: uuid::Uuid,
    pub company_id: uuid::Uuid,
    pub name: String,
    pub email: String,
    pub role: String,
    pub is_first_login: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginResponse {
    pub success: bool,
    pub user: Option<LoggedInUser>,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthStatus {
    pub is_authenticated: bool,
    pub user: Option<LoggedInUser>,
}

// ============ DATA MODELS ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Company {
    pub id: uuid::Uuid,
    pub name: String,
    pub logo_url: String,
    pub address: String,
    pub phone1: String,
    pub phone2: String,
    pub phone3: String,
    pub ice: String,
    pub capital: Option<String>,
    pub tax_pro_number: String,
    pub register_number: String,
    pub rib_number: String,
    pub email: String,
    pub tax_number: String,
    pub currency: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateCompanyRequest {
    pub name: String,
    pub logo_url: String,
    pub address: String,
    pub phone1: String,
    pub phone2: Option<String>,
    pub phone3: Option<String>,
    pub ice: Option<String>,
    pub capital: Option<String>,
    pub tax_pro_number: Option<String>,
    pub register_number: Option<String>,
    pub rib_number: Option<String>,
    pub email: String,
    pub tax_number: String,
    pub currency: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateCompanyRequest {
    pub name: String,
    pub logo_url: String,
    pub address: String,
    pub phone1: String,
    pub phone2: Option<String>,
    pub phone3: Option<String>,
    pub ice: Option<String>,
    pub capital: Option<String>,
    pub tax_pro_number: Option<String>,
    pub register_number: Option<String>,
    pub rib_number: Option<String>,
    pub email: String,
    pub tax_number: String,
    pub currency: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: uuid::Uuid,
    pub company_id: uuid::Uuid,
    pub name: String,
    pub email: String,
    pub password_hash: String,
    pub role: String,
    pub is_active: bool,
    pub is_first_login: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateUserRequest {
    pub company_id: String,
    pub name: String,
    pub email: String,
    pub password_hash: String,
    pub role: String,
    pub is_active: bool,
    pub is_first_login: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateUserRequest {
    pub company_id: String,
    pub name: String,
    pub email: String,
    pub password: String,
    pub role: String,
    pub is_active: bool,
}

// Helper function to hash passwords
fn hash_password(password: &str) -> Result<String, String> {
    let argon2 = Argon2::default();
    let salt = SaltString::generate(&mut OsRng);
    argon2.hash_password(password.as_bytes(), &salt)
        .map(|hash| hash.to_string())
        .map_err(|e| format!("Failed to hash password: {}", e))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Client {
    pub id: uuid::Uuid,
    pub company_id: uuid::Uuid,
    pub name: String,
    pub email: String,
    pub phone: String,
    pub address: String,
    pub tax_number: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateClientRequest {
    pub company_id: String,
    pub name: String,
    pub email: String,
    pub phone: String,
    pub address: String,
    pub tax_number: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateClientRequest {
    pub company_id: String,
    pub name: String,
    pub email: String,
    pub phone: String,
    pub address: String,
    pub tax_number: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Invoice {
    pub id: uuid::Uuid,
    pub company_id: uuid::Uuid,
    pub client_id: uuid::Uuid,
    pub created_by: uuid::Uuid,
    pub invoice_number: String,
    pub status: String,
    pub issue_date: chrono::NaiveDate,
    pub due_date: chrono::NaiveDate,
    pub subtotal: f64,
    pub tax_rate: f64,
    pub tax_amount: f64,
    pub discount: f64,
    pub total: f64,
    pub notes: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateInvoiceRequest {
    pub company_id: String,
    pub client_id: String,
    pub created_by: String,
    pub invoice_number: String,
    pub status: String,
    pub issue_date: String,
    pub due_date: String,
    pub subtotal: f64,
    pub tax_rate: f64,
    pub tax_amount: f64,
    pub discount: f64,
    pub total: f64,
    pub notes: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateInvoiceRequest {
    pub company_id: String,
    pub client_id: String,
    pub created_by: String,
    pub invoice_number: String,
    pub status: String,
    pub issue_date: String,
    pub due_date: String,
    pub subtotal: f64,
    pub tax_rate: f64,
    pub tax_amount: f64,
    pub discount: f64,
    pub total: f64,
    pub notes: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvoiceItem {
    pub id: uuid::Uuid,
    pub invoice_id: uuid::Uuid,
    pub description: String,
    pub quantity: f64,
    pub unit_price: f64,
    pub total_price_ht: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateInvoiceItemRequest {
    pub invoice_id: String,
    pub description: String,
    pub quantity: f64,
    pub unit_price: f64,
    pub total_price_ht: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateInvoiceItemRequest {
    pub invoice_id: String,
    pub description: String,
    pub quantity: f64,
    pub unit_price: f64,
    pub total_price_ht: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Payment {
    pub id: uuid::Uuid,
    pub invoice_id: uuid::Uuid,
    pub recorded_by: uuid::Uuid,
    pub amount: f64,
    pub method: String,
    pub payment_date: chrono::NaiveDate,
    pub reference: String,
    pub notes: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePaymentRequest {
    pub invoice_id: String,
    pub recorded_by: String,
    pub amount: f64,
    pub method: String,
    pub payment_date: String,
    pub reference: String,
    pub notes: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdatePaymentRequest {
    pub invoice_id: String,
    pub recorded_by: String,
    pub amount: f64,
    pub method: String,
    pub payment_date: String,
    pub reference: String,
    pub notes: String,
}

// ============ TAURI COMMANDS - COMPANIES ============

#[tauri::command]
async fn create_company(
    state: State<'_, AppState>,
    request: CreateCompanyRequest,
) -> Result<Company, String> {
    let company = Company {
        id: uuid::Uuid::new_v4(),
        name: request.name,
        logo_url: request.logo_url,
        address: request.address,
        phone1: request.phone1,
        phone2: request.phone2.unwrap_or_default(),
        phone3: request.phone3.unwrap_or_default(),
        ice: request.ice.unwrap_or_default(),
        capital: request.capital,
        tax_pro_number: request.tax_pro_number.unwrap_or_default(),
        register_number: request.register_number.unwrap_or_default(),
        rib_number: request.rib_number.unwrap_or_default(),
        email: request.email,
        tax_number: request.tax_number,
        currency: request.currency,
        created_at: chrono::Utc::now(),
    };
    
    let db = state.db.lock().await;
    db.create_company(&company)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_all_companies(state: State<'_, AppState>) -> Result<Vec<Company>, String> {
    let db = state.db.lock().await;
    db.get_all_companies()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_company_by_id(
    state: State<'_, AppState>,
    id: String,
) -> Result<Option<Company>, String> {
    let company_id = uuid::Uuid::parse_str(&id).map_err(|e| e.to_string())?;
    let db = state.db.lock().await;
    db.get_company_by_id(company_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_company(
    state: State<'_, AppState>,
    id: String,
    request: UpdateCompanyRequest,
) -> Result<Company, String> {
    let company_id = uuid::Uuid::parse_str(&id).map_err(|e| e.to_string())?;
    let company = Company {
        id: company_id,
        name: request.name,
        logo_url: request.logo_url,
        address: request.address,
        phone1: request.phone1,
        phone2: request.phone2.unwrap_or_default(),
        phone3: request.phone3.unwrap_or_default(),
        ice: request.ice.unwrap_or_default(),
        capital: request.capital,
        tax_pro_number: request.tax_pro_number.unwrap_or_default(),
        register_number: request.register_number.unwrap_or_default(),
        rib_number: request.rib_number.unwrap_or_default(),
        email: request.email,
        tax_number: request.tax_number,
        currency: request.currency,
        created_at: chrono::Utc::now(),
    };
    
    let db = state.db.lock().await;
    db.update_company(company_id, &company)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_company(state: State<'_, AppState>, id: String) -> Result<bool, String> {
    let company_id = uuid::Uuid::parse_str(&id).map_err(|e| e.to_string())?;
    let db = state.db.lock().await;
    db.delete_company(company_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn upload_company_logo(
    app_handle: tauri::AppHandle,
    company_id: String,
    image_base64: String,
) -> Result<String, String> {
    // Decode base64 image
    let image_data = base64::Engine::decode(
        &base64::engine::general_purpose::STANDARD,
        image_base64
    ).map_err(|e| format!("Failed to decode image: {}", e))?;
    
    // Create logos directory in app data
    let app_data_dir = app_handle.path().app_data_dir()
        .map_err(|e| format!("Could not get app data directory: {}", e))?;
    let logos_dir = app_data_dir.join("company_logos");
    std::fs::create_dir_all(&logos_dir)
        .map_err(|e| format!("Failed to create logos directory: {}", e))?;
    
    // Save file with company_id as filename
    let file_path = logos_dir.join(format!("{}.png", company_id));
    std::fs::write(&file_path, image_data)
        .map_err(|e| format!("Failed to save image: {}", e))?;
    
    // Return the file path as URL
    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
async fn get_company_logo_base64(logo_path: String) -> Result<String, String> {
    // Check if it's a URL (http/https)
    if logo_path.starts_with("http://") || logo_path.starts_with("https://") {
        return Ok(logo_path);
    }
    
    // Read local file and convert to base64
    let image_data = std::fs::read(&logo_path)
        .map_err(|e| format!("Failed to read logo file: {}", e))?;
    
    // Encode to base64
    let base64 = base64::engine::general_purpose::STANDARD.encode(&image_data);
    
    // Detect mime type from magic bytes
    let mime_type = if image_data.starts_with(&[0x89, 0x50, 0x4E, 0x47]) {
        // PNG signature: 89 50 4E 47
        "image/png"
    } else if image_data.starts_with(&[0xFF, 0xD8, 0xFF]) {
        // JPEG signature: FF D8 FF
        "image/jpeg"
    } else if image_data.starts_with(b"RIFF") && image_data.len() > 8 && &image_data[8..12] == b"WEBP" {
        // WebP signature
        "image/webp"
    } else {
        // Default to jpeg if unknown
        "image/jpeg"
    };
    
    // Return as data URI
    Ok(format!("data:{};base64,{}", mime_type, base64))
}

// ============ TAURI COMMANDS - USERS ============

#[tauri::command]
async fn create_user(
    state: State<'_, AppState>,
    request: CreateUserRequest,
) -> Result<User, String> {
    let password_hash = hash_password(&request.password_hash)?;
    
    let user = User {
        id: uuid::Uuid::new_v4(),
        company_id: uuid::Uuid::parse_str(&request.company_id).map_err(|e| e.to_string())?,
        name: request.name,
        email: request.email,
        password_hash,
        role: request.role,
        is_active: request.is_active,
        is_first_login: request.is_first_login.unwrap_or(false),
        created_at: chrono::Utc::now(),
    };
    
    let db = state.db.lock().await;
    db.create_user(&user)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_all_users(state: State<'_, AppState>) -> Result<Vec<User>, String> {
    let db = state.db.lock().await;
    db.get_all_users()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_user_by_id(
    state: State<'_, AppState>,
    id: String,
) -> Result<Option<User>, String> {
    let user_id = uuid::Uuid::parse_str(&id).map_err(|e| e.to_string())?;
    let db = state.db.lock().await;
    db.get_user_by_id(user_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_user(
    state: State<'_, AppState>,
    id: String,
    request: UpdateUserRequest,
) -> Result<User, String> {
    let user_id = uuid::Uuid::parse_str(&id).map_err(|e| e.to_string())?;
    
    // Get existing user to preserve password if not changed
    let db = state.db.lock().await;
    let existing_user = db.get_user_by_id(user_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or("User not found")?;
    
    // Hash new password if provided, otherwise use existing
    let password_hash = if request.password.is_empty() {
        existing_user.password_hash
    } else {
        hash_password(&request.password)?
    };
    
    let user = User {
        id: user_id,
        company_id: uuid::Uuid::parse_str(&request.company_id).map_err(|e| e.to_string())?,
        name: request.name,
        email: request.email,
        password_hash,
        role: request.role,
        is_active: request.is_active,
        is_first_login: existing_user.is_first_login,
        created_at: existing_user.created_at,
    };
    
    db.update_user(user_id, &user)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_user(state: State<'_, AppState>, id: String) -> Result<bool, String> {
    let user_id = uuid::Uuid::parse_str(&id).map_err(|e| e.to_string())?;
    let db = state.db.lock().await;
    db.delete_user(user_id)
        .await
        .map_err(|e| e.to_string())
}

// ============ TAURI COMMANDS - CLIENTS ============

#[tauri::command]
async fn create_client(
    state: State<'_, AppState>,
    request: CreateClientRequest,
) -> Result<Client, String> {
    let client = Client {
        id: uuid::Uuid::new_v4(),
        company_id: uuid::Uuid::parse_str(&request.company_id).map_err(|e| e.to_string())?,
        name: request.name,
        email: request.email,
        phone: request.phone,
        address: request.address,
        tax_number: request.tax_number,
        created_at: chrono::Utc::now(),
    };
    
    let db = state.db.lock().await;
    db.create_client(&client)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_all_clients(state: State<'_, AppState>) -> Result<Vec<Client>, String> {
    let db = state.db.lock().await;
    db.get_all_clients()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_client_by_id(
    state: State<'_, AppState>,
    id: String,
) -> Result<Option<Client>, String> {
    let client_id = uuid::Uuid::parse_str(&id).map_err(|e| e.to_string())?;
    let db = state.db.lock().await;
    db.get_client_by_id(client_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_client(
    state: State<'_, AppState>,
    id: String,
    request: UpdateClientRequest,
) -> Result<Client, String> {
    let client_id = uuid::Uuid::parse_str(&id).map_err(|e| e.to_string())?;
    let client = Client {
        id: client_id,
        company_id: uuid::Uuid::parse_str(&request.company_id).map_err(|e| e.to_string())?,
        name: request.name,
        email: request.email,
        phone: request.phone,
        address: request.address,
        tax_number: request.tax_number,
        created_at: chrono::Utc::now(),
    };
    
    let db = state.db.lock().await;
    db.update_client(client_id, &client)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_client(state: State<'_, AppState>, id: String) -> Result<bool, String> {
    let client_id = uuid::Uuid::parse_str(&id).map_err(|e| e.to_string())?;
    let db = state.db.lock().await;
    db.delete_client(client_id)
        .await
        .map_err(|e| e.to_string())
}

// ============ TAURI COMMANDS - INVOICES ============

fn parse_date(date_str: &str) -> Result<chrono::NaiveDate, String> {
    chrono::NaiveDate::parse_from_str(date_str, "%Y-%m-%d")
        .map_err(|e| format!("Invalid date format (YYYY-MM-DD): {}", e))
}

#[tauri::command]
async fn create_invoice(
    state: State<'_, AppState>,
    request: CreateInvoiceRequest,
) -> Result<Invoice, String> {
    let invoice = Invoice {
        id: uuid::Uuid::new_v4(),
        company_id: uuid::Uuid::parse_str(&request.company_id).map_err(|e| e.to_string())?,
        client_id: uuid::Uuid::parse_str(&request.client_id).map_err(|e| e.to_string())?,
        created_by: uuid::Uuid::parse_str(&request.created_by).map_err(|e| e.to_string())?,
        invoice_number: request.invoice_number,
        status: request.status,
        issue_date: parse_date(&request.issue_date)?,
        due_date: parse_date(&request.due_date)?,
        subtotal: request.subtotal,
        tax_rate: request.tax_rate,
        tax_amount: request.tax_amount,
        discount: request.discount,
        total: request.total,
        notes: request.notes,
        created_at: chrono::Utc::now(),
    };
    
    let db = state.db.lock().await;
    db.create_invoice(&invoice)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_all_invoices(state: State<'_, AppState>) -> Result<Vec<Invoice>, String> {
    let db = state.db.lock().await;
    db.get_all_invoices()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_invoice_by_id(
    state: State<'_, AppState>,
    id: String,
) -> Result<Option<Invoice>, String> {
    let invoice_id = uuid::Uuid::parse_str(&id).map_err(|e| e.to_string())?;
    let db = state.db.lock().await;
    db.get_invoice_by_id(invoice_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_invoice(
    state: State<'_, AppState>,
    id: String,
    request: UpdateInvoiceRequest,
) -> Result<Invoice, String> {
    let invoice_id = uuid::Uuid::parse_str(&id).map_err(|e| e.to_string())?;
    let invoice = Invoice {
        id: invoice_id,
        company_id: uuid::Uuid::parse_str(&request.company_id).map_err(|e| e.to_string())?,
        client_id: uuid::Uuid::parse_str(&request.client_id).map_err(|e| e.to_string())?,
        created_by: uuid::Uuid::parse_str(&request.created_by).map_err(|e| e.to_string())?,
        invoice_number: request.invoice_number,
        status: request.status,
        issue_date: parse_date(&request.issue_date)?,
        due_date: parse_date(&request.due_date)?,
        subtotal: request.subtotal,
        tax_rate: request.tax_rate,
        tax_amount: request.tax_amount,
        discount: request.discount,
        total: request.total,
        notes: request.notes,
        created_at: chrono::Utc::now(),
    };
    
    let db = state.db.lock().await;
    db.update_invoice(invoice_id, &invoice)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_invoice(state: State<'_, AppState>, id: String) -> Result<bool, String> {
    let invoice_id = uuid::Uuid::parse_str(&id).map_err(|e| e.to_string())?;
    let db = state.db.lock().await;
    db.delete_invoice(invoice_id)
        .await
        .map_err(|e| e.to_string())
}

// ============ TAURI COMMANDS - INVOICE ITEMS ============

#[tauri::command]
async fn create_invoice_item(
    state: State<'_, AppState>,
    request: CreateInvoiceItemRequest,
) -> Result<InvoiceItem, String> {
    let invoice_item = InvoiceItem {
        id: uuid::Uuid::new_v4(),
        invoice_id: uuid::Uuid::parse_str(&request.invoice_id).map_err(|e| e.to_string())?,
        description: request.description,
        quantity: request.quantity,
        unit_price: request.unit_price,
        total_price_ht: request.total_price_ht,
    };
    
    let db = state.db.lock().await;
    db.create_invoice_item(&invoice_item)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_all_invoice_items(state: State<'_, AppState>) -> Result<Vec<InvoiceItem>, String> {
    let db = state.db.lock().await;
    db.get_all_invoice_items()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_invoice_item_by_id(
    state: State<'_, AppState>,
    id: String,
) -> Result<Option<InvoiceItem>, String> {
    let item_id = uuid::Uuid::parse_str(&id).map_err(|e| e.to_string())?;
    let db = state.db.lock().await;
    db.get_invoice_item_by_id(item_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_invoice_item(
    state: State<'_, AppState>,
    id: String,
    request: UpdateInvoiceItemRequest,
) -> Result<InvoiceItem, String> {
    let item_id = uuid::Uuid::parse_str(&id).map_err(|e| e.to_string())?;
    let invoice_item = InvoiceItem {
        id: item_id,
        invoice_id: uuid::Uuid::parse_str(&request.invoice_id).map_err(|e| e.to_string())?,
        description: request.description,
        quantity: request.quantity,
        unit_price: request.unit_price,
        total_price_ht: request.total_price_ht,
    };
    
    let db = state.db.lock().await;
    db.update_invoice_item(item_id, &invoice_item)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_invoice_item(state: State<'_, AppState>, id: String) -> Result<bool, String> {
    let item_id = uuid::Uuid::parse_str(&id).map_err(|e| e.to_string())?;
    let db = state.db.lock().await;
    db.delete_invoice_item(item_id)
        .await
        .map_err(|e| e.to_string())
}

// ============ TAURI COMMANDS - PAYMENTS ============

#[tauri::command]
async fn create_payment(
    state: State<'_, AppState>,
    request: CreatePaymentRequest,
) -> Result<Payment, String> {
    let payment = Payment {
        id: uuid::Uuid::new_v4(),
        invoice_id: uuid::Uuid::parse_str(&request.invoice_id).map_err(|e| e.to_string())?,
        recorded_by: uuid::Uuid::parse_str(&request.recorded_by).map_err(|e| e.to_string())?,
        amount: request.amount,
        method: request.method,
        payment_date: parse_date(&request.payment_date)?,
        reference: request.reference,
        notes: request.notes,
        created_at: chrono::Utc::now(),
    };
    
    let db = state.db.lock().await;
    db.create_payment(&payment)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_all_payments(state: State<'_, AppState>) -> Result<Vec<Payment>, String> {
    let db = state.db.lock().await;
    db.get_all_payments()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_payment_by_id(
    state: State<'_, AppState>,
    id: String,
) -> Result<Option<Payment>, String> {
    let payment_id = uuid::Uuid::parse_str(&id).map_err(|e| e.to_string())?;
    let db = state.db.lock().await;
    db.get_payment_by_id(payment_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_payment(
    state: State<'_, AppState>,
    id: String,
    request: UpdatePaymentRequest,
) -> Result<Payment, String> {
    let payment_id = uuid::Uuid::parse_str(&id).map_err(|e| e.to_string())?;
    let payment = Payment {
        id: payment_id,
        invoice_id: uuid::Uuid::parse_str(&request.invoice_id).map_err(|e| e.to_string())?,
        recorded_by: uuid::Uuid::parse_str(&request.recorded_by).map_err(|e| e.to_string())?,
        amount: request.amount,
        method: request.method,
        payment_date: parse_date(&request.payment_date)?,
        reference: request.reference,
        notes: request.notes,
        created_at: chrono::Utc::now(),
    };
    
    let db = state.db.lock().await;
    db.update_payment(payment_id, &payment)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_payment(state: State<'_, AppState>, id: String) -> Result<bool, String> {
    let payment_id = uuid::Uuid::parse_str(&id).map_err(|e| e.to_string())?;
    let db = state.db.lock().await;
    db.delete_payment(payment_id)
        .await
        .map_err(|e| e.to_string())
}

// ============ AUTHENTICATION COMMANDS ============

#[tauri::command]
async fn login(
    state: State<'_, AppState>,
    session: State<'_, SessionState>,
    request: LoginRequest,
) -> Result<LoginResponse, String> {
    let db = state.db.lock().await;
    
    // Find user by email
    let user = match db.get_user_by_email(&request.email).await {
        Ok(Some(user)) => user,
        Ok(None) => {
            return Ok(LoginResponse {
                success: false,
                user: None,
                message: "Email ou mot de passe incorrect".to_string(),
            });
        }
        Err(e) => return Err(e.to_string()),
    };
    
    // Check if user is active
    if !user.is_active {
        return Ok(LoginResponse {
            success: false,
            user: None,
            message: "Compte désactivé".to_string(),
        });
    }
    
    // Verify password
    if !db.verify_password(&request.password, &user.password_hash) {
        return Ok(LoginResponse {
            success: false,
            user: None,
            message: "Email ou mot de passe incorrect".to_string(),
        });
    }
    
    // Create logged in user (without password_hash)
    let logged_in_user = LoggedInUser {
        id: user.id,
        company_id: user.company_id,
        name: user.name,
        email: user.email,
        role: user.role,
        is_first_login: user.is_first_login,
    };
    
    // Store in session
    let mut session_user = session.current_user.lock().await;
    *session_user = Some(logged_in_user.clone());
    
    Ok(LoginResponse {
        success: true,
        user: Some(logged_in_user),
        message: "Connexion réussie".to_string(),
    })
}

#[tauri::command]
async fn logout(session: State<'_, SessionState>) -> Result<bool, String> {
    let mut current_user = session.current_user.lock().await;
    *current_user = None;
    Ok(true)
}

#[tauri::command]
async fn check_auth(session: State<'_, SessionState>) -> Result<AuthStatus, String> {
    let current_user = session.current_user.lock().await;
    Ok(AuthStatus {
        is_authenticated: current_user.is_some(),
        user: current_user.clone(),
    })
}

#[tauri::command]
async fn get_current_user_company_id(session: State<'_, SessionState>) -> Result<Option<String>, String> {
    let current_user = session.current_user.lock().await;
    Ok(current_user.as_ref().map(|u| u.company_id.to_string()))
}

// ============ FIRST TIME SETUP COMMANDS ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InitialSetupResponse {
    pub needs_setup: bool,
    pub default_email: Option<String>,
    pub default_password: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateDefaultUserRequest {
    pub user_name: String,
    pub user_email: String,
    pub user_password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateDefaultCompanyRequest {
    pub company_name: String,
    pub company_address: String,
    pub company_phone1: String,
    pub company_ice: Option<String>,
    pub company_email: String,
    pub company_tax_number: String,
    pub company_currency: String,
}

// Check if initial setup is needed (check if default admin user still has default credentials)
#[tauri::command]
async fn check_initial_setup(state: State<'_, AppState>) -> Result<InitialSetupResponse, String> {
    let db = state.db.lock().await;
    
    let companies = db.get_all_companies().await.map_err(|e| e.to_string())?;
    let users = db.get_all_users().await.map_err(|e| e.to_string())?;
    
    // If no users/companies exist, initialize them first
    if companies.is_empty() && users.is_empty() {
        drop(db);
        let _ = initialize_first_setup(&state).await;
        let db = state.db.lock().await;
        let users = db.get_all_users().await.map_err(|e| e.to_string())?;
        
        if let Some(default_user) = users.first() {
            Ok(InitialSetupResponse {
                needs_setup: true,
                default_email: Some(default_user.email.clone()),
                default_password: Some("admin123".to_string()),
            })
        } else {
            Ok(InitialSetupResponse {
                needs_setup: false,
                default_email: None,
                default_password: None,
            })
        }
    } else {
        // Check if a user with default email still exists
        let has_default_user = users.iter().any(|u| u.email == "admin@default.com");
        
        if has_default_user {
            Ok(InitialSetupResponse {
                needs_setup: true,
                default_email: Some("admin@default.com".to_string()),
                default_password: Some("admin123".to_string()),
            })
        } else {
            Ok(InitialSetupResponse {
                needs_setup: false,
                default_email: None,
                default_password: None,
            })
        }
    }
}

// Initialize default company and admin user on first run
async fn initialize_first_setup(state: &AppState) -> Result<(Company, User), String> {
    let db = state.db.lock().await;
    
    // Check if setup is already done
    let companies = db.get_all_companies().await.map_err(|e| e.to_string())?;
    let users = db.get_all_users().await.map_err(|e| e.to_string())?;
    
    if !companies.is_empty() || !users.is_empty() {
        return Err("Initial setup already completed".to_string());
    }
    
    // Create default company
    let company = Company {
        id: uuid::Uuid::new_v4(),
        name: "Votre Entreprise".to_string(),
        logo_url: "".to_string(),
        address: "Adresse à définir".to_string(),
        phone1: "0000000000".to_string(),
        phone2: "".to_string(),
        phone3: "".to_string(),
        ice: "".to_string(),
        capital: None,
        tax_pro_number: "".to_string(),
        register_number: "".to_string(),
        rib_number: "".to_string(),
        email: "contact@entreprise.com".to_string(),
        tax_number: "IF000000".to_string(),
        currency: "EUR".to_string(),
        created_at: chrono::Utc::now(),
    };
    
    let created_company = db.create_company(&company).await.map_err(|e| e.to_string())?;
    
    // Create default admin user
    let password_hash = hash_password("admin123")?;
    let admin_user = User {
        id: uuid::Uuid::new_v4(),
        company_id: created_company.id,
        name: "Administrateur".to_string(),
        email: "admin@default.com".to_string(),
        password_hash,
        role: "admin".to_string(),
        is_active: true,
        is_first_login: true,
        created_at: chrono::Utc::now(),
    };
    
    let created_user = db.create_user(&admin_user).await.map_err(|e| e.to_string())?;
    
    Ok((created_company, created_user))
}

// Update only the default user (step 1: before login)
#[tauri::command]
async fn update_default_user(
    state: State<'_, AppState>,
    request: UpdateDefaultUserRequest,
) -> Result<bool, String> {
    let db = state.db.lock().await;
    
    // Get the first user (the default admin)
    let users = db.get_all_users().await.map_err(|e| e.to_string())?;
    
    if users.is_empty() {
        return Err("No default user found".to_string());
    }
    
    let default_user = &users[0];
    let user_id = default_user.id;
    let company_id = default_user.company_id;
    
    // Update user info
    let password_hash = hash_password(&request.user_password)?;
    let updated_user = User {
        id: user_id,
        company_id,
        name: request.user_name,
        email: request.user_email,
        password_hash,
        role: "admin".to_string(),
        is_active: true,
        is_first_login: true, // Still true, user needs to login first
        created_at: default_user.created_at,
    };
    
    db.update_user(user_id, &updated_user).await.map_err(|e| e.to_string())?;
    
    Ok(true)
}

// Update the default company (step 2: after login)
#[tauri::command]
async fn update_default_company(
    state: State<'_, AppState>,
    session: State<'_, SessionState>,
    request: UpdateDefaultCompanyRequest,
) -> Result<bool, String> {
    let db = state.db.lock().await;
    
    // Get current user
    let current_user = session.current_user.lock().await;
    let user_id = current_user.as_ref().ok_or("Not authenticated".to_string())?.id;
    let user_company_id = current_user.as_ref().ok_or("Not authenticated".to_string())?.company_id;
    drop(current_user); // Release lock before further operations
    
    // Get the company of the current user
    let company = db.get_company_by_id(user_company_id).await.map_err(|e| e.to_string())?;
    let company = company.ok_or("Company not found".to_string())?;
    
    // Update company info
    let updated_company = Company {
        id: company.id,
        name: request.company_name,
        logo_url: company.logo_url.clone(),
        address: request.company_address,
        phone1: request.company_phone1,
        phone2: company.phone2.clone(),
        phone3: company.phone3.clone(),
        ice: request.company_ice.unwrap_or_else(|| company.ice.clone()),
        capital: company.capital.clone(),
        tax_pro_number: company.tax_pro_number.clone(),
        register_number: company.register_number.clone(),
        rib_number: company.rib_number.clone(),
        email: request.company_email,
        tax_number: request.company_tax_number,
        currency: request.company_currency,
        created_at: company.created_at,
    };
    
    db.update_company(company.id, &updated_company).await.map_err(|e| e.to_string())?;
    
    // Update user to mark first login as completed
    let users = db.get_all_users().await.map_err(|e| e.to_string())?;
    let user_to_update = users.iter().find(|u| u.id == user_id).ok_or("User not found".to_string())?;
    let updated_user = User {
        id: user_to_update.id,
        company_id: user_to_update.company_id,
        name: user_to_update.name.clone(),
        email: user_to_update.email.clone(),
        password_hash: user_to_update.password_hash.clone(),
        role: user_to_update.role.clone(),
        is_active: user_to_update.is_active,
        is_first_login: false, // Mark first login as completed
        created_at: user_to_update.created_at,
    };
    
    db.update_user(user_id, &updated_user).await.map_err(|e| e.to_string())?;
    
    // Update session
    let logged_in_user = LoggedInUser {
        id: updated_user.id,
        company_id: updated_user.company_id,
        name: updated_user.name.clone(),
        email: updated_user.email.clone(),
        role: updated_user.role.clone(),
        is_first_login: updated_user.is_first_login,
    };
    
    let mut session_user = session.current_user.lock().await;
    *session_user = Some(logged_in_user);
    
    Ok(true)
}

// ============ PDF GENERATION COMMAND ============

#[tauri::command]
async fn save_and_open_pdf(filename: String, pdf_base64: String) -> Result<String, String> {
    // Decode base64 PDF data
    let pdf_bytes = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, &pdf_base64)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;
    
    // Create temp directory
    let temp_dir = std::env::temp_dir();
    let pdf_path = temp_dir.join(&filename);
    
    // Ensure parent directory exists
    if let Some(parent) = pdf_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    
    // Write PDF to file
    let mut file = std::fs::File::create(&pdf_path).map_err(|e| format!("Failed to create file: {}", e))?;
    file.write_all(&pdf_bytes).map_err(|e| format!("Failed to write PDF: {}", e))?;
    
    // Open the PDF with default application
    tauri_plugin_opener::open_path(&pdf_path, None::<&str>)
        .map_err(|e| format!("Failed to open PDF: {}", e))?;
    
    Ok(pdf_path.to_string_lossy().to_string())
}


// ============ MAIN ENTRY POINT ============

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub async fn run() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize the SQLite database inside the app data directory.
    let context = tauri::generate_context!();
    let identifier = context.config().identifier.clone();
    let app_data_dir = dirs::data_dir()
        .ok_or("Could not determine the application data directory")?
        .join(&identifier);
    std::fs::create_dir_all(&app_data_dir)?;
    let database_url = format!("sqlite://{}", app_data_dir.join("erp_invoices.db").to_string_lossy());

    let db = match Database::new(&database_url).await {
        Ok(db) => db,
        Err(e) => {
            eprintln!("Failed to connect to database: {}", e);
            return Err(e.into());
        }
    };
    
    let state = AppState {
        db: Arc::new(Mutex::new(db)),
    };
    
    let session_state = SessionState {
        current_user: Mutex::new(None),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(state)
        .manage(session_state)
        .invoke_handler(tauri::generate_handler![
            // Companies
            create_company,
            get_all_companies,
            get_company_by_id,
            update_company,
            delete_company,
            upload_company_logo,
            get_company_logo_base64,
            // Users
            create_user,
            get_all_users,
            get_user_by_id,
            update_user,
            delete_user,
            // Clients
            create_client,
            get_all_clients,
            get_client_by_id,
            update_client,
            delete_client,
            // Invoices
            create_invoice,
            get_all_invoices,
            get_invoice_by_id,
            update_invoice,
            delete_invoice,
            // Invoice Items
            create_invoice_item,
            get_all_invoice_items,
            get_invoice_item_by_id,
            update_invoice_item,
            delete_invoice_item,
            // Payments
            create_payment,
            get_all_payments,
            get_payment_by_id,
            update_payment,
            delete_payment,
            // Auth
            login,
            logout,
            check_auth,
            get_current_user_company_id,
            // First Time Setup
            check_initial_setup,
            update_default_user,
            update_default_company,
            // PDF
            save_and_open_pdf,
        ])
        .run(context)
        .expect("error while running tauri application");

    Ok(())
}
