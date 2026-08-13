use gtk4 as gtk;
use gtk::prelude::*;
use gtk::{Application, ApplicationWindow, Button, Entry, Label, ListBox, Orientation};
use serde::Deserialize;

#[derive(Deserialize)] struct Release { tag_name: String, assets: Vec<Asset> }
#[derive(Deserialize)] struct Asset { name: String, size: u64, browser_download_url: String }

fn main() {
    let app = Application::builder().application_id("dev.zhaoryder.releaseguard").build();
    app.connect_activate(|app| {
        let target = Entry::builder().text("zhaoryder/releaseguard").placeholder_text("owner/repo").hexpand(true).build();
        let check = Button::with_label("Check"); let status = Label::new(Some("Paste owner/repo and press Check.")); let score = Label::new(None); let assets = ListBox::new();
        let row = gtk::Box::new(Orientation::Horizontal, 8); row.append(&target); row.append(&check);
        let body = gtk::Box::new(Orientation::Vertical, 16); body.set_margin_top(28); body.set_margin_bottom(28); body.set_margin_start(28); body.set_margin_end(28); body.append(&Label::new(Some("ReleaseGuard"))); body.append(&Label::new(Some("Release quality, before your users find the bug."))); body.append(&row); body.append(&status); body.append(&score); body.append(&assets);
        let window = ApplicationWindow::builder().application(app).title("ReleaseGuard").default_width(720).default_height(520).child(&body).build();
        let target_clone = target.clone(); let status_clone = status.clone(); let score_clone = score.clone(); let assets_clone = assets.clone();
        check.connect_clicked(move |_| { let repo = target_clone.text().to_string(); if repo.split('/').count() != 2 { status_clone.set_text("Expected owner/repo."); return; } status_clone.set_text("Inspecting release…"); let result = reqwest::blocking::Client::new().get(format!("https://api.github.com/repos/{repo}/releases/latest")).header("User-Agent", "ReleaseGuardGtk/0.1").send().and_then(|response| response.error_for_status()).and_then(|response| response.json::<Release>()); match result { Ok(release) => { let value = 100_i32 - if release.assets.is_empty() { 40 } else { 0 }; score_clone.set_text(&format!("{} · {value}/100", release.tag_name)); for asset in release.assets { assets_clone.append(&Label::new(Some(&format!("{} · {} bytes · {}", asset.name, asset.size, asset.browser_download_url)))); } status_clone.set_text("Release loaded. Asset URLs are ready to open."); }, Err(_) => status_clone.set_text("Could not read this public release.") } });
        window.present();
    }); app.run();
}
