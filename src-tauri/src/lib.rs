use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ImapConfig {
    host: String,
    port: u16,
    username: String,
    password: String,
    remember: bool,
}

#[derive(Serialize)]
struct ImportedMessage {
    folder: String,
    raw: String,
}

#[tauri::command]
async fn import_imap(config: ImapConfig) -> Result<Vec<ImportedMessage>, String> {
    tauri::async_runtime::spawn_blocking(move || download_imap(config))
        .await
        .map_err(|error| format!("Import task stopped: {error}"))?
}

fn download_imap(config: ImapConfig) -> Result<Vec<ImportedMessage>, String> {
    if config.host.trim().is_empty() || config.username.trim().is_empty() {
        return Err("Server and email are required.".into());
    }
    let tls = native_tls::TlsConnector::builder()
        .build()
        .map_err(|error| format!("TLS could not start: {error}"))?;
    let client = imap::connect((config.host.as_str(), config.port), &config.host, &tls)
        .map_err(|error| format!("The server connection failed: {error}"))?;
    let mut session = client
        .login(&config.username, &config.password)
        .map_err(|(error, _)| format!("The server rejected the login: {error}"))?;

    if config.remember {
        let entry = keyring::Entry::new("in.sociobot.mail-escape-hatch", &config.username)
            .map_err(|error| format!("The OS keychain is unavailable: {error}"))?;
        entry
            .set_password(&config.password)
            .map_err(|error| format!("The password was not saved to the OS keychain: {error}"))?;
    }

    let mailboxes = session
        .list(None, Some("*"))
        .map_err(|error| format!("Folders could not be listed: {error}"))?
        .iter()
        .filter(|mailbox| !mailbox.attributes().iter().any(|attribute| format!("{attribute:?}").contains("NoSelect")))
        .map(|mailbox| mailbox.name().to_string())
        .collect::<Vec<_>>();

    let mut output = Vec::new();
    for folder in mailboxes {
        let mailbox = match session.select(&folder) {
            Ok(value) => value,
            Err(_) => continue,
        };
        if mailbox.exists == 0 {
            continue;
        }
        let fetched = session
            .fetch("1:*", "RFC822")
            .map_err(|error| format!("Messages in {folder} could not be read: {error}"))?;
        for message in fetched.iter() {
            if let Some(body) = message.body() {
                output.push(ImportedMessage {
                    folder: folder.clone(),
                    raw: String::from_utf8_lossy(body).into_owned(),
                });
            }
        }
    }
    session.logout().ok();
    if output.is_empty() {
        return Err("No readable messages were returned by the server.".into());
    }
    Ok(output)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![import_imap])
        .run(tauri::generate_context!())
        .expect("Mail Escape Hatch could not start");
}
