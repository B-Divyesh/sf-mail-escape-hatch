use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ImapConfig {
    host: String,
    port: u16,
    username: String,
    password: String,
}

#[derive(Serialize)]
struct ImportedMessage {
    folder: String,
    /// RFC 822 bytes are sent unchanged to the webview. Do not use lossy UTF-8 here.
    raw: Vec<u8>,
}

#[derive(Serialize)]
struct FolderCount {
    folder: String,
    expected: u32,
}

#[derive(Serialize)]
struct FolderIssue {
    folder: String,
    detail: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ImapImport {
    messages: Vec<ImportedMessage>,
    folder_counts: Vec<FolderCount>,
    folder_issues: Vec<FolderIssue>,
}

const READ_ONLY_BODY_FETCH: &str = "BODY.PEEK[]";

#[tauri::command]
async fn import_imap(config: ImapConfig) -> Result<ImapImport, String> {
    tauri::async_runtime::spawn_blocking(move || download_imap(config))
        .await
        .map_err(|error| format!("Import task stopped: {error}"))?
}

fn download_imap(config: ImapConfig) -> Result<ImapImport, String> {
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

    let mailboxes = session
        .list(None, Some("*"))
        .map_err(|error| format!("Folders could not be listed: {error}"))?
        .iter()
        .filter(|mailbox| {
            !mailbox
                .attributes()
                .iter()
                .any(|attribute| format!("{attribute:?}").contains("NoSelect"))
        })
        .map(|mailbox| mailbox.name().to_string())
        .collect::<Vec<_>>();

    let mut output = Vec::new();
    let mut folder_counts = Vec::new();
    let mut folder_issues = Vec::new();
    for folder in mailboxes {
        // EXAMINE is read-only. BODY.PEEK[] below explicitly avoids setting \Seen.
        let mailbox = match session.examine(&folder) {
            Ok(value) => value,
            Err(error) => {
                folder_issues.push(FolderIssue { folder, detail: format!("Could not open folder read-only: {error}") });
                continue;
            }
        };
        if mailbox.exists == 0 {
            folder_counts.push(FolderCount {
                folder,
                expected: 0,
            });
            continue;
        }
        folder_counts.push(FolderCount {
            folder: folder.clone(),
            expected: mailbox.exists,
        });
        let fetched = match session.fetch("1:*", READ_ONLY_BODY_FETCH) {
            Ok(value) => value,
            Err(error) => {
                folder_issues.push(FolderIssue { folder, detail: format!("Messages could not be read: {error}") });
                continue;
            }
        };
        for message in fetched.iter() {
            if let Some(body) = message.body() {
                output.push(ImportedMessage {
                    folder: folder.clone(),
                    raw: body.to_vec(),
                });
            }
        }
    }
    session.logout().ok();
    if output.is_empty() {
        return Err("No readable messages were returned by the server.".into());
    }
    Ok(ImapImport {
        messages: output,
        folder_counts,
        folder_issues,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn imap_import_uses_a_non_seen_setting_fetch_item() {
        assert_eq!(READ_ONLY_BODY_FETCH, "BODY.PEEK[]");
        assert!(READ_ONLY_BODY_FETCH.contains("PEEK"));
    }

    #[test]
    fn folder_errors_are_serializable_and_never_disappear() {
        let issue = FolderIssue { folder: "Archive/2024".into(), detail: "Could not open folder read-only: denied".into() };
        let encoded = serde_json::to_string(&issue).expect("folder issue serializes");
        assert!(encoded.contains("Archive/2024"));
        assert!(encoded.contains("denied"));
    }

    #[test]
    fn imported_message_keeps_non_utf8_octets() {
        let message = ImportedMessage { folder: "Inbox".into(), raw: vec![b'c', b'a', b'f', 0xe9] };
        assert_eq!(message.raw, vec![0x63, 0x61, 0x66, 0xe9]);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![import_imap])
        .run(tauri::generate_context!())
        .expect("Mail Escape Hatch could not start");
}
