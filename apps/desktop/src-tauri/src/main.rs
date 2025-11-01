#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rusqlite::types::{Value as SqlValue, ValueRef};
use rusqlite::{params_from_iter, Connection};
use serde_json::{Map, Value as JsonValue};
use std::{
    fs,
    path::{Path, PathBuf},
};

mod whisper;
use whisper::{whisper_init, whisper_transcribe_wav16_mono};

fn resolve_sqlite_path(app: &tauri::AppHandle, uri: &str) -> Result<PathBuf, String> {
    if let Some(rest) = uri.strip_prefix("sqlite:") {
        let mut base = app
            .path_resolver()
            .app_data_dir()
            .ok_or_else(|| "failed to resolve application data directory".to_string())?;
        if !base.exists() {
            fs::create_dir_all(&base).map_err(|err| err.to_string())?;
        }
        let mut path = base;
        path.push(rest);
        Ok(path)
    } else {
        Ok(PathBuf::from(uri))
    }
}

fn ensure_parent_dir(path: &Path) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|err| err.to_string())?;
        }
    }
    Ok(())
}

fn open_connection(path: &str) -> Result<Connection, String> {
    Connection::open(path).map_err(|err| err.to_string())
}

fn json_to_sql_value(value: JsonValue) -> Result<SqlValue, String> {
    match value {
        JsonValue::Null => Ok(SqlValue::Null),
        JsonValue::Bool(flag) => Ok(SqlValue::Integer(if flag { 1 } else { 0 })),
        JsonValue::Number(number) => {
            if let Some(int) = number.as_i64() {
                Ok(SqlValue::Integer(int))
            } else if let Some(unsigned) = number.as_u64() {
                if unsigned <= i64::MAX as u64 {
                    Ok(SqlValue::Integer(unsigned as i64))
                } else {
                    Err("numeric value exceeds supported range".to_string())
                }
            } else if let Some(float) = number.as_f64() {
                Ok(SqlValue::Real(float))
            } else {
                Err("invalid numeric value".to_string())
            }
        }
        JsonValue::String(text) => Ok(SqlValue::Text(text)),
        JsonValue::Array(items) => {
            if items
                .iter()
                .all(|item| item.is_u64() || item.is_i64() || item.is_number())
            {
                let mut blob = Vec::with_capacity(items.len());
                for item in items {
                    let byte = if let Some(value) = item.as_u64() {
                        if value <= u8::MAX as u64 {
                            value as u8
                        } else {
                            return Err("array value is not a valid byte".to_string());
                        }
                    } else if let Some(value) = item.as_i64() {
                        if (0..=u8::MAX as i64).contains(&value) {
                            value as u8
                        } else {
                            return Err("array value is not a valid byte".to_string());
                        }
                    } else if let Some(value) = item.as_f64() {
                        if value.fract() == 0.0 && value >= 0.0 && value <= u8::MAX as f64 {
                            value as u8
                        } else {
                            return Err("array value is not a valid byte".to_string());
                        }
                    } else {
                        return Err("unsupported array value".to_string());
                    };
                    blob.push(byte);
                }
                Ok(SqlValue::Blob(blob))
            } else {
                Ok(SqlValue::Text(JsonValue::Array(items).to_string()))
            }
        }
        JsonValue::Object(map) => Ok(SqlValue::Text(JsonValue::Object(map).to_string())),
    }
}

fn sql_value_ref_to_json(value: ValueRef<'_>) -> JsonValue {
    match value {
        ValueRef::Null => JsonValue::Null,
        ValueRef::Integer(int) => JsonValue::from(int),
        ValueRef::Real(float) => JsonValue::from(float),
        ValueRef::Text(text) => JsonValue::String(String::from_utf8_lossy(text).into_owned()),
        ValueRef::Blob(bytes) => {
            JsonValue::Array(bytes.iter().map(|byte| JsonValue::from(*byte)).collect())
        }
    }
}

fn prepare_params(values: Vec<JsonValue>) -> Result<Vec<SqlValue>, String> {
    values.into_iter().map(json_to_sql_value).collect()
}

#[tauri::command]
fn sql_load(app: tauri::AppHandle, path: String) -> Result<String, String> {
    let resolved = resolve_sqlite_path(&app, &path)?;
    ensure_parent_dir(&resolved)?;
    open_connection(resolved.to_string_lossy().as_ref())?;
    Ok(resolved.to_string_lossy().into_owned())
}

#[tauri::command]
fn sql_select(db: String, query: String, values: Vec<JsonValue>) -> Result<Vec<JsonValue>, String> {
    let connection = open_connection(&db)?;
    let params = prepare_params(values)?;
    let mut statement = connection.prepare(&query).map_err(|err| err.to_string())?;
    let column_names: Vec<String> = statement
        .column_names()
        .iter()
        .map(|name| name.to_string())
        .collect();
    let mut rows = statement
        .query(params_from_iter(params.iter()))
        .map_err(|err| err.to_string())?;
    let mut results = Vec::new();

    while let Some(row) = rows.next().map_err(|err| err.to_string())? {
        let mut object = Map::new();
        for (index, name) in column_names.iter().enumerate() {
            let value = row.get_ref(index).map_err(|err| err.to_string())?;
            object.insert(name.clone(), sql_value_ref_to_json(value));
        }
        results.push(JsonValue::Object(object));
    }

    Ok(results)
}

#[tauri::command]
fn sql_execute(db: String, query: String, values: Vec<JsonValue>) -> Result<(), String> {
    let connection = open_connection(&db)?;
    let params = prepare_params(values)?;
    connection
        .execute(&query, params_from_iter(params.iter()))
        .map_err(|err| err.to_string())?;
    Ok(())
}

#[tauri::command]
fn sql_close(_db: String) -> Result<(), String> {
    // Connections are created per request; nothing to do on close.
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            sql_load,
            sql_select,
            sql_execute,
            sql_close,
            whisper_init,
            whisper_transcribe_wav16_mono
        ])
        .run(tauri::generate_context!())
        .expect("error while running InnerVoice desktop app");
}
