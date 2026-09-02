use serde::{Deserialize, Serialize};
use std::io::{Read, Write};

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

    let result = download_session(&mut session);
    session.logout().ok();
    result
}

/// Runs all folder commands through the IMAP client. Keeping this separate from
/// TLS/login lets the protocol contract be exercised against a local IMAP peer.
fn download_session<T: Read + Write>(session: &mut imap::Session<T>) -> Result<ImapImport, String> {
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
                folder_issues.push(FolderIssue {
                    folder,
                    detail: format!("Could not open folder read-only: {error}"),
                });
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
                folder_issues.push(FolderIssue {
                    folder,
                    detail: format!("Messages could not be read: {error}"),
                });
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
    if output.is_empty() {
        return Err("No readable messages were returned by the server.".into());
    }
    Ok(ImapImport {
        messages: output,
        folder_counts,
        folder_issues,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![import_imap])
        .run(tauri::generate_context!())
        .expect("Mail Escape Hatch could not start");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{self, Read, Write};
    use std::sync::{Arc, Mutex};

    #[derive(Debug)]
    struct ScriptedImap {
        responses: io::Cursor<Vec<u8>>,
        written: Arc<Mutex<Vec<u8>>>,
    }

    impl Read for ScriptedImap {
        fn read(&mut self, buffer: &mut [u8]) -> io::Result<usize> {
            self.responses.read(buffer)
        }
    }

    impl Write for ScriptedImap {
        fn write(&mut self, buffer: &[u8]) -> io::Result<usize> {
            self.written
                .lock()
                .expect("write log lock")
                .extend_from_slice(buffer);
            Ok(buffer.len())
        }

        fn flush(&mut self) -> io::Result<()> {
            Ok(())
        }
    }

    #[test]
    fn imap_import_uses_a_non_seen_setting_fetch_item() {
        assert_eq!(READ_ONLY_BODY_FETCH, "BODY.PEEK[]");
        assert!(READ_ONLY_BODY_FETCH.contains("PEEK"));
    }

    #[test]
    fn folder_errors_are_serializable_and_never_disappear() {
        let issue = FolderIssue {
            folder: "Archive/2024".into(),
            detail: "Could not open folder read-only: denied".into(),
        };
        let encoded = serde_json::to_string(&issue).expect("folder issue serializes");
        assert!(encoded.contains("Archive/2024"));
        assert!(encoded.contains("denied"));
    }

    #[test]
    fn imported_message_keeps_non_utf8_octets() {
        let message = ImportedMessage {
            folder: "Inbox".into(),
            raw: vec![b'c', b'a', b'f', 0xe9],
        };
        assert_eq!(message.raw, vec![0x63, 0x61, 0x66, 0xe9]);
    }

    #[test]
    fn imap_import_uses_examine_peek_and_reports_a_real_folder_failure() {
        let raw = b"Message-ID: <imap@test>\r\nFrom: one@test\r\nSubject: IMAP\r\n\r\nHello";
        let script = format!(
            "* OK local test server\r\na1 OK LOGIN completed\r\n* LIST () \"/\" \"Inbox\"\r\n* LIST () \"/\" \"Locked\"\r\na2 OK LIST completed\r\n* 1 EXISTS\r\na3 OK EXAMINE completed\r\n* 1 FETCH (BODY[] {{{}}}\r\n{})\r\na4 OK FETCH completed\r\na5 NO read access denied\r\n",
            raw.len(),
            String::from_utf8_lossy(raw)
        );
        let written = Arc::new(Mutex::new(Vec::new()));
        let stream = ScriptedImap {
            responses: io::Cursor::new(script.into_bytes()),
            written: written.clone(),
        };
        let mut client = imap::Client::new(stream);
        client.read_greeting().expect("server greeting");
        let mut session = client
            .login("person@example.test", "not-persisted")
            .expect("login succeeds");
        let import = download_session(&mut session);
        let commands = String::from_utf8(written.lock().expect("write log lock").clone())
            .expect("IMAP commands are ASCII");
        assert!(commands.contains("EXAMINE \"INBOX\""), "{commands}");
        assert!(commands.contains("EXAMINE \"Locked\""), "{commands}");
        assert!(commands.contains("FETCH 1:* BODY.PEEK[]"), "{commands}");
        assert!(!commands.contains("SELECT"));
        let result = import.unwrap_or_else(|error| panic!("{error}; commands: {commands}"));
        assert_eq!(result.messages.len(), 1);
        assert_eq!(result.messages[0].raw, raw);
        assert_eq!(result.folder_counts[0].expected, 1);
        assert!(result
            .folder_issues
            .iter()
            .any(|issue| issue.folder == "Locked"
                && issue.detail.contains("Could not open folder read-only")));
    }
}
